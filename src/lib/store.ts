import type { Poll, PollResults, Vote } from "./types";

const MAX_POLLS = 10_000;
const MAX_VOTES_PER_POLL = 500;

// Persist the polls Map across Turbopack hot reloads in development.
const globalForStore = globalThis as unknown as { polls?: Map<string, Poll> };
const polls = globalForStore.polls ?? new Map<string, Poll>();
globalForStore.polls = polls;

export type CreatePollResult =
  | { poll: Poll; error?: undefined }
  | { poll?: undefined; error: string };

export function createPoll(poll: Poll): CreatePollResult {
  if (polls.size >= MAX_POLLS) {
    return { error: "Capacité maximale du Tribunal atteinte" };
  }
  polls.set(poll.id, poll);
  return { poll };
}

export function getPoll(id: string): Poll | undefined {
  return polls.get(id);
}

export function validateOwner(pollId: string, userId: string): boolean {
  const poll = polls.get(pollId);
  if (!poll) return false;
  return poll.ownerId === userId;
}

export type AddVoteError = "not_found" | "capacity" | "closed" | "duplicate_vote";

export type AddVoteResult =
  | { success: true }
  | { success: false; error: string; code: AddVoteError };

export function addVote(pollId: string, vote: Vote): AddVoteResult {
  const poll = polls.get(pollId);
  if (!poll) return { success: false, error: "Dossier introuvable dans les archives", code: "not_found" };

  if (poll.votes.length >= MAX_VOTES_PER_POLL) {
    return { success: false, error: "Nombre maximal de dépositions atteint pour ce dossier", code: "capacity" };
  }

  if (poll.isClosed) return { success: false, error: "Audience clôturée — aucune déposition acceptée", code: "closed" };

  const alreadyVoted = poll.votes.some((v) => v.voterId === vote.voterId);
  if (alreadyVoted) return { success: false, error: "Déposition déjà enregistrée sous ce matricule", code: "duplicate_vote" };

  poll.votes.push(vote);
  poll.cachedResults = undefined;
  return { success: true };
}

export function setCachedResults(pollId: string, results: PollResults): void {
  const poll = polls.get(pollId);
  if (poll && !poll.cachedResults) {
    poll.cachedResults = results;
  }
}

export type ClosePollError = "not_found" | "forbidden" | "already_closed";

export type ClosePollResult =
  | { success: true }
  | { success: false; error: string; code: ClosePollError };

export function closePoll(pollId: string, userId: string): ClosePollResult {
  const poll = polls.get(pollId);
  if (!poll) return { success: false, error: "Dossier introuvable dans les archives", code: "not_found" };
  if (poll.ownerId !== userId) {
    return { success: false, error: "Identification Juge en Chef invalide", code: "forbidden" };
  }
  if (poll.isClosed) return { success: false, error: "Audience déjà clôturée", code: "already_closed" };
  poll.isClosed = true;
  poll.closedAt = Date.now();
  return { success: true };
}

export function getPollsByOwner(ownerId: string): Poll[] {
  const owned: Poll[] = [];
  for (const poll of polls.values()) {
    if (poll.ownerId === ownerId) owned.push(poll);
  }
  owned.sort((a, b) => b.createdAt - a.createdAt);
  return owned;
}

export function _resetForTesting(): void {
  polls.clear();
}
