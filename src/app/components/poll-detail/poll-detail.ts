import { Component, computed, effect, HostListener, inject, OnInit, signal } from '@angular/core';
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
export class PollDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly pollService = inject(PollService);

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

  protected readonly canSubmit = computed(() => {
    const poll = this.poll();
    if (!poll) return false;
    const selections = this.selectedAnswers();
    return poll.questions.every((q) => (selections[q.id] ?? []).length > 0);
  });

  protected readonly createdLabel = computed(() => formatDate(this.poll()?.createdAt));

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
    const idParam = this.route.snapshot.paramMap.get('id') ?? '';
    this.id.set(idParam);
    this.hasVoted.set(localStorage.getItem(VOTED_KEY_PREFIX + idParam) !== null);

    this.pollService.subscribe();
    await this.pollService.ensureLoaded();
    this.initialLoadDone.set(true);
  }

  protected toggleAnswer(questionId: string, answerId: string, allowMultiple: boolean): void {
    if (this.hasVoted()) return;

    const current = this.selectedAnswers();
    const list = current[questionId] ?? [];
    const next = allowMultiple
      ? list.includes(answerId)
        ? list.filter((id) => id !== answerId)
        : [...list, answerId]
      : [answerId];

    this.selectedAnswers.set({ ...current, [questionId]: next });
  }

  protected isSelected(questionId: string, answerId: string): boolean {
    return (this.selectedAnswers()[questionId] ?? []).includes(answerId);
  }

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

  protected requestDelete(): void {
    this.showDeleteConfirm.set(true);
  }

  protected cancelDelete(): void {
    this.showDeleteConfirm.set(false);
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.showDeleteConfirm()) {
      this.cancelDelete();
    }
  }

  protected async confirmDelete(): Promise<void> {
    this.showDeleteConfirm.set(false);

    const success = await this.pollService.delete(this.id());
    if (success) {
      localStorage.removeItem(VOTED_KEY_PREFIX + this.id());
      this.router.navigate(['/']);
    }
  }

  protected letterFor(index: number): string {
    return String.fromCharCode('A'.charCodeAt(0) + index);
  }
}

function formatDate(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}.${month}.${d.getFullYear()}`;
}
