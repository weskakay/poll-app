import { Component, computed, effect, HostListener, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PollService } from '../../services/poll.service';
import { PollResults } from '../poll-results/poll-results';

const VOTED_KEY_PREFIX = 'voted-';

/** Single poll detail view with vote, live results and delete. */
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
  protected readonly selectedOption = signal<number | null>(null);
  protected readonly submitting = signal(false);
  protected readonly showDeleteConfirm = signal(false);
  protected readonly error = this.pollService.error;

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

  protected select(index: number): void {
    if (this.hasVoted()) return;
    this.selectedOption.set(index);
  }

  protected async submitVote(): Promise<void> {
    const index = this.selectedOption();
    if (index === null || this.hasVoted()) return;

    this.submitting.set(true);
    const success = await this.pollService.vote(this.id(), index);
    this.submitting.set(false);

    if (success) {
      localStorage.setItem(VOTED_KEY_PREFIX + this.id(), String(index));
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
