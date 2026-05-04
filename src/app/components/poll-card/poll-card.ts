import { Component, input } from '@angular/core';
import type { Poll } from '../../interfaces/poll.interface';

@Component({
  selector: 'app-poll-card',
  templateUrl: './poll-card.html',
  styleUrl: './poll-card.scss',
})
export class PollCard {
  readonly poll = input.required<Poll>();
}
