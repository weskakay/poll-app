import { inject, Injectable, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import type { Poll } from '../interfaces/poll.interface';

interface PollRow {
  id: string;
  created_at: string;
  question: string;
  options: Poll['options'];
}

/** Reads and exposes polls from supabase as a signal-based store. */
@Injectable({ providedIn: 'root' })
export class PollService {
  private readonly supabase = inject(SupabaseService);

  readonly polls = signal<Poll[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  /** Fetches all polls ordered by newest first and writes them into the store. */
  async loadAll(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    const { data, error } = await this.supabase.client
      .from('polls')
      .select('*')
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

  /** Inserts a new poll and refreshes the store on success. */
  async create(question: string, optionLabels: string[]): Promise<boolean> {
    this.error.set(null);

    const options = optionLabels.map((label) => ({ label, votes: 0 }));
    const { error } = await this.supabase.client
      .from('polls')
      .insert({ question, options });

    if (error) {
      this.error.set(error.message);
      return false;
    }

    await this.loadAll();
    return true;
  }
}

function toPoll(row: PollRow): Poll {
  return {
    id: row.id,
    createdAt: row.created_at,
    question: row.question,
    options: row.options,
  };
}
