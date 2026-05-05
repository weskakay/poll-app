import { Component, computed, input } from '@angular/core';
import type { Poll } from '../../interfaces/poll.interface';

interface OptionResult {
  letter: string;
  label: string;
  votes: number;
  percent: number;
}

/** Renders horizontal bars and percentages for the current vote distribution. */
@Component({
  selector: 'app-poll-results',
  templateUrl: './poll-results.html',
  styleUrl: './poll-results.scss',
})
export class PollResults {
  readonly poll = input.required<Poll>();

  protected readonly results = computed<OptionResult[]>(() => {
    const options = this.poll().options;
    const total = options.reduce((sum, option) => sum + option.votes, 0);

    return options.map((option, index) => ({
      letter: String.fromCharCode('A'.charCodeAt(0) + index),
      label: option.label,
      votes: option.votes,
      percent: total === 0 ? 0 : Math.round((option.votes / total) * 100),
    }));
  });
}
