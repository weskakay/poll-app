import { Component, computed, input } from '@angular/core';
import type { PollQuestion } from '../../interfaces/poll.interface';

interface AnswerResult {
  letter: string;
  label: string;
  votes: number;
  percent: number;
}

/** Renders horizontal bars and percentages for the answers of one question. */
@Component({
  selector: 'app-poll-results',
  templateUrl: './poll-results.html',
  styleUrl: './poll-results.scss',
})
export class PollResults {
  readonly question = input.required<PollQuestion>();

  protected readonly results = computed<AnswerResult[]>(() => {
    const answers = this.question().answers;
    const total = answers.reduce((sum, answer) => sum + answer.votes, 0);

    return answers.map((answer, index) => ({
      letter: String.fromCharCode('A'.charCodeAt(0) + index),
      label: answer.label,
      votes: answer.votes,
      percent: total === 0 ? 0 : Math.round((answer.votes / total) * 100),
    }));
  });
}
