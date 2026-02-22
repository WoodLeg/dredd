import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Poll, Vote, PollResults } from "../types";

// --- In-memory Redis mock ---

const data = new Map<string, unknown>();

function keyExists(key: string): boolean {
  return data.has(key);
}

function getHash(key: string): Record<string, string> {
  return (data.get(key) as Record<string, string>) ?? {};
}

function getList(key: string): string[] {
  return (data.get(key) as string[]) ?? [];
}

function getSet(key: string): Set<string> {
  if (!data.has(key)) data.set(key, new Set<string>());
  return data.get(key) as Set<string>;
}

function getSortedSet(key: string): Array<{ score: number; member: string }> {
  if (!data.has(key)) data.set(key, [] as Array<{ score: number; member: string }>);
  return data.get(key) as Array<{ score: number; member: string }>;
}

// Creates a chainable mock that queues operations for pipeline
function createPipelineMock() {
  const queue: Array<() => unknown> = [];

  const pipelineMethods = {
    hset: (key: string, obj: Record<string, string>) => {
      queue.push(() => {
        data.set(key, { ...getHash(key), ...obj });
        return "OK";
      });
      return pipelineMethods;
    },
    hgetall: (key: string) => {
      queue.push(() => {
        if (!data.has(key)) return null;
        const val = data.get(key) as Record<string, string>;
        return Object.keys(val).length === 0 ? null : val;
      });
      return pipelineMethods;
    },
    lrange: (key: string, _start: number, _end: number) => {
      queue.push(() => {
        if (!data.has(key)) return [];
        return [...getList(key)];
      });
      return pipelineMethods;
    },
    zadd: (key: string, entry: { score: number; member: string }) => {
      queue.push(() => {
        const ss = getSortedSet(key);
        const existing = ss.findIndex((e) => e.member === entry.member);
        if (existing >= 0) ss[existing].score = entry.score;
        else ss.push(entry);
        return 1;
      });
      return pipelineMethods;
    },
    exec: async () => queue.map((fn) => fn()),
  };

  return pipelineMethods;
}

// Simulate Lua eval for ADD_VOTE_SCRIPT and CLOSE_POLL_SCRIPT
function evalLua(_script: string, keys: string[], args: string[]): [number, string] {
  void _script;

  // ADD_VOTE_SCRIPT detection: 4 keys
  if (keys.length === 4) {
    const [pollKey, votersKey, votesKey, resultsKey] = keys;
    const [voterId, voteJSON, maxVotes] = args;

    if (!keyExists(pollKey)) return [0, "not_found"];

    const hash = getHash(pollKey);
    if (hash.isClosed === "true") return [0, "closed"];

    const votes = getList(votesKey);
    if (votes.length >= Number(maxVotes)) return [0, "capacity"];

    const voters = getSet(votersKey);
    if (voters.has(voterId)) return [0, "duplicate_vote"];

    voters.add(voterId);
    votes.push(voteJSON);
    data.set(votesKey, votes);
    data.delete(resultsKey);
    return [1, "ok"];
  }

  // CLOSE_POLL_SCRIPT detection: 1 key
  if (keys.length === 1) {
    const [pollKey] = keys;
    const [userId, closedAt] = args;

    if (!keyExists(pollKey)) return [0, "not_found"];

    const hash = getHash(pollKey);
    if (!hash.ownerId) return [0, "not_found"];
    if (hash.ownerId !== userId) return [0, "forbidden"];
    if (hash.isClosed === "true") return [0, "already_closed"];

    hash.isClosed = "true";
    hash.closedAt = closedAt;
    data.set(pollKey, hash);
    return [1, "ok"];
  }

  throw new Error("Unknown Lua script");
}

const mockRedis = {
  hset: vi.fn(async (key: string, obj: Record<string, string>) => {
    data.set(key, { ...getHash(key), ...obj });
    return "OK";
  }),
  hgetall: vi.fn(async (key: string) => {
    if (!data.has(key)) return null;
    const val = data.get(key) as Record<string, string>;
    return Object.keys(val).length === 0 ? null : val;
  }),
  hget: vi.fn(async (key: string, field: string) => {
    const hash = getHash(key);
    return hash[field] ?? null;
  }),
  lrange: vi.fn(async (key: string, _start: number, _end: number) => {
    if (!data.has(key)) return [];
    return [...getList(key)];
  }),
  llen: vi.fn(async (key: string) => {
    if (!data.has(key)) return 0;
    return getList(key).length;
  }),
  sismember: vi.fn(async (key: string, member: string) => {
    if (!data.has(key)) return 0;
    return getSet(key).has(member) ? 1 : 0;
  }),
  zadd: vi.fn(async (key: string, entry: { score: number; member: string }) => {
    const ss = getSortedSet(key);
    const existing = ss.findIndex((e) => e.member === entry.member);
    if (existing >= 0) ss[existing].score = entry.score;
    else ss.push(entry);
    return 1;
  }),
  zrange: vi.fn(async (key: string, _start: number, _end: number, opts?: { rev?: boolean }) => {
    if (!data.has(key)) return [];
    const ss = [...getSortedSet(key)];
    ss.sort((a, b) => (opts?.rev ? b.score - a.score : a.score - b.score));
    return ss.map((e) => e.member);
  }),
  set: vi.fn(async (key: string, value: unknown, opts?: { nx?: boolean }) => {
    if (opts?.nx && data.has(key)) return null;
    data.set(key, value);
    return "OK";
  }),
  get: vi.fn(async (key: string) => {
    return data.get(key) ?? null;
  }),
  del: vi.fn(async (key: string) => {
    data.delete(key);
    return 1;
  }),
  eval: vi.fn(async (script: string, keys: string[], args: string[]) => {
    return evalLua(script, keys, args);
  }),
  pipeline: vi.fn(() => createPipelineMock()),
};

vi.mock("../redis", () => ({
  redis: mockRedis,
}));

const {
  createPoll,
  getPoll,
  getPollMeta,
  getPollsByOwner,
  validateOwner,
  addVote,
  setCachedResults,
  getCachedResults,
  closePoll,
} = await import("../store");

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
  data.clear();
});

describe("createPoll", () => {
  it("creates a poll successfully", async () => {
    const poll = makePoll();
    const result = await createPoll(poll);
    expect(result.error).toBeUndefined();
    expect(result.poll).toEqual(poll);
  });
});

describe("getPoll", () => {
  it("returns poll when it exists", async () => {
    const poll = makePoll();
    await createPoll(poll);
    const fetched = await getPoll("test-poll");
    expect(fetched).toBeDefined();
    expect(fetched!.id).toBe("test-poll");
    expect(fetched!.question).toBe("Test question?");
    expect(fetched!.candidates).toEqual(["Alice", "Bob"]);
  });

  it("returns undefined for non-existent poll", async () => {
    expect(await getPoll("non-existent")).toBeUndefined();
  });
});

describe("getPollMeta", () => {
  it("returns poll metadata without votes", async () => {
    await createPoll(makePoll());
    const meta = await getPollMeta("test-poll");
    expect(meta).toBeDefined();
    expect(meta!.id).toBe("test-poll");
    expect(meta!.question).toBe("Test question?");
    expect(meta!.candidates).toEqual(["Alice", "Bob"]);
    // PollMeta should not have votes property
    expect("votes" in meta!).toBe(false);
  });

  it("returns undefined for non-existent poll", async () => {
    expect(await getPollMeta("non-existent")).toBeUndefined();
  });
});

describe("validateOwner", () => {
  beforeEach(async () => {
    await createPoll(makePoll());
  });

  it("returns true for correct owner", async () => {
    expect(await validateOwner("test-poll", "owner-user-id")).toBe(true);
  });

  it("returns false for wrong owner", async () => {
    expect(await validateOwner("test-poll", "wrong-user-id")).toBe(false);
  });

  it("returns false for non-existent poll", async () => {
    expect(await validateOwner("non-existent", "owner-user-id")).toBe(false);
  });
});

describe("addVote", () => {
  beforeEach(async () => {
    await createPoll(makePoll());
  });

  it("adds vote successfully", async () => {
    const result = await addVote("test-poll", makeVote("voter-1"));
    expect(result.success).toBe(true);
  });

  it("returns not_found for non-existent poll", async () => {
    const result = await addVote("non-existent", makeVote("voter-1"));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.code).toBe("not_found");
  });

  it("returns capacity when MAX_VOTES limit reached", async () => {
    // Fill up to 500 votes
    for (let i = 0; i < 500; i++) {
      await addVote("test-poll", makeVote(`voter-${i}`));
    }
    const result = await addVote("test-poll", makeVote("one-too-many"));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.code).toBe("capacity");
  });

  it("returns closed when poll is closed", async () => {
    await closePoll("test-poll", "owner-user-id");
    const result = await addVote("test-poll", makeVote("voter-1"));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.code).toBe("closed");
  });

  it("returns duplicate_vote for duplicate voter", async () => {
    await addVote("test-poll", makeVote("voter-1"));
    const result = await addVote("test-poll", makeVote("voter-1"));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.code).toBe("duplicate_vote");
  });

  it("invalidates cached results when vote is added", async () => {
    // Set cached results
    await setCachedResults("test-poll", {
      pollId: "test-poll",
      question: "?",
      ranking: [],
      totalVotes: 0,
    });
    expect(await getCachedResults("test-poll")).toBeDefined();

    // Adding a vote should clear the cache (DEL on results key)
    await addVote("test-poll", makeVote("voter-1"));
    expect(await getCachedResults("test-poll")).toBeUndefined();
  });
});

describe("setCachedResults", () => {
  const results: PollResults = {
    pollId: "test-poll",
    question: "Test?",
    ranking: [],
    totalVotes: 0,
  };

  it("sets results on first call", async () => {
    await setCachedResults("test-poll", results);
    const cached = await getCachedResults("test-poll");
    expect(cached).toEqual(results);
  });

  it("does not overwrite existing cached results (NX behavior)", async () => {
    await setCachedResults("test-poll", results);
    const newResults = { ...results, totalVotes: 99 };
    await setCachedResults("test-poll", newResults);
    const cached = await getCachedResults("test-poll");
    expect(cached).toEqual(results);
  });
});

describe("getPollsByOwner", () => {
  it("returns polls owned by the given user sorted by createdAt desc", async () => {
    await createPoll(makePoll({ id: "old", createdAt: 1000, ownerId: "user-a" }));
    await createPoll(makePoll({ id: "mid", createdAt: 2000, ownerId: "user-a" }));
    await createPoll(makePoll({ id: "new", createdAt: 3000, ownerId: "user-a" }));
    await createPoll(makePoll({ id: "other", createdAt: 4000, ownerId: "user-b" }));

    const result = await getPollsByOwner("user-a");
    expect(result).toHaveLength(3);
    expect(result.map((p) => p.id)).toEqual(["new", "mid", "old"]);
  });

  it("returns empty array for unknown owner", async () => {
    await createPoll(makePoll({ id: "p1", ownerId: "user-a" }));
    expect(await getPollsByOwner("unknown")).toEqual([]);
  });

  it("returns empty array when no polls exist", async () => {
    expect(await getPollsByOwner("anyone")).toEqual([]);
  });
});

describe("closePoll", () => {
  beforeEach(async () => {
    await createPoll(makePoll());
  });

  it("closes poll successfully", async () => {
    const result = await closePoll("test-poll", "owner-user-id");
    expect(result.success).toBe(true);
  });

  it("returns not_found for non-existent poll", async () => {
    const result = await closePoll("non-existent", "owner-user-id");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.code).toBe("not_found");
  });

  it("returns forbidden for wrong owner", async () => {
    const result = await closePoll("test-poll", "wrong-user-id");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.code).toBe("forbidden");
  });

  it("returns already_closed for closed poll", async () => {
    await closePoll("test-poll", "owner-user-id");
    const result = await closePoll("test-poll", "owner-user-id");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.code).toBe("already_closed");
  });
});
