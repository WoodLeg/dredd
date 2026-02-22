---
status: pending
priority: p2
issue_id: "003"
tags: [code-review, performance, architecture]
dependencies: []
---

# Dashboard over-fetches votes for all polls

## Problem Statement

`getPollsByOwner` fetches full vote data (`LRANGE`) for every poll on the dashboard. But the dashboard only needs votes for *closed* polls (to compute results). Open polls just need `poll.votes.length` for the voter count display.

A dashboard with 10 open polls and 2 closed polls currently fetches all vote JSON for all 12 polls — potentially hundreds of KB of unnecessary data.

**Reported by:** architecture-strategist

## Findings

- `src/lib/store.ts:195-215`: Pipeline fetches `HGETALL` + `LRANGE` for every poll ID
- `src/app/dashboard/page.tsx:37-70`: Only accesses `poll.votes` for closed polls needing result computation
- For open polls, only `poll.votes.length` is used (voter count)

## Proposed Solutions

### Option 1: Two-phase fetch — metadata first, votes only for closed polls (Recommended)
1. Fetch all poll metadata + vote counts via `HGETALL` + `LLEN` in a pipeline
2. Identify closed polls needing results
3. Fetch votes only for those polls in a second pipeline
- **Pros:** Dramatically reduces data transfer for dashboards with many open polls
- **Cons:** Two pipeline round-trips instead of one (but second may often be empty)
- **Effort:** Medium

### Option 2: Add voter count to poll hash
Store `voteCount` in the poll hash, updated atomically by the Lua script. Avoids `LLEN` calls entirely.
- **Pros:** Single source of truth for count, very fast
- **Cons:** Requires Lua script change, data migration concern
- **Effort:** Medium

## Technical Details

- **Affected files:** `src/lib/store.ts` (new function or modify `getPollsByOwner`), `src/app/dashboard/page.tsx`

## Acceptance Criteria

- [ ] Dashboard does not load full vote arrays for open polls
- [ ] Closed polls with cached results don't need vote data either
