import { Component, input } from '@angular/core';
import type { Poll } from '../../interfaces/poll.interface';

/** Visual card showing a single poll's question and option count. */
@Component({
  selector: 'app-poll-card',
  templateUrl: './poll-card.html',
  styleUrl: './poll-card.scss',
})
export class PollCard {
  readonly poll = input.required<Poll>();
}
