# E2E Tests with Playwright

**Date:** 2026-02-17
**Status:** Ready for planning

## What We're Building

End-to-end tests for the Dredd voting app using `@playwright/test` as a standalone test runner (separate from the existing Vitest unit tests). The tests cover core user flows, error states, and bulk vote rendering at scale (50, 200, 500 votes).

A test seeding API route (`/api/test/seed`) enables bulk vote injection without going through the UI, guarded by an `ENABLE_TEST_SEED` env var.

## Why This Approach

### Playwright Test Runner (not Vitest Browser Mode)

Vitest 4.0's stable Browser Mode (`@vitest/browser-playwright`) is designed for **component testing** — rendering isolated components in a real browser. It cannot:
- Navigate between pages (`page.goto()` unavailable)
- Test Next.js routing, redirects, or full page flows
- Intercept network requests

For full E2E flows (create poll → vote → close → view results), `@playwright/test` is the right tool. It runs in Node.js, controls the browser remotely, and has mature APIs for navigation, assertions, and visual testing.

### Test Seeding API

The app uses server actions exclusively (no REST API routes). Submitting votes through the UI in a loop would be impractical for hundreds of votes. A dedicated seed route provides:
- **Speed**: Direct store access, no form rendering
- **Flexibility**: Create polls with arbitrary vote counts in one HTTP call
- **Safety**: Guarded by `ENABLE_TEST_SEED=true` env var, not available in production

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| E2E framework | `@playwright/test` (standalone) | Full page navigation, mature tooling, battle-tested |
| Vote seeding | POST `/api/test/seed` route | Direct store injection, one call creates poll + votes |
| Seed scope | Full (poll + votes + optional close) | Minimizes test setup boilerplate |
| Vote limit | Keep `MAX_VOTES_PER_POLL = 500` fixed | 500 votes × 20 candidates is sufficient for UI stress testing |
| Server mode | Dev server (`pnpm dev`) | Faster startup, matches manual testing |
| Test scope | Core flows + error states + bulk rendering | Covers happy path, edge cases, and UI rendering at scale |
| Vitest/Playwright integration | Not used for E2E | Vitest Browser Mode is for component testing only |
| Playwright MCP | Document in CLAUDE.md for manual testing/recording | Helps write tests by recording interactions |

## Test Plan

### Core Flows (E2E)

1. **Create poll** — Fill form, submit, verify share/admin links
2. **Vote** — Select grades for all candidates, submit, verify confirmation
3. **Close poll** — Admin page, confirm closure, verify status change
4. **View results** — Verify ranking, grade bars, vote count

### Error States

5. **404 — Poll not found** — Navigate to nonexistent poll ID
6. **Invalid admin token** — Navigate with wrong token
7. **Already voted** — Attempt to vote twice (localStorage guard)
8. **Closed poll** — Attempt to vote on closed poll
9. **Results not ready** — View results before poll is closed

### Bulk Rendering

10. **50 votes** — Seed poll with 50 votes, verify results render correctly
11. **200 votes** — Seed poll with 200 votes, verify grade distribution bars
12. **500 votes (max)** — Seed poll at limit, verify no rendering issues

### Seed API Specification

```
POST /api/test/seed
Content-Type: application/json

{
  "question": "Test poll",
  "candidates": ["A", "B", "C"],
  "votes": 200,
  "close": true
}

Response:
{
  "pollId": "abc123",
  "adminToken": "xyz...",
  "votesCreated": 200
}
```

- Requires `ENABLE_TEST_SEED=true` env var
- Generates random voter names (e.g., `voter-001` through `voter-200`)
- Assigns random grades per candidate per voter
- Optionally closes the poll if `close: true`

## Architecture

```
Testing layers:
├── Unit tests (existing)        → vitest, environment: node
│   └── src/lib/__tests__/       → store, actions, schemas, majority-judgment
│
├── E2E tests (new)              → @playwright/test
│   └── e2e/                     → Full user flows against running app
│       ├── create-poll.spec.ts
│       ├── vote.spec.ts
│       ├── close-poll.spec.ts
│       ├── results.spec.ts
│       ├── error-states.spec.ts
│       └── bulk-rendering.spec.ts
│
└── Test infrastructure (new)
    ├── playwright.config.ts     → webServer, baseURL, projects
    ├── src/app/api/test/seed/route.ts  → Seed API (env-guarded)
    └── .env.test                → ENABLE_TEST_SEED=true
```

## Constraints

- `MAX_VOTES_PER_POLL = 500` — hard limit, not configurable
- Voter names must be unique per poll — seed route generates sequential names
- Results page requires `poll.isClosed === true` — seed route supports `close: true`
- `localStorage` guards "already voted" — tests use fresh browser contexts or clear storage
- No `unsafe-eval` in CSP — Playwright runs outside the browser, not affected

## Resolved Questions

- **Vitest Browser Mode for E2E?** → No. It's for component testing. Use `@playwright/test` for E2E.
- **How to seed bulk votes?** → Test API route with env guard (`ENABLE_TEST_SEED`).
- **Raise vote limit?** → No. 500 is sufficient for UI stress testing.
- **Dev or prod server?** → Dev server via Playwright's `webServer` option.
- **Seed just votes or full setup?** → Full seed (poll + votes + optional close) in one call.
