# Full Application Review & Improvement

**Date:** 2026-02-17
**Status:** Active
**Branch:** TBD (from `refactor/revert-oauth-to-admin-tokens`)

## What We're Building

A comprehensive review and improvement pass across the Dredd application, addressing four areas: stale artifact cleanup, code quality fixes, security hardening, and unit test coverage with Vitest.

This is not a feature addition — it's a quality pass to align the codebase with updated conventions and add the foundation for ongoing quality (tests, tighter security).

## Why This Approach

After completing the Server Actions + RHF + Zod refactor and reverting the OAuth experiment, the codebase is in a stable, clean state. This is the right time to:

- Remove noise left by the abandoned OAuth feature
- Fix minor code quality issues (style duplication)
- Tighten security headers that were loosened for OAuth
- Add unit tests as a safety net for future changes

**Approach chosen:** Sequential phases (Cleanup → Code Quality → Security → Testing). Each phase produces a clean commit and builds on the previous.

## Key Decisions

### 1. Cleanup: Delete, Don't Archive
- **Decision:** Delete stale OAuth todos and mark abandoned docs clearly
- **Rationale:** Git history preserves everything. Stale files add confusion.
- **Scope:**
  - Delete all 7 completed OAuth todos in `todos/`
  - Update original plan (`2026-02-15`) status from "active" to "completed"
  - Fix Next.js version reference in original brainstorm (15 → 16)
  - Mark abandoned OAuth brainstorm/plan docs clearly

### 2. Code Quality: Button + Link Composition
- **Decision:** Replace hardcoded link styles with Button component + next/link composition
- **Rationale:** Eliminates style duplication without creating a new component (YAGNI)
- **Scope:**
  - `poll-page-client.tsx` — button-styled links (lines ~33-34, ~58-62)
  - `admin-panel.tsx` — button-styled links (lines ~131-136)
  - Any other instances found during review

### 3. Security: Tighten CSP
- **Decision:** Remove `unsafe-inline` and `unsafe-eval` from Content Security Policy
- **Rationale:** These were added for OAuth provider scripts; no longer needed
- **Scope:**
  - Update CSP in `next.config.ts`
  - Use nonces or strict-dynamic if needed for inline scripts
  - Verify app still works with tightened CSP

### 4. Testing: Vitest Unit Tests Only
- **Decision:** Add Vitest for unit tests covering pure logic
- **Rationale:** Start with highest-value, lowest-complexity tests. No component or E2E tests yet.
- **Test targets:**
  - `src/lib/majority-judgment.ts` — algorithm correctness, tie-breaking, edge cases
  - `src/lib/store.ts` — CRUD operations, validation, timing-safe comparison
  - `src/lib/schemas.ts` — Zod schema validation (valid/invalid inputs)
  - `src/lib/actions.ts` — server action return types, error handling
  - `src/lib/grades.ts` — grade ordering, labels, colors

## Phase Sequence

### Phase 1: Cleanup Stale Artifacts
- [ ] Delete all files in `todos/`
- [ ] Update `2026-02-15` plan status to "completed"
- [ ] Fix Next.js version in `2026-02-15` brainstorm
- [ ] Verify abandoned docs are clearly marked

### Phase 2: Code Quality Fixes
- [ ] Audit all button-styled links across the app
- [ ] Replace hardcoded Tailwind link styles with Button + Link composition
- [ ] Review component consistency against CLAUDE.md conventions

### Phase 3: Security Hardening
- [ ] Audit current CSP in `next.config.ts`
- [ ] Remove `unsafe-inline` and `unsafe-eval`
- [ ] Add nonces if needed for any inline scripts
- [ ] Test that the app renders correctly with tightened CSP

### Phase 4: Add Vitest Unit Tests
- [ ] Install Vitest and configure for Next.js/TypeScript
- [ ] Write tests for `majority-judgment.ts`
- [ ] Write tests for `store.ts`
- [ ] Write tests for `schemas.ts`
- [ ] Write tests for `actions.ts`
- [ ] Write tests for `grades.ts`
- [ ] Verify all tests pass with `pnpm test`

## Open Questions

None — all decisions resolved during brainstorming.
