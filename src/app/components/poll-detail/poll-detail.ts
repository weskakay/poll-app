import { DOCUMENT } from '@angular/common';
import { Component, computed, effect, HostListener, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PollService } from '../../services/poll.service';
import { PollResults } from '../poll-results/poll-results';

const VOTED_KEY_PREFIX = 'voted-';

/** Single poll detail view with multi-question vote, live results and delete. */
@Component({
  selector: 'app-poll-detail',
  imports: [RouterLink, PollResults],
  templateUrl: './poll-detail.html',
  styleUrl: './poll-detail.scss',
})
export class PollDetail implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly pollService = inject(PollService);
  private readonly document = inject(DOCUMENT);

  protected readonly id = signal('');
  protected readonly poll = computed(() =>
    this.pollService.polls().find((p) => p.id === this.id()),
  );
  protected readonly initialLoadDone = signal(false);
  protected readonly hasVoted = signal(false);
  protected readonly selectedAnswers = signal<Record<string, string[]>>({});
  protected readonly submitting = signal(false);
  protected readonly showDeleteConfirm = signal(false);
  protected readonly error = this.pollService.error;

  /** True when every question has at least one selected answer. */
  protected readonly canSubmit = computed(() => {
    const poll = this.poll();
    if (!poll) return false;
    const selections = this.selectedAnswers();
    return poll.questions.every((q) => (selections[q.id] ?? []).length > 0);
  });

  /** Formatted creation date of the current poll, empty string while loading. */
  protected readonly createdLabel = computed(() => formatDate(this.poll()?.createdAt));

  /** Total number of votes across all questions and answers of the current poll. */
  protected readonly totalVotes = computed(() => {
    const poll = this.poll();
    if (!poll) return 0;
    return poll.questions.reduce(
      (sum, q) => sum + q.answers.reduce((s, a) => s + a.votes, 0),
      0,
    );
  });

  constructor() {
    effect(() => {
      if (this.initialLoadDone() && !this.poll()) {
        this.router.navigate(['/']);
      }
    });
  }

  async ngOnInit(): Promise<void> {
    this.document.body.classList.add('theme-light');

    const idParam = this.route.snapshot.paramMap.get('id') ?? '';
    this.id.set(idParam);
    this.hasVoted.set(localStorage.getItem(VOTED_KEY_PREFIX + idParam) !== null);

    this.pollService.subscribe();
    await this.pollService.ensureLoaded();
    this.initialLoadDone.set(true);
  }

  ngOnDestroy(): void {
    this.document.body.classList.remove('theme-light');
  }

  /** Toggles an answer in the current selection, respecting single vs multiple mode. */
  protected toggleAnswer(questionId: string, answerId: string, allowMultiple: boolean): void {
    if (this.hasVoted()) return;

    const current = this.selectedAnswers();
    const list = current[questionId] ?? [];
    const next = computeNextSelection(list, answerId, allowMultiple);

    this.selectedAnswers.set({ ...current, [questionId]: next });
  }

  /** Returns true when the answer is part of the current selection. */
  protected isSelected(questionId: string, answerId: string): boolean {
    return (this.selectedAnswers()[questionId] ?? []).includes(answerId);
  }

  /** Submits the vote, locks the form on success and stores the local voted flag. */
  protected async submitVote(): Promise<void> {
    if (!this.canSubmit() || this.hasVoted()) return;

    this.submitting.set(true);
    const allAnswerIds = Object.values(this.selectedAnswers()).flat();
    const success = await this.pollService.vote(allAnswerIds);
    this.submitting.set(false);

    if (success) {
      localStorage.setItem(VOTED_KEY_PREFIX + this.id(), JSON.stringify(allAnswerIds));
      this.hasVoted.set(true);
    }
  }

  /** Opens the delete confirmation dialog. */
  protected requestDelete(): void {
    this.showDeleteConfirm.set(true);
  }

  /** Closes the delete confirmation dialog without deleting. */
  protected cancelDelete(): void {
    this.showDeleteConfirm.set(false);
  }

  /** Closes the delete dialog when the user presses escape. */
  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.showDeleteConfirm()) {
      this.cancelDelete();
    }
  }

  /** Deletes the poll, clears the voted flag and navigates back to home. */
  protected async confirmDelete(): Promise<void> {
    this.showDeleteConfirm.set(false);

    const success = await this.pollService.delete(this.id());
    if (success) {
      localStorage.removeItem(VOTED_KEY_PREFIX + this.id());
      this.router.navigate(['/']);
    }
  }

  /** Maps a zero-based index to its answer letter (A, B, C, ...). */
  protected letterFor(index: number): string {
    return String.fromCharCode('A'.charCodeAt(0) + index);
  }
}

function computeNextSelection(
  current: string[],
  answerId: string,
  allowMultiple: boolean,
): string[] {
  if (!allowMultiple) {
    return [answerId];
  }
  if (current.includes(answerId)) {
    return current.filter((id) => id !== answerId);
  }
  return [...current, answerId];
}

function formatDate(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}.${month}.${d.getFullYear()}`;
}
