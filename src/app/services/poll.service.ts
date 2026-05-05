import { inject, Injectable, OnDestroy, signal } from '@angular/core';
import type { RealtimeChannel } from '@supabase/supabase-js';
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
export class PollService implements OnDestroy {
  private readonly supabase = inject(SupabaseService);
  private channel: RealtimeChannel | null = null;

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

  /** Opens a realtime channel that mirrors INSERT/UPDATE/DELETE into the store. */
  subscribe(): void {
    if (this.channel) {
      return;
    }

    this.channel = this.supabase.client
      .channel('polls-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'polls' },
        (payload) => this.onInsert(payload.new as PollRow),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'polls' },
        (payload) => this.onUpdate(payload.new as PollRow),
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'polls' },
        (payload) => this.onDelete((payload.old as { id: string }).id),
      )
      .subscribe();
  }

  ngOnDestroy(): void {
    if (this.channel) {
      this.supabase.client.removeChannel(this.channel);
      this.channel = null;
    }
  }

  private onInsert(row: PollRow): void {
    this.polls.update((current) =>
      current.some((p) => p.id === row.id) ? current : [toPoll(row), ...current],
    );
  }

  private onUpdate(row: PollRow): void {
    this.polls.update((current) =>
      current.map((p) => (p.id === row.id ? toPoll(row) : p)),
    );
  }

  private onDelete(id: string): void {
    this.polls.update((current) => current.filter((p) => p.id !== id));
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
