---
title: "feat: Add Playwright E2E tests with test seeding API"
type: feat
status: completed
date: 2026-02-17
---

# feat: Add Playwright E2E Tests with Test Seeding API

## Overview

Add end-to-end tests using `@playwright/test` covering all user flows, error states, and bulk rendering scenarios. Includes a test-only seeding API route (`POST /api/test/seed`) guarded by `ENABLE_TEST_SEED=true` to enable bulk vote injection without UI interaction.

## Problem Statement

The app has 65 unit tests covering `src/lib/` but zero E2E tests. Core user flows (create poll, vote, close, view results) are only verified manually. Bulk rendering with hundreds of votes has never been tested, and regressions in page navigation, localStorage handling, or server action integration would go undetected.

## Proposed Solution

Use `@playwright/test` as a standalone test runner (separate from Vitest) with:
- A `playwright.config.ts` using `webServer` to auto-start the dev server
- E2E test files in `e2e/` organized by flow
- A test seeding route at `src/app/api/test/seed/route.ts` for bulk data setup
- An `.env.test` file with `ENABLE_TEST_SEED=true`

### Why not Vitest Browser Mode?

Vitest 4.0's `@vitest/browser-playwright` is for **component testing** — it renders components in an iframe and cannot navigate between pages (`page.goto()` unavailable). E2E flows require full page navigation, which only `@playwright/test` supports.

## Technical Considerations

### Test Seeding API

The app uses server actions exclusively (no REST API). Seeding votes through the UI is impractical at scale. The seed route bypasses server actions and calls store functions directly for performance.

**Contract:**
```
POST /api/test/seed
Content-Type: application/json

Request:
{
  "question": "Test poll",
  "candidates": ["A", "B", "C"],
  "votes": 200,        // number — generates N random votes
  "close": true         // optional — closes poll after seeding
}

Response (200):
{
  "pollId": "abc123",
  "adminToken": "xyz...",
  "votesCreated": 200
}

Response (404 when ENABLE_TEST_SEED !== "true"):
(empty body)
```

- Voter names: `Voter 1` through `Voter N`
- Grade assignment: random grade per candidate per voter (using `Math.random()` over the 7 grades)
- Calls `createPoll()` + `addVote()` from store directly (no Zod validation overhead)
- Returns 404 when env guard fails (route invisible in production)

### localStorage Handling

- `voted_{pollId}` prevents re-voting in the browser
- `admin_{pollId}` stores admin token after creation
- Tests use Playwright's default fresh browser context per test file
- Tests that need to persist state across navigations (e.g., "already voted" test) use a single context

### Animation Handling

Many components use `motion/react` animations. The `ResultsChart` uses timed CSS width transitions.

- Use `reducedMotion: 'reduce'` in Playwright context options for test stability
- Assert on `data-target` attributes (instant) rather than animated `width` styles
- Toast auto-dismisses after 3 seconds — assert within that window

### CSP Compatibility

CSP has `unsafe-eval` removed. Playwright uses CDP (Chrome DevTools Protocol) to control the browser, not injected scripts — no CSP conflicts.

## Implementation Phases

### Phase 1: Infrastructure

**Dependencies and configuration.**

- [x] Install `@playwright/test` and install Chromium browser
  - `pnpm add -D @playwright/test`
  - `pnpm exec playwright install chromium`

- [x] Create `playwright.config.ts`
  - `webServer.command`: `pnpm dev --port 3001`
  - `webServer.port`: 3001 (avoid conflicts with running dev server)
  - `webServer.reuseExistingServer`: `!process.env.CI`
  - `use.baseURL`: `http://localhost:3001`
  - `use.reducedMotion`: `'reduce'`
  - `testDir`: `./e2e`
  - Single project: `chromium` only
  - `retries`: 0 locally, 2 in CI

- [x] Create `.env.test` with `ENABLE_TEST_SEED=true`

- [x] Add `package.json` scripts
  - `"test:e2e": "playwright test"`
  - `"test:e2e:ui": "playwright test --ui"`

- [x] Create `src/app/api/test/seed/route.ts`
  - Check `process.env.ENABLE_TEST_SEED === "true"`, return 404 if not
  - Parse JSON body: `{ question, candidates, votes, close? }`
  - Validate: question non-empty, candidates.length >= 2, votes >= 0 and <= 500
  - Call `createPoll()` with generated `nanoid` IDs
  - Loop `votes` times: generate `Voter 1`..`Voter N`, random grades, call `addVote()`
  - If `close: true`, call `closePoll()`
  - Return `{ pollId, adminToken, votesCreated }`

- [x] Add `e2e/` to `.gitignore` for test results: `e2e/test-results/`, `e2e/playwright-report/`

- [x] Update `.env.test` loading: Playwright config loads `.env.test` via `dotenv` or `webServer.env`

**Files:**
- `playwright.config.ts` (new)
- `.env.test` (new)
- `src/app/api/test/seed/route.ts` (new)
- `package.json` (edit — add scripts)

### Phase 2: Core Flow Tests

**Happy path E2E tests.**

- [x] `e2e/golden-path.spec.ts` — Full journey in one test
  - Create poll with 3 candidates via UI
  - Extract poll URL and admin URL from success screen
  - Vote as "Alice" with different grades per candidate
  - Verify confirmation page
  - Navigate to admin page, close poll (two-step confirmation)
  - Navigate to results page
  - Verify: winner has trophy, candidates ordered by rank, grade badges match, vote count = 1

- [x] `e2e/create-poll.spec.ts` — Poll creation details
  - Happy path: fill question + 3 candidates, submit, verify share link and admin link displayed
  - Add/remove candidates: add up to 4 candidates, remove back to 2, verify field count
  - Validation: submit empty form, verify "La question est requise" error; submit with 1 candidate, verify "Il faut au moins 2 options"

- [x] `e2e/vote.spec.ts` — Voting flow details
  - Happy path: fill name, select grades, verify submit button enables after all candidates graded
  - Voter name required: try to submit without name, verify button disabled or error shown
  - Already voted (localStorage): vote once, reload page, verify "Votre vote a bien ete enregistre" message
  - Already voted + poll closed: vote, seed close via API, reload, verify "Voir les resultats" button appears

- [x] `e2e/admin.spec.ts` — Admin management
  - Close poll: two-step confirmation, verify status changes to "Ferme", "Voir les resultats" link appears
  - Cancel close: click "Fermer le vote", then "Annuler", verify poll remains open
  - Already closed state: seed a closed poll via API, visit admin page, verify read-only state (no close button, status "Ferme")

- [x] `e2e/results.spec.ts` — Results display
  - Results after closing: seed poll with 3 votes + close, verify ranking order, grade badges, bars visible
  - Results not ready: seed open poll, navigate to results, verify "Resultats pas encore disponibles"
  - Zero votes: seed closed poll with 0 votes, navigate to results

**Files:**
- `e2e/golden-path.spec.ts` (new)
- `e2e/create-poll.spec.ts` (new)
- `e2e/vote.spec.ts` (new)
- `e2e/admin.spec.ts` (new)
- `e2e/results.spec.ts` (new)

### Phase 3: Error States & Edge Cases

- [x] `e2e/error-states.spec.ts`
  - 404: navigate to `/poll/nonexistent`, verify "Page introuvable" with "Retour a l'accueil" link
  - Invalid admin token: navigate to `/poll/{id}/admin/wrong-token`, verify "Lien invalide" with "Retour au vote" link
  - Closed poll vote page: seed closed poll, navigate to vote page, verify "Ce vote est ferme" with results link
  - Duplicate voter name (server-side): seed poll with 1 vote as "Alice", clear localStorage, try to vote as "Alice" again, verify error toast "Vous avez deja vote"
  - Vote at capacity: seed poll with 500 votes, try to vote via UI, verify error toast "Ce sondage a atteint le nombre maximum de votes"

**Files:**
- `e2e/error-states.spec.ts` (new)

### Phase 4: Bulk Rendering Tests

- [x] `e2e/bulk-rendering.spec.ts`
  - 50 votes: seed + close, navigate to results, verify all candidate cards render with non-empty grade bars
  - 200 votes: seed + close, verify grade distribution bars have `data-target` attributes with valid percentages
  - 500 votes (max): seed + close, verify page renders without errors, all candidate cards visible, total vote count correct

**Files:**
- `e2e/bulk-rendering.spec.ts` (new)

## Acceptance Criteria

### Functional
- [x] `pnpm test:e2e` runs all E2E tests against a dev server
- [x] All core flows tested: create poll, vote, close, view results
- [x] Error states tested: 404, invalid token, already voted, closed poll, duplicate name, capacity limit
- [x] Bulk rendering tested at 50, 200, and 500 votes
- [x] Seed API creates poll + votes + optional close in one call
- [x] Seed API returns 404 when `ENABLE_TEST_SEED` is not set

### Non-Functional
- [x] Tests pass consistently (no flaky tests)
- [x] Total E2E suite runs in under 60 seconds
- [x] Seed API does not exist/respond in production (env guard)
- [x] No changes to existing unit tests or app behavior

## Dependencies & Risks

| Risk | Mitigation |
|------|------------|
| Dev server startup time slows tests | `reuseExistingServer: true` locally |
| Animation timing causes flaky tests | `reducedMotion: 'reduce'` + assert on `data-target` not animated width |
| Toast auto-dismiss (3s) causes missed assertions | Assert toast immediately after action |
| Port 3001 conflicts | Configurable via env var in playwright config |
| Seed route accidentally available in production | 404 response when env guard fails + env var not in `.env.production` |
| In-memory store cleared on server restart | Each test seeds its own data; no cross-test dependencies |

## Test File Summary

```
e2e/
  golden-path.spec.ts       # Full journey: create → vote → close → results
  create-poll.spec.ts       # Poll creation + validation + candidate management
  vote.spec.ts              # Voting flow + localStorage + already-voted states
  admin.spec.ts             # Admin close + cancel + already-closed state
  results.spec.ts           # Results display + not-ready + zero votes
  error-states.spec.ts      # 404, invalid token, duplicate name, capacity limit
  bulk-rendering.spec.ts    # 50, 200, 500 vote rendering tests

src/app/api/test/seed/
  route.ts                  # Test seeding API (env-guarded)

playwright.config.ts        # Playwright configuration
.env.test                   # ENABLE_TEST_SEED=true
```

## References

- [Brainstorm](../brainstorms/2026-02-17-e2e-tests-playwright-brainstorm.md)
- [Full App Review Solution](../solutions/code-quality/full-app-review-security-testing-cleanup.md) — documents `_resetForTesting()` pattern and test conventions
- [Playwright Test docs](https://playwright.dev/docs/test-configuration)
- Existing unit tests: `src/lib/__tests__/` — store, actions, schemas, majority-judgment
