-- Phase 3 schema: split single-question polls into polls + questions + answers.
-- Run this file in the Supabase SQL Editor as one block.
-- Drops the old single-question polls table; rebuild from scratch.

drop table if exists public.polls cascade;

create table public.polls (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title text not null,
  description text,
  category text,
  expires_at timestamptz,
  status text not null default 'published'
);

create table public.poll_questions (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  position integer not null,
  text text not null,
  allow_multiple boolean not null default false
);

create table public.poll_answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.poll_questions(id) on delete cascade,
  position integer not null,
  label text not null,
  votes integer not null default 0
);

create index poll_questions_poll_id_idx on public.poll_questions(poll_id);
create index poll_answers_question_id_idx on public.poll_answers(question_id);

-- RLS: public access since the app does not use auth.
alter table public.polls enable row level security;
alter table public.poll_questions enable row level security;
alter table public.poll_answers enable row level security;

create policy "polls_select_public" on public.polls for select using (true);
create policy "polls_insert_public" on public.polls for insert with check (true);
create policy "polls_update_public" on public.polls for update using (true) with check (true);
create policy "polls_delete_public" on public.polls for delete using (true);

create policy "poll_questions_select_public" on public.poll_questions for select using (true);
create policy "poll_questions_insert_public" on public.poll_questions for insert with check (true);
create policy "poll_questions_update_public" on public.poll_questions for update using (true) with check (true);
create policy "poll_questions_delete_public" on public.poll_questions for delete using (true);

create policy "poll_answers_select_public" on public.poll_answers for select using (true);
create policy "poll_answers_insert_public" on public.poll_answers for insert with check (true);
create policy "poll_answers_update_public" on public.poll_answers for update using (true) with check (true);
create policy "poll_answers_delete_public" on public.poll_answers for delete using (true);

-- Realtime feed for the home and detail views.
alter publication supabase_realtime add table public.polls;
alter publication supabase_realtime add table public.poll_questions;
alter publication supabase_realtime add table public.poll_answers;
