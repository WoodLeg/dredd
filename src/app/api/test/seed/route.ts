import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { nanoid } from "nanoid";
import { createPoll, addVote, closePoll } from "@/lib/store";
import { auth } from "@/lib/auth";
import { GRADES } from "@/lib/grades";
import type { Grade, Poll, Vote } from "@/lib/types";

const GRADE_KEYS = GRADES.map((g) => g.key);

function randomGrade(): Grade {
  return GRADE_KEYS[Math.floor(Math.random() * GRADE_KEYS.length)];
}

export async function POST(request: Request): Promise<Response> {
  if (
    process.env.NODE_ENV === "production" ||
    process.env.ENABLE_TEST_SEED !== "true"
  ) {
    return new NextResponse(null, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { question, candidates, votes = 0, close = false, ownerId: explicitOwnerId } = body as Record<
    string,
    unknown
  >;

  if (
    typeof question !== "string" ||
    !question ||
    !Array.isArray(candidates) ||
    candidates.length < 2 ||
    !candidates.every((c): c is string => typeof c === "string" && c.length > 0)
  ) {
    return NextResponse.json(
      { error: "question (string) and candidates (string[], min 2) are required" },
      { status: 400 }
    );
  }

  if (typeof votes !== "number" || votes < 0 || votes > 500) {
    return NextResponse.json(
      { error: "votes must be a number between 0 and 500" },
      { status: 400 }
    );
  }

  // Determine poll owner: explicit param > session user > random
  let ownerId: string;
  let ownerDisplayName: string;

  if (typeof explicitOwnerId === "string" && explicitOwnerId) {
    ownerId = explicitOwnerId;
    ownerDisplayName = "Juge en Chef (seed)";
  } else {
    const session = await auth.api.getSession({ headers: await headers() });
    if (session) {
      ownerId = session.user.id;
      ownerDisplayName = session.user.name ?? "Juge en Chef";
    } else {
      ownerId = `seed-owner-${nanoid(8)}`;
      ownerDisplayName = "Juge en Chef (seed)";
    }
  }

  const id = nanoid(10);

  const poll: Poll = {
    id,
    question,
    candidates,
    votes: [],
    createdAt: Date.now(),
    ownerId,
    ownerDisplayName,
    isClosed: false,
  };

  const createResult = createPoll(poll);
  if (createResult.error) {
    return NextResponse.json({ error: createResult.error }, { status: 500 });
  }

  let votesCreated = 0;
  for (let i = 1; i <= votes; i++) {
    const grades: Record<string, Grade> = {};
    for (const candidate of candidates) {
      grades[candidate] = randomGrade();
    }
    const vote: Vote = {
      voterId: `seed-voter-${i}`,
      voterDisplayName: `Voter ${i}`,
      grades,
    };
    const result = addVote(id, vote);
    if (result.success) votesCreated++;
  }

  if (close) {
    closePoll(id, ownerId);
  }

  return NextResponse.json({ pollId: id, ownerId, votesCreated });
}
