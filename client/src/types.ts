// Shared TypeScript types. They mirror what the API returns, so the compiler
// catches mistakes like misspelled fields at build time.

export const STATUSES = ["wishlist", "applied", "interview", "offer", "rejected"] as const;
export type Status = (typeof STATUSES)[number];

export interface User {
  id: number;
  name: string;
  email: string;
}

export interface Application {
  id: number;
  company: string;
  role: string;
  status: Status;
  job_description: string | null;
  notes: string | null;
  applied_on: string | null;
  match_score: number | null;
  updated_at: string;
}

export type ApplicationInput = Pick<Application, "company" | "role" | "status"> &
  Partial<Pick<Application, "notes" | "applied_on" | "job_description">>;

export interface MatchResult {
  score: number;
  summary: string;
  matchingSkills: string[];
  missingSkills: string[];
  suggestions: string[];
}
