---
status: pending
priority: p1
issue_id: "001"
tags: [code-review, security]
dependencies: []
---

# Restore NODE_ENV guard on emailAndPassword auth

## Problem Statement

The `emailAndPassword` config in `auth.ts` had its `NODE_ENV !== "production"` guard removed during the migration. Now only `ENABLE_TEST_AUTH === "true"` controls whether credentials auth is enabled. If this env var is accidentally set in production, email/password sign-up/sign-in endpoints would be live — the login page hides the form via its own `NODE_ENV` check, but the better-auth API routes at `/api/auth/[...all]` would still accept direct requests.

**Reported by:** security-sentinel, architecture-strategist, learnings-researcher (Known Pattern — `docs/solutions/logic-errors/react-hooks-and-state-machine-violations.md`)

## Findings

- `src/lib/auth.ts:52-55`: `enabled: process.env.ENABLE_TEST_AUTH === "true"` — single guard
- `src/app/login/page.tsx:30-32`: Has the double guard (`NODE_ENV !== "production" && ENABLE_TEST_AUTH`) but only controls UI visibility
- The API endpoints are controlled by the `auth.ts` config, not the login page

## Proposed Solutions

### Option 1: Restore double guard (Recommended)
```ts
emailAndPassword: {
  enabled:
    process.env.NODE_ENV !== "production" &&
    process.env.ENABLE_TEST_AUTH === "true",
},
```
- **Pros:** Defense-in-depth, matches login page guard
- **Cons:** Preview deployments on Vercel run in production mode, so test auth won't work there
- **Effort:** 1 line change
- **Risk:** Low

### Option 2: Use VERCEL_ENV instead of NODE_ENV
```ts
emailAndPassword: {
  enabled:
    process.env.VERCEL_ENV !== "production" &&
    process.env.ENABLE_TEST_AUTH === "true",
},
```
- **Pros:** Works on Vercel preview deployments (VERCEL_ENV=preview), blocks production
- **Cons:** Doesn't work outside Vercel (VERCEL_ENV not set), need fallback
- **Effort:** Small
- **Risk:** Low

## Technical Details

- **Affected files:** `src/lib/auth.ts`

## Acceptance Criteria

- [ ] `emailAndPassword.enabled` has a guard beyond just `ENABLE_TEST_AUTH`
- [ ] Production deployment cannot enable credentials auth even if env var is set
- [ ] Guard strategy is consistent between `auth.ts` and `login/page.tsx`
