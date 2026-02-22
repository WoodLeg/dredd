---
status: pending
priority: p2
issue_id: "006"
tags: [code-review, quality]
dependencies: []
---

# closePollAction collapses already_closed into forbidden

## Problem Statement

`closePollAction` in `actions.ts:133` remaps `already_closed` to `forbidden`, losing error fidelity. The `ActionErrorCode` type in `types.ts` doesn't include `already_closed`, so the store's typed error code gets silently dropped.

**Reported by:** kieran-typescript-reviewer, code-simplifier

## Findings

- `src/lib/actions.ts:133`: `code: storeResult.code === "not_found" ? "not_found" : "forbidden"` — collapses `already_closed`
- `src/lib/types.ts:65-72`: `ActionErrorCode` doesn't include `"already_closed"`
- The client receives `forbidden` when the poll is already closed — misleading

## Proposed Solutions

### Option 1: Add `already_closed` to ActionErrorCode and pass through
- Add `"already_closed"` to the `ActionErrorCode` union in `types.ts`
- Change actions.ts to `code: storeResult.code`
- **Effort:** Small (2 line changes)

## Acceptance Criteria

- [ ] `closePollAction` passes through the original error code
- [ ] `ActionErrorCode` includes `"already_closed"`
- [ ] Client-facing error messages remain accurate
