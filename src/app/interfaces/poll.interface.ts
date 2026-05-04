/** Single answer option within a poll. */
export interface PollOption {
  label: string;
  votes: number;
}

/** Poll record stored in supabase. */
export interface Poll {
  id: string;
  createdAt: string;
  question: string;
  options: PollOption[];
}
