"use server";

import { z } from "zod";
import { nanoid } from "nanoid";
import { headers } from "next/headers";
import { createPollSchema, voteSchema, closePollSchema } from "./schemas";
import { createPoll, getPollMeta, addVote, closePoll } from "./store";
import { auth, type Session } from "./auth";
import { GRADES } from "./grades";
import type { ActionResult, Grade, Poll } from "./types";

type SessionResult =
  | { ok: true; session: Session }
  | { ok: false; result: ActionResult<never> };

async function getRequiredSession(): Promise<SessionResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return {
      ok: false,
      result: {
        success: false,
        code: "unauthenticated",
        error: "Session expirée. Reconnectez-vous, citoyen.",
      },
    };
  }
  return { ok: true, session };
}

export async function createPollAction(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const sessionResult = await getRequiredSession();
  if (!sessionResult.ok) return sessionResult.result;
  const { session } = sessionResult;

  const result = createPollSchema.safeParse(input);
  if (!result.success) {
    return { success: false, errors: z.flattenError(result.error).fieldErrors };
  }

  const { question, candidates } = result.data;
  const candidateValues = candidates.map((c) => c.value).filter(Boolean);

  const id = nanoid(10);
  const poll: Poll = {
    id,
    question,
    candidates: candidateValues,
    votes: [],
    createdAt: Date.now(),
    ownerId: session.user.id,
    ownerDisplayName: session.user.name ?? "Juge en Chef",
    isClosed: false,
  };

  const storeResult = await createPoll(poll);
  if (storeResult.error) {
    return { success: false, code: "capacity", error: storeResult.error };
  }

  return { success: true, data: { id } };
}

export async function submitVoteAction(
  pollId: string,
  input: unknown
): Promise<ActionResult<{ voted: true }>> {
  const sessionResult = await getRequiredSession();
  if (!sessionResult.ok) return sessionResult.result;
  const { session } = sessionResult;

  const result = voteSchema.safeParse(input);
  if (!result.success) {
    return { success: false, errors: z.flattenError(result.error).fieldErrors };
  }

  const { grades } = result.data;

  const poll = await getPollMeta(pollId);
  if (!poll) {
    return { success: false, code: "not_found", error: "Dossier introuvable dans les archives" };
  }

  const validKeys = new Set<string>(GRADES.map((g) => g.key));
  const sanitizedGrades: Record<string, Grade> = {};

  for (const candidate of poll.candidates) {
    const grade = grades[candidate];
    if (!grade) {
      return { success: false, code: "validation", error: "Verdict requis pour chaque suspect" };
    }
    if (!validKeys.has(grade)) {
      return { success: false, code: "validation", error: `Mention invalide pour "${candidate}"` };
    }
    sanitizedGrades[candidate] = grade as Grade;
  }

  if (Object.keys(grades).length !== poll.candidates.length) {
    return { success: false, code: "validation", error: "Mention pour un suspect non répertorié" };
  }

  const storeResult = await addVote(pollId, {
    voterId: session.user.id,
    voterDisplayName: session.user.name ?? "Citoyen anonyme",
    grades: sanitizedGrades,
  });

  if (!storeResult.success) {
    return { success: false, code: storeResult.code, error: storeResult.error };
  }

  return { success: true, data: { voted: true } };
}

export async function closePollAction(
  input: unknown
): Promise<ActionResult<{ closed: true }>> {
  const sessionResult = await getRequiredSession();
  if (!sessionResult.ok) return sessionResult.result;
  const { session } = sessionResult;

  const result = closePollSchema.safeParse(input);
  if (!result.success) {
    return { success: false, errors: z.flattenError(result.error).fieldErrors };
  }

  const { pollId } = result.data;
  const storeResult = await closePoll(pollId, session.user.id);

  if (!storeResult.success) {
    return { success: false, code: storeResult.code, error: storeResult.error };
  }

  return { success: true, data: { closed: true } };
}
