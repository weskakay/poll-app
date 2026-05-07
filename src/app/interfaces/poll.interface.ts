/** Topic category a poll belongs to. */
export type PollCategory =
  | 'Team Activities'
  | 'Health & Wellness'
  | 'Gaming & Entertainment'
  | 'Education & Learning'
  | 'Lifestyle & Preferences'
  | 'Technology & Innovation';

export const POLL_CATEGORIES: readonly PollCategory[] = [
  'Team Activities',
  'Health & Wellness',
  'Gaming & Entertainment',
  'Education & Learning',
  'Lifestyle & Preferences',
  'Technology & Innovation',
];

/** Publication state of a poll. */
export type PollStatus = 'draft' | 'published';

/** Single answer within a question. */
export interface PollAnswer {
  id: string;
  label: string;
  votes: number;
}

/** A question inside a poll, holding ordered answers. */
export interface PollQuestion {
  id: string;
  text: string;
  allowMultiple: boolean;
  answers: PollAnswer[];
}

/** Poll record with its full nested questions and answers. */
export interface Poll {
  id: string;
  createdAt: string;
  title: string;
  description: string | null;
  category: PollCategory | null;
  expiresAt: string | null;
  status: PollStatus;
  questions: PollQuestion[];
}
