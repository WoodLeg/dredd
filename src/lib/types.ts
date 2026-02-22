export type Grade =
  | "excellent"
  | "tres-bien"
  | "bien"
  | "assez-bien"
  | "passable"
  | "insuffisant"
  | "a-rejeter";

export interface Vote {
  voterId: string;
  voterDisplayName: string;
  grades: Record<string, Grade>;
}

export interface Poll {
  id: string;
  question: string;
  candidates: string[];
  votes: Vote[];
  createdAt: number;
  cachedResults?: PollResults;
  ownerId: string;
  ownerDisplayName: string;
  isClosed: boolean;
  closedAt?: number;
}

export interface PollData {
  id: string;
  question: string;
  candidates: string[];
  voterCount: number;
  isClosed: boolean;
  createdAt: number;
  hasVoted: boolean;
  isOwner: boolean;
}

export interface CandidateResult {
  name: string;
  medianGrade: Grade;
  gradeDistribution: Record<Grade, number>;
  rank: number;
}

export interface PollResults {
  pollId: string;
  question: string;
  ranking: CandidateResult[];
  totalVotes: number;
}

export interface DashboardPollData {
  id: string;
  question: string;
  candidateCount: number;
  voterCount: number;
  isClosed: boolean;
  createdAt: number;
  closedAt?: number;
  winner?: Pick<CandidateResult, "name" | "medianGrade" | "gradeDistribution">;
}

export type ActionErrorCode =
  | "unauthenticated"
  | "forbidden"
  | "already_closed"
  | "duplicate_vote"
  | "not_found"
  | "closed"
  | "validation"
  | "capacity";

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; code: ActionErrorCode; error: string }
  | { success: false; errors: Record<string, string[]> };
