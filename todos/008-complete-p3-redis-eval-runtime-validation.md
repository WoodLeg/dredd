---
status: pending
priority: p3
issue_id: "008"
tags: [code-review, quality, typescript]
dependencies: []
---

# Add runtime validation for redis.eval return values

## Problem Statement

`redis.eval()` results are cast with `as [number, string]` without runtime validation. This is an external boundary — if the Lua script returns an unexpected shape, the destructuring `[status, code]` would silently produce `undefined`.

**Reported by:** kieran-typescript-reviewer

## Proposed Solutions

Add a simple type guard:
```ts
function isEvalResult(v: unknown): v is [number, string] {
  return Array.isArray(v) && v.length === 2 && typeof v[0] === 'number' && typeof v[1] === 'string';
}
```

Then validate after eval, throwing a descriptive error on mismatch.

- **Effort:** Small
