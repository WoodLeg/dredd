---
title: "refactor: Full App Review & Improvements"
type: refactor
status: completed
date: 2026-02-17
brainstorm: docs/brainstorms/2026-02-17-full-app-review-brainstorm.md
---

# refactor: Full App Review & Improvements

## Overview

Comprehensive quality pass across the Dredd application after the Server Actions + RHF + Zod refactor and OAuth revert. Four sequential phases: cleanup stale artifacts, fix code quality issues, tighten security headers, and add Vitest unit tests.

## Problem Statement / Motivation

The codebase is in a stable, clean state after completing several refactors and reverting the abandoned OAuth experiment. However, several quality issues remain:

- 7 stale OAuth todo files and outdated doc statuses create confusion
- Button-styled links duplicate Tailwind classes instead of reusing the Button component
- Error state pages bypass PageLayout, creating visual inconsistency
- CSP includes `unsafe-eval` from the OAuth era that is no longer needed
- Zero test coverage for the core algorithm, store, and server actions

## Proposed Solution

Four sequential phases, each producing a clean commit:

1. **Cleanup** — Delete stale artifacts, update doc statuses
2. **Code Quality** — Add `href` prop to Button, wrap error pages in PageLayout
3. **Security** — Remove `unsafe-eval` from CSP
4. **Testing** — Install Vitest, write unit tests for all lib files

## Technical Considerations

### Button Component — `href` Prop Design

The `Button` at `src/components/ui/button.tsx` renders `<motion.button>`. Wrapping it in `<Link>` creates invalid HTML (`<a>` containing `<button>`).

**Decision:** Add an optional `href` prop. When provided, render `<motion.a>` (via `motion(Link)` from `motion/react`) instead of `<motion.button>`. This keeps a clean API and produces valid HTML.

```tsx
// When href is provided → renders <motion.a> (Link)
<Button href={`/poll/${id}/results`}>Voir les résultats</Button>

// When no href → renders <motion.button> (current behavior)
<Button onClick={handleSubmit}>Envoyer</Button>
```

**Files affected:**
- `src/components/ui/button.tsx` — add `href` prop, conditional render
- `src/app/poll/[id]/poll-page-client.tsx` — replace 2 hardcoded button-styled links (lines ~33, ~60)
- `src/components/admin-panel.tsx` — replace 1 hardcoded button-styled link (line ~133)

### CSP Strategy

**Decision:** Remove only `unsafe-eval` from `script-src`. Keep `unsafe-inline` for both `script-src` and `style-src` — Next.js requires `unsafe-inline` for inline scripts, and the app uses inline styles extensively (Motion animations, ResultsChart bars, GradeBadge colors).

`unsafe-eval` was added for OAuth provider scripts and is no longer needed. This is the high-value, low-risk change.

**File:** `next.config.ts` — update CSP `script-src` directive.

**Verification:** Manual browser test after `pnpm build && pnpm start`. Check console for CSP violations on all page types.

### Vitest Setup

**Dependencies:** `vitest`, `vite-tsconfig-paths` (for `@/*` alias resolution)

**Test isolation for `store.ts`:** Add `_resetForTesting()` export gated behind `process.env.NODE_ENV === 'test'`. Pragmatic, commonly used pattern.

**Server actions (`actions.ts`):** The `"use server"` directive is a build-time marker that Vitest ignores as a no-op expression. Tests import the functions directly and test their logic, not the transport layer.

**Environment:** `node` (default) — all lib files use Node.js APIs (`node:crypto`), no DOM needed.

### PageLayout for Error States

Three pages duplicate the centering logic (`min-h-screen flex items-center justify-center px-4`) instead of using `PageLayout`:

- `src/app/not-found.tsx`
- `src/app/poll/[id]/results/page.tsx` (`ResultsNotReady` component)
- `src/app/poll/[id]/admin/[token]/page.tsx` (invalid token view)

**Decision:** Wrap all three in `<PageLayout>` for consistency.

## Acceptance Criteria

### Phase 1: Cleanup Stale Artifacts
- [x] All 7 files in `todos/` deleted
- [x] `2026-02-15` plan status updated from "active" to "completed"
- [x] `2026-02-15` brainstorm Next.js version reference fixed (15 → 16)
- [x] `2026-02-16` OAuth brainstorm and plan docs marked `status: abandoned`
- [x] `pnpm build` passes

### Phase 2: Code Quality Fixes
- [x] `Button` component accepts optional `href` prop
- [x] When `href` provided, Button renders as `<Link>` — valid HTML
- [x] When no `href`, Button renders as `<motion.button>` — existing behavior preserved
- [x] 3 hardcoded button-styled links replaced with `<Button href="...">`:
  - `src/app/poll/[id]/poll-page-client.tsx` (2 instances)
  - `src/components/admin-panel.tsx` (1 instance)
- [x] `not-found.tsx` wrapped in `<PageLayout>`
- [x] `ResultsNotReady` in `src/app/poll/[id]/results/page.tsx` wrapped in `<PageLayout>`
- [x] Invalid admin token view in `src/app/poll/[id]/admin/[token]/page.tsx` wrapped in `<PageLayout>`
- [x] `pnpm build` passes
- [ ] Visual appearance unchanged (manual check)

### Phase 3: Security Hardening
- [x] `unsafe-eval` removed from `script-src` in CSP header (`next.config.ts`)
- [x] `unsafe-inline` kept for both `script-src` and `style-src`
- [x] `pnpm build` passes
- [ ] Manual browser verification: no CSP violations in console on all pages (home, poll, vote, results, admin, not-found)

### Phase 4: Vitest Unit Tests
- [x] `vitest` and `vite-tsconfig-paths` installed as dev dependencies
- [x] `vitest.config.ts` created with `vite-tsconfig-paths` plugin and `node` environment
- [x] `package.json` has `"test": "vitest run"` and `"test:watch": "vitest"` scripts
- [x] Tests written for `src/lib/grades.ts`:
  - 7 grades in correct order (excellent → a-rejeter)
  - `gradeIndex()` returns correct index for each grade
  - `GRADE_MAP` keys match `GRADES` entries
- [x] Tests written for `src/lib/schemas.ts`:
  - `createPollSchema`: valid input, empty question, too-long question, <2 candidates, >20 candidates, duplicates (case-insensitive), whitespace trimming
  - `voteSchema`: valid input, empty voter name, too-long name, invalid grade
  - `closePollSchema`: valid input, empty fields
- [x] Tests written for `src/lib/store.ts`:
  - `createPoll`: success, MAX_POLLS limit
  - `getPoll`: found, not found
  - `validateAdmin`: correct token, wrong token, wrong poll, different-length tokens
  - `addVote`: success, poll not found, MAX_VOTES limit, closed poll, duplicate voter
  - `setCachedResults`: sets first time, ignores subsequent
  - `closePoll`: success, not found, invalid token, already closed
  - `_resetForTesting()` clears state between tests
- [x] Tests written for `src/lib/majority-judgment.ts`:
  - Zero votes (all candidates get worst grade)
  - Single voter
  - Even number of voters (lower-median behavior)
  - All candidates tied (shared rank 1)
  - Partial ties (e.g., ranks 1, 1, 3 not 1, 1, 2)
  - Single candidate
  - Full ranking with multiple candidates and varied grades
- [x] Tests written for `src/lib/actions.ts`:
  - `createPollAction`: valid creation, Zod validation failure
  - `submitVoteAction`: valid vote, poll not found, missing grade, invalid grade, store errors
  - `closePollAction`: valid close, Zod failure, store errors
- [x] All tests pass with `pnpm test`
- [x] `pnpm build` still passes

## Success Metrics

- Zero stale artifacts in `todos/`
- All button-styled links use the `Button` component
- All pages use `PageLayout` for consistent layout
- No `unsafe-eval` in CSP headers
- 100% unit test coverage for `src/lib/` files
- `pnpm build` and `pnpm test` both pass

## Dependencies & Risks

| Risk | Mitigation |
|------|------------|
| `motion(Link)` may not work seamlessly with `next/link` | Test in dev before committing. Fallback: use `motion.a` with manual `href` handling |
| CSP change could break production silently | Manual browser verification after `pnpm build && pnpm start` |
| `"use server"` directive could cause Vitest import issues | Vitest treats it as a no-op expression. If issues arise, add a Vitest plugin or extract testable logic |
| `_resetForTesting()` leaks into production API | Gate behind `NODE_ENV === 'test'` check |

## References & Research

### Internal References
- Brainstorm: `docs/brainstorms/2026-02-17-full-app-review-brainstorm.md`
- Button component: `src/components/ui/button.tsx`
- CSP headers: `next.config.ts` (lines 12-15)
- Store: `src/lib/store.ts`
- Server actions: `src/lib/actions.ts`
- Schemas: `src/lib/schemas.ts`
- Majority judgment: `src/lib/majority-judgment.ts`
- Grades: `src/lib/grades.ts`
- Performance audit: `docs/solutions/performance-issues/vercel-react-best-practices-audit-next16.md`
- localStorage pattern: `docs/solutions/logic-errors/localstorage-redirect-blocks-voters.md`

### External References
- Vitest docs: https://vitest.dev/
- vite-tsconfig-paths: https://www.npmjs.com/package/vite-tsconfig-paths
- Motion + Next.js Link: https://motion.dev/docs/react-motion-component
- Next.js CSP docs: https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy
