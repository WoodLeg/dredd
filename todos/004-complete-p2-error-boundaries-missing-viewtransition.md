---
status: pending
priority: p2
issue_id: "004"
tags: [code-review, quality, pattern-consistency]
dependencies: []
---

# Error boundaries missing ViewTransition wrapper

## Problem Statement

The new `error.tsx` files don't wrap their content in `<ViewTransition>`, breaking consistency with `not-found.tsx` and all page components which all use this wrapper.

**Reported by:** pattern-recognition-specialist

## Findings

- `src/app/error.tsx`: Missing `<ViewTransition>` wrapper
- `src/app/poll/[id]/error.tsx`: Missing `<ViewTransition>` wrapper
- `src/app/not-found.tsx`: Uses `<ViewTransition>` wrapper (established pattern)

## Proposed Solutions

Add `<ViewTransition>` wrapper to both error boundary files. Import `ViewTransition` from `"react"` — works in client components.

- **Effort:** Small (2 files, 2 lines each)

## Acceptance Criteria

- [ ] Both error boundaries wrap content in `<ViewTransition>`
- [ ] Pattern matches `not-found.tsx`
