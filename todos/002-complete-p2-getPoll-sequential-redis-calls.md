---
status: pending
priority: p2
issue_id: "002"
tags: [code-review, performance]
dependencies: []
---

# Use pipeline for getPoll to avoid sequential Redis round-trips

## Problem Statement

`getPoll` makes two sequential HTTP calls to Upstash Redis: `HGETALL` then `LRANGE`. On Vercel, each round-trip is ~50-100ms. The early return optimization (skip `LRANGE` if poll doesn't exist) saves a round-trip on the miss path but costs one on the hit path — which is the common case.

**Reported by:** architecture-strategist

## Findings

- `src/lib/store.ts:100-105`: Sequential `await redis.hgetall()` then `await redis.lrange()`
- The results page loads the full poll (with votes) for computing results — this is where the latency matters most
- A wasted `LRANGE` on a non-existent poll returns `[]` which is essentially free

## Proposed Solutions

### Option 1: Pipeline both calls (Recommended)
```ts
export async function getPoll(id: string): Promise<Poll | undefined> {
  const pipe = redis.pipeline();
  pipe.hgetall(pollKey(id));
  pipe.lrange(votesKey(id), 0, -1);
  const [meta, rawVotes] = await pipe.exec() as [PollHash | null, string[]];
  if (!meta || !meta.question) return undefined;
  return assemblePoll(id, meta, rawVotes ?? []);
}
```
- **Pros:** Single round-trip, ~50-100ms saved per call
- **Cons:** Fetches votes even when poll doesn't exist (negligible cost)
- **Effort:** Small

## Technical Details

- **Affected files:** `src/lib/store.ts`

## Acceptance Criteria

- [ ] `getPoll` uses a pipeline for both Redis calls
- [ ] Results page latency reduced by ~50-100ms
