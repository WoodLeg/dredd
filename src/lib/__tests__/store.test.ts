import { describe, it, expect, beforeEach } from "vitest";
import {
  createPoll,
  getPoll,
  getPollsByOwner,
  validateOwner,
  addVote,
  setCachedResults,
  closePoll,
  _resetForTesting,
} from "../store";
import type { Poll, Vote, PollResults } from "../types";

function makePoll(overrides: Partial<Poll> = {}): Poll {
  return {
    id: "test-poll",
    question: "Test question?",
    candidates: ["Alice", "Bob"],
    votes: [],
    createdAt: Date.now(),
    ownerId: "owner-user-id",
    ownerDisplayName: "Juge en Chef",
    isClosed: false,
    ...overrides,
  };
}

function makeVote(voterId: string): Vote {
  return {
    voterId,
    voterDisplayName: `Voter ${voterId}`,
    grades: { Alice: "excellent", Bob: "bien" },
  };
}

beforeEach(() => {
  _resetForTesting();
});

describe("createPoll", () => {
  it("creates a poll successfully", () => {
    const poll = makePoll();
    const result = createPoll(poll);
    expect(result.error).toBeUndefined();
    expect(result.poll).toBe(poll);
  });

  it("returns error when MAX_POLLS limit reached", () => {
    for (let i = 0; i < 10_000; i++) {
      createPoll(makePoll({ id: `poll-${i}` }));
    }
    const result = createPoll(makePoll({ id: "one-too-many" }));
    expect(result.error).toBeDefined();
    expect(result.poll).toBeUndefined();
  });
});

describe("getPoll", () => {
  it("returns poll when it exists", () => {
    const poll = makePoll();
    createPoll(poll);
    expect(getPoll("test-poll")).toBe(poll);
  });

  it("returns undefined for non-existent poll", () => {
    expect(getPoll("non-existent")).toBeUndefined();
  });
});

describe("validateOwner", () => {
  beforeEach(() => {
    createPoll(makePoll());
  });

  it("returns true for correct owner", () => {
    expect(validateOwner("test-poll", "owner-user-id")).toBe(true);
  });

  it("returns false for wrong owner", () => {
    expect(validateOwner("test-poll", "wrong-user-id")).toBe(false);
  });

  it("returns false for non-existent poll", () => {
    expect(validateOwner("non-existent", "owner-user-id")).toBe(false);
  });
});

describe("addVote", () => {
  beforeEach(() => {
    createPoll(makePoll());
  });

  it("adds vote successfully", () => {
    const result = addVote("test-poll", makeVote("voter-1"));
    expect(result.success).toBe(true);
    expect(getPoll("test-poll")!.votes).toHaveLength(1);
  });

  it("returns not_found for non-existent poll", () => {
    const result = addVote("non-existent", makeVote("voter-1"));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.code).toBe("not_found");
  });

  it("returns capacity when MAX_VOTES limit reached", () => {
    for (let i = 0; i < 500; i++) {
      addVote("test-poll", makeVote(`voter-${i}`));
    }
    const result = addVote("test-poll", makeVote("one-too-many"));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.code).toBe("capacity");
  });

  it("returns closed when poll is closed", () => {
    closePoll("test-poll", "owner-user-id");
    const result = addVote("test-poll", makeVote("voter-1"));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.code).toBe("closed");
  });

  it("returns duplicate_vote for duplicate voter", () => {
    addVote("test-poll", makeVote("voter-1"));
    const result = addVote("test-poll", makeVote("voter-1"));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.code).toBe("duplicate_vote");
  });

  it("clears cached results when vote is added", () => {
    const poll = getPoll("test-poll")!;
    poll.cachedResults = { pollId: "test-poll", question: "?", ranking: [], totalVotes: 0 };
    addVote("test-poll", makeVote("voter-1"));
    expect(getPoll("test-poll")!.cachedResults).toBeUndefined();
  });
});

describe("setCachedResults", () => {
  const results: PollResults = {
    pollId: "test-poll",
    question: "Test?",
    ranking: [],
    totalVotes: 0,
  };

  beforeEach(() => {
    createPoll(makePoll());
  });

  it("sets results on first call", () => {
    setCachedResults("test-poll", results);
    expect(getPoll("test-poll")!.cachedResults).toBe(results);
  });

  it("does not overwrite existing cached results", () => {
    setCachedResults("test-poll", results);
    const newResults = { ...results, totalVotes: 99 };
    setCachedResults("test-poll", newResults);
    expect(getPoll("test-poll")!.cachedResults).toBe(results);
  });
});

describe("getPollsByOwner", () => {
  it("returns polls owned by the given user sorted by createdAt desc", () => {
    createPoll(makePoll({ id: "old", createdAt: 1000, ownerId: "user-a" }));
    createPoll(makePoll({ id: "mid", createdAt: 2000, ownerId: "user-a" }));
    createPoll(makePoll({ id: "new", createdAt: 3000, ownerId: "user-a" }));
    createPoll(makePoll({ id: "other", createdAt: 4000, ownerId: "user-b" }));

    const result = getPollsByOwner("user-a");
    expect(result).toHaveLength(3);
    expect(result.map((p) => p.id)).toEqual(["new", "mid", "old"]);
  });

  it("returns empty array for unknown owner", () => {
    createPoll(makePoll({ id: "p1", ownerId: "user-a" }));
    expect(getPollsByOwner("unknown")).toEqual([]);
  });

  it("returns empty array when no polls exist", () => {
    expect(getPollsByOwner("anyone")).toEqual([]);
  });
});

describe("closePoll", () => {
  beforeEach(() => {
    createPoll(makePoll());
  });

  it("closes poll successfully", () => {
    const result = closePoll("test-poll", "owner-user-id");
    expect(result.success).toBe(true);
    expect(getPoll("test-poll")!.isClosed).toBe(true);
    expect(getPoll("test-poll")!.closedAt).toBeDefined();
  });

  it("returns not_found for non-existent poll", () => {
    const result = closePoll("non-existent", "owner-user-id");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.code).toBe("not_found");
  });

  it("returns forbidden for wrong owner", () => {
    const result = closePoll("test-poll", "wrong-user-id");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.code).toBe("forbidden");
  });

  it("returns already_closed for closed poll", () => {
    closePoll("test-poll", "owner-user-id");
    const result = closePoll("test-poll", "owner-user-id");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.code).toBe("already_closed");
  });
});
