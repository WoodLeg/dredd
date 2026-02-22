---
status: pending
priority: p2
issue_id: "005"
tags: [code-review, quality, dead-code]
dependencies: []
---

# Remove dead validateOwner function

## Problem Statement

`validateOwner` is exported from `store.ts` and tested, but has zero production callers. The admin page checks ownership inline after loading `PollMeta`. The `closePoll` Lua script handles ownership atomically.

**Reported by:** code-simplifier, code-simplicity-reviewer, kieran-typescript-reviewer

## Findings

- `src/lib/store.ts:121-124`: `validateOwner` — no imports outside test file
- `src/lib/__tests__/store.test.ts:262-278`: Test block for `validateOwner`
- Admin page uses `poll.ownerId !== session.user.id` inline
- `closePoll` Lua script checks ownership atomically

## Proposed Solutions

Remove `validateOwner` from `store.ts` and its test block. ~20 LOC saved.

- **Effort:** Small

## Acceptance Criteria

- [ ] `validateOwner` removed from store.ts
- [ ] Test block removed from store.test.ts
- [ ] `pnpm test` passes
