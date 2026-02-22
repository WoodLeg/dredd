import { redis } from "./redis";
import { ADD_VOTE_SCRIPT, CLOSE_POLL_SCRIPT } from "./redis-scripts";
import type { Poll, PollResults, Vote } from "./types";

const MAX_VOTES_PER_POLL = 500;

// --- Key helpers ---

function pollKey(id: string): string { return `poll:${id}`; }
function votesKey(id: string): string { return `poll:${id}:votes`; }
function votersKey(id: string): string { return `poll:${id}:voters`; }
function resultsKey(id: string): string { return `poll:${id}:results`; }
function ownerPollsKey(ownerId: string): string { return `owner:${ownerId}:polls`; }

// --- Types & assembly ---

// Upstash auto-deserializes JSON values on read, so fields stored as
// JSON.stringify/String() come back as their parsed types (array, number, boolean).
interface PollHash {
  question: string;
  candidates: string[];
  ownerId: string;
  ownerDisplayName: string;
  createdAt: number;
  isClosed: boolean;
  closedAt?: number;
  [key: string]: unknown;
}

export interface PollMeta {
  id: string;
  question: string;
  candidates: string[];
  ownerId: string;
  ownerDisplayName: string;
  createdAt: number;
  isClosed: boolean;
  closedAt?: number;
}

function assemblePollMeta(id: string, meta: PollHash): PollMeta {
  return {
    id,
    question: meta.question,
    candidates: meta.candidates,
    ownerId: meta.ownerId,
    ownerDisplayName: meta.ownerDisplayName,
    createdAt: meta.createdAt,
    isClosed: meta.isClosed,
    closedAt: meta.closedAt,
  };
}

function assemblePoll(id: string, meta: PollHash, votes: Vote[]): Poll {
  return {
    ...assemblePollMeta(id, meta),
    votes,
  };
}

function isEvalResult(v: unknown): v is [number, string] {
  return Array.isArray(v) && v.length === 2 && typeof v[0] === "number" && typeof v[1] === "string";
}

// --- Store functions ---

export type CreatePollResult =
  | { poll: Poll; error?: undefined }
  | { poll?: undefined; error: string };

export async function createPoll(poll: Poll): Promise<CreatePollResult> {
  const pipeline = redis.pipeline();
  pipeline.hset(pollKey(poll.id), {
    question: poll.question,
    candidates: JSON.stringify(poll.candidates),
    ownerId: poll.ownerId,
    ownerDisplayName: poll.ownerDisplayName,
    createdAt: String(poll.createdAt),
    isClosed: String(poll.isClosed),
  });
  pipeline.zadd(ownerPollsKey(poll.ownerId), {
    score: poll.createdAt,
    member: poll.id,
  });
  await pipeline.exec();
  return { poll };
}

export async function getPoll(id: string): Promise<Poll | undefined> {
  const pipe = redis.pipeline();
  pipe.hgetall(pollKey(id));
  pipe.lrange(votesKey(id), 0, -1);
  const [meta, votes] = (await pipe.exec()) as [PollHash | null, Vote[]];
  if (!meta || !meta.question) return undefined;
  return assemblePoll(id, meta, votes ?? []);
}

export async function getPollMeta(id: string): Promise<PollMeta | undefined> {
  const meta = await redis.hgetall<PollHash>(pollKey(id));
  if (!meta || !meta.question) return undefined;
  return assemblePollMeta(id, meta);
}

export async function getVoterCount(id: string): Promise<number> {
  return await redis.llen(votesKey(id));
}

export async function hasVoted(pollId: string, voterId: string): Promise<boolean> {
  return await redis.sismember(votersKey(pollId), voterId) === 1;
}

export type AddVoteError = "not_found" | "capacity" | "closed" | "duplicate_vote";

export type AddVoteResult =
  | { success: true }
  | { success: false; error: string; code: AddVoteError };

const ADD_VOTE_ERROR_MESSAGES: Record<string, string> = {
  not_found: "Dossier introuvable dans les archives",
  closed: "Audience clôturée — aucune déposition acceptée",
  capacity: "Nombre maximal de dépositions atteint pour ce dossier",
  duplicate_vote: "Déposition déjà enregistrée sous ce matricule",
};

export async function addVote(pollId: string, vote: Vote): Promise<AddVoteResult> {
  const raw = await redis.eval(
    ADD_VOTE_SCRIPT,
    [pollKey(pollId), votersKey(pollId), votesKey(pollId), resultsKey(pollId)],
    [vote.voterId, JSON.stringify(vote), String(MAX_VOTES_PER_POLL)]
  );

  if (!isEvalResult(raw)) throw new Error("Unexpected addVote eval result shape");
  const [status, code] = raw;
  if (status === 1) return { success: true };

  return {
    success: false,
    error: ADD_VOTE_ERROR_MESSAGES[code] ?? "Erreur inconnue",
    code: code as AddVoteError,
  };
}

export async function setCachedResults(pollId: string, results: PollResults): Promise<void> {
  await redis.set(resultsKey(pollId), JSON.stringify(results), { nx: true });
}

export async function getCachedResults(pollId: string): Promise<PollResults | undefined> {
  const raw = await redis.get<PollResults>(resultsKey(pollId));
  return raw ?? undefined;
}

export type ClosePollError = "not_found" | "forbidden" | "already_closed";

export type ClosePollResult =
  | { success: true }
  | { success: false; error: string; code: ClosePollError };

const CLOSE_POLL_ERROR_MESSAGES: Record<string, string> = {
  not_found: "Dossier introuvable dans les archives",
  forbidden: "Identification Juge en Chef invalide",
  already_closed: "Audience déjà clôturée",
};

export async function closePoll(pollId: string, userId: string): Promise<ClosePollResult> {
  const raw = await redis.eval(
    CLOSE_POLL_SCRIPT,
    [pollKey(pollId)],
    [userId, String(Date.now())]
  );

  if (!isEvalResult(raw)) throw new Error("Unexpected closePoll eval result shape");
  const [status, code] = raw;
  if (status === 1) return { success: true };

  return {
    success: false,
    error: CLOSE_POLL_ERROR_MESSAGES[code] ?? "Erreur inconnue",
    code: code as ClosePollError,
  };
}

export interface OwnerPollEntry {
  meta: PollMeta;
  voterCount: number;
}

export async function getPollsByOwner(ownerId: string): Promise<OwnerPollEntry[]> {
  const pollIds = await redis.zrange<string[]>(ownerPollsKey(ownerId), 0, -1, { rev: true });
  if (pollIds.length === 0) return [];

  const pipeline = redis.pipeline();
  for (const id of pollIds) {
    pipeline.hgetall(pollKey(id));
    pipeline.llen(votesKey(id));
  }
  const results = await pipeline.exec();

  const entries: OwnerPollEntry[] = [];
  for (let i = 0; i < pollIds.length; i++) {
    const hash = results[i * 2] as PollHash | null;
    const count = results[i * 2 + 1] as number;
    if (hash && hash.question) {
      entries.push({ meta: assemblePollMeta(pollIds[i], hash), voterCount: count });
    }
  }
  return entries;
}

export async function getVotesForPoll(pollId: string): Promise<Vote[]> {
  return await redis.lrange<Vote>(votesKey(pollId), 0, -1);
}
