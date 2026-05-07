import { inject, Injectable, OnDestroy, signal } from '@angular/core';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';
import type {
  Poll,
  PollAnswer,
  PollCategory,
  PollQuestion,
  PollStatus,
} from '../interfaces/poll.interface';

interface PollRow {
  id: string;
  created_at: string;
  title: string;
  description: string | null;
  category: PollCategory | null;
  expires_at: string | null;
  status: PollStatus;
  poll_questions: PollQuestionRow[];
}

interface PollQuestionRow {
  id: string;
  position: number;
  text: string;
  allow_multiple: boolean;
  poll_answers: PollAnswerRow[];
}

interface PollAnswerRow {
  id: string;
  position: number;
  label: string;
  votes: number;
}

/** Shape for a question to be created together with its answers. */
export interface CreatePollQuestionInput {
  text: string;
  allowMultiple: boolean;
  answerLabels: string[];
}

/** Shape for inserting a new poll with all its questions and answers. */
export interface CreatePollInput {
  title: string;
  description: string | null;
  category: PollCategory;
  expiresAt: string | null;
  status: PollStatus;
  questions: CreatePollQuestionInput[];
}

const POLL_SELECT =
  '*, poll_questions(id, position, text, allow_multiple, poll_answers(id, position, label, votes))';

/** Reads and exposes polls from supabase as a signal-based store. */
@Injectable({ providedIn: 'root' })
export class PollService implements OnDestroy {
  private readonly supabase = inject(SupabaseService);
  private channel: RealtimeChannel | null = null;

  readonly polls = signal<Poll[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  /** Fetches all polls with their nested questions and answers. */
  async loadAll(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    const { data, error } = await this.supabase.client
      .from('polls')
      .select(POLL_SELECT)
      .order('created_at', { ascending: false })
      .returns<PollRow[]>();

    if (error) {
      this.error.set(error.message);
      this.polls.set([]);
    } else {
      this.polls.set(data.map(toPoll));
    }

    this.loading.set(false);
  }

  /** Inserts a poll, its questions and answers in a three-step write. */
  async create(input: CreatePollInput): Promise<boolean> {
    this.error.set(null);

    const { data: poll, error: pollError } = await this.supabase.client
      .from('polls')
      .insert({
        title: input.title,
        description: input.description,
        category: input.category,
        expires_at: input.expiresAt,
        status: input.status,
      })
      .select('id')
      .single();

    if (pollError || !poll) {
      this.error.set(pollError?.message ?? 'Could not create poll');
      return false;
    }

    for (const [qIndex, question] of input.questions.entries()) {
      const { data: questionRow, error: qError } = await this.supabase.client
        .from('poll_questions')
        .insert({
          poll_id: poll.id,
          position: qIndex + 1,
          text: question.text,
          allow_multiple: question.allowMultiple,
        })
        .select('id')
        .single();

      if (qError || !questionRow) {
        await this.delete(poll.id);
        this.error.set(qError?.message ?? 'Could not create question');
        return false;
      }

      const answerRows = question.answerLabels.map((label, aIndex) => ({
        question_id: questionRow.id,
        position: aIndex + 1,
        label,
      }));
      const { error: aError } = await this.supabase.client
        .from('poll_answers')
        .insert(answerRows);

      if (aError) {
        await this.delete(poll.id);
        this.error.set(aError.message);
        return false;
      }
    }

    await this.loadAll();
    return true;
  }

  /** Increments the vote count of each answer in the given list. */
  async vote(answerIds: string[]): Promise<boolean> {
    this.error.set(null);

    for (const answerId of answerIds) {
      const current = findAnswer(this.polls(), answerId);
      if (!current) continue;

      const { error } = await this.supabase.client
        .from('poll_answers')
        .update({ votes: current.votes + 1 })
        .eq('id', answerId);

      if (error) {
        this.error.set(error.message);
        return false;
      }
    }

    await this.loadAll();
    return true;
  }

  /** Deletes a poll. Cascade removes its questions and answers. */
  async delete(pollId: string): Promise<boolean> {
    this.error.set(null);

    const { error } = await this.supabase.client
      .from('polls')
      .delete()
      .eq('id', pollId);

    if (error) {
      this.error.set(error.message);
      return false;
    }

    return true;
  }

  /** Loads all polls only if the store is empty. */
  async ensureLoaded(): Promise<void> {
    if (this.polls().length === 0) {
      await this.loadAll();
    }
  }

  /** Opens a realtime channel that triggers a reload on any relevant change. */
  subscribe(): void {
    if (this.channel) {
      return;
    }

    const reload = (): void => {
      this.loadAll();
    };

    this.channel = this.supabase.client
      .channel('polls-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'polls' }, reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'poll_questions' }, reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'poll_answers' }, reload)
      .subscribe();
  }

  ngOnDestroy(): void {
    if (this.channel) {
      this.supabase.client.removeChannel(this.channel);
      this.channel = null;
    }
  }
}

function toPoll(row: PollRow): Poll {
  const questions = (row.poll_questions ?? [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map(toQuestion);

  return {
    id: row.id,
    createdAt: row.created_at,
    title: row.title,
    description: row.description,
    category: row.category,
    expiresAt: row.expires_at,
    status: row.status,
    questions,
  };
}

function toQuestion(row: PollQuestionRow): PollQuestion {
  const answers = (row.poll_answers ?? [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map(toAnswer);

  return {
    id: row.id,
    text: row.text,
    allowMultiple: row.allow_multiple,
    answers,
  };
}

function toAnswer(row: PollAnswerRow): PollAnswer {
  return {
    id: row.id,
    label: row.label,
    votes: row.votes,
  };
}

function findAnswer(polls: Poll[], answerId: string): PollAnswer | undefined {
  for (const poll of polls) {
    for (const question of poll.questions) {
      const found = question.answers.find((a) => a.id === answerId);
      if (found) return found;
    }
  }
  return undefined;
}
