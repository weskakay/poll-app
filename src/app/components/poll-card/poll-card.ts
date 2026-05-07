import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Poll } from '../../interfaces/poll.interface';

/** Visual style of the card; highlight is used in the ending-soon row, list everywhere else. */
export type PollCardVariant = 'highlight' | 'list';

/** Visual card showing a single poll's question and metadata. */
@Component({
  selector: 'app-poll-card',
  imports: [RouterLink],
  templateUrl: './poll-card.html',
  styleUrl: './poll-card.scss',
})
export class PollCard {
  readonly poll = input.required<Poll>();
  readonly variant = input<PollCardVariant>('list');

  protected readonly endsInLabel = computed<string | null>(() => {
    const expiresAt = this.poll().expiresAt;
    if (!expiresAt) return null;

    const days = daysUntil(expiresAt);
    if (days < 0) return 'Ended';
    if (days === 0) return 'Ends today';
    if (days === 1) return 'Ends in 1 day';
    return `Ends in ${days} days`;
  });
}

function daysUntil(isoDate: string): number {
  const target = new Date(isoDate);
  const now = new Date();
  const ms = target.getTime() - now.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}
