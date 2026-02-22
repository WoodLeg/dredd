---
status: pending
priority: p3
issue_id: "007"
tags: [code-review, quality]
dependencies: []
---

# DRY assemblePoll/assemblePollMeta duplication

## Problem Statement

`assemblePollMeta` and `assemblePoll` share 90% of their body — same field parsing logic, different return types. `assemblePoll` could delegate to `assemblePollMeta` and add votes.

**Reported by:** code-simplifier, code-simplicity-reviewer

## Proposed Solutions

```ts
function assemblePoll(id: string, meta: PollHash, votes: string[]): Poll {
  return { ...assemblePollMeta(id, meta), votes: votes.map(v => JSON.parse(v) as Vote) };
}
```

~8 lines saved. Also inlines the trivial `serializeVote`/`deserializeVote` wrappers.

- **Effort:** Small
