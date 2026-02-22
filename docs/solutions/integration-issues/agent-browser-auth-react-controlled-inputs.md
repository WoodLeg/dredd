---
title: "agent-browser Auth Flow: React Controlled Inputs and Better Auth"
date: 2026-02-21
category: integration-issues
tags:
  - agent-browser
  - better-auth
  - react-controlled-inputs
  - video-recording
  - browser-automation
severity: medium
component: Authentication / Browser Automation
symptoms:
  - "Login form submission appears to succeed but session remains unauthenticated"
  - "`fill` command does not trigger React onChange handlers"
  - "Conditionally-rendered form fields not accessible via `snapshot -i` refs"
  - "Test account password mismatch causes silent auth failure"
root_cause: "`agent-browser fill` sets DOM value directly without triggering React synthetic events; combined with stale test account credentials from previous sessions"
---

## Problem

When using `agent-browser` to record a feature video walkthrough of a Next.js app with Better Auth session authentication, the login flow failed silently. The form appeared to submit correctly but the session was never established, leaving the browser unauthenticated.

## Investigation Steps

1. **Session expired on homepage** — Navigating to `/` showed "Session expirée" with a redirect to `/login`. The app requires authentication for poll creation.

2. **`fill` on login form** — Used `agent-browser fill @ref "value"` for email and password fields. The form submitted but auth failed silently (no error message, just stayed on login page).

3. **Sign-up mode issues** — Toggled to sign-up mode, but the conditionally-rendered Name field (`isSignUp && <Input>`) wasn't visible in `snapshot -i` output, so it couldn't be targeted via refs.

4. **Credential mismatch** — The existing test account (`dredd@mega-city.one`) had a password set in a previous session. Since Better Auth persists to a SQLite DB (even though the app store is in-memory), the account survived server restarts with an unknown password.

5. **API-level verification** — Used `curl` to hit `/api/auth/sign-up/email` directly. Got `USER_ALREADY_EXISTS` for the original email. Created a new account with `dredd2@mega-city.one` via curl, then logged in successfully.

## Root Cause

Two separate issues:

1. **`fill` vs `type` for React controlled inputs**: `agent-browser fill` (Playwright's `locator.fill()`) sets the input value and dispatches `input`/`change` events, but React's synthetic event system may not reliably pick these up in all cases. The `type` command simulates individual keystrokes, which React's event delegation handles correctly.

2. **Stale test account credentials**: Better Auth stores user accounts in a SQLite database that persists across dev server restarts. The in-memory poll store resets, but auth accounts don't — leading to password mismatches when reusing hardcoded credentials.

## Solution

### 1. Create test accounts via the Better Auth API

```bash
curl -X POST http://localhost:3999/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{"name":"Juge Dredd","email":"test@mega-city.one","password":"password123"}'
```

This guarantees known credentials before starting the browser flow.

### 2. Use `type` instead of `fill` for React-controlled inputs

```bash
# Click to focus the field first
agent-browser click @e2

# Type character-by-character (triggers React onChange)
agent-browser type @e2 "test@mega-city.one"

# Same for password
agent-browser click @e3
agent-browser type @e3 "password123"
```

### 3. Use `eval` for conditionally-rendered fields

When a field isn't visible in `snapshot -i` (e.g., the Name field only rendered in sign-up mode):

```bash
agent-browser eval 'const el = document.querySelector("input[placeholder*=\"Nom\"]"); el.focus(); el.value = "Juge Dredd"; el.dispatchEvent(new Event("input", {bubbles: true})); el.dispatchEvent(new Event("change", {bubbles: true}));'
```

### 4. Verify login success before proceeding

```bash
agent-browser wait 2500
agent-browser snapshot  # Check for authenticated UI elements
```

## Prevention Strategies

- **Always create fresh test accounts via API before recording sessions** — don't rely on accounts from previous sessions
- **Use `type` (not `fill`) for any React-controlled form** — this is the reliable path for triggering synthetic events
- **Take snapshots after each form interaction** to verify state changes propagated
- **Add `data-testid` attributes to conditionally-rendered fields** for reliable targeting
- **Document test account credentials** in a `.env.test` or test setup file

## Checklist for Video Recording Sessions

1. Restart dev server if needed (`pnpm dev`)
2. Create/verify test account via curl to `/api/auth/sign-up/email`
3. Open browser with `agent-browser open "http://localhost:3999"`
4. Set viewport: `agent-browser set viewport 1280 720`
5. Start recording: `agent-browser record start tmp/videos/demo.webm`
6. Navigate to login, use `type` (not `fill`) for form fields
7. Verify auth success via `snapshot` before continuing
8. Perform feature walkthrough with `wait 1000-2000` pauses between actions
9. Stop recording: `agent-browser record stop`
10. Convert: `ffmpeg -y -i demo.webm -c:v libx264 -crf 23 -pix_fmt yuv420p -movflags +faststart demo.mp4`

## Cross-References

- [Better Auth implementation plan](../../plans/2026-02-21-feat-usability-auth-sharing-mobile-plan.md) — Auth setup, security hardening, `ENABLE_TEST_AUTH` guard
- [E2E testing plan](../../plans/2026-02-17-feat-e2e-tests-playwright-plan.md) — Test seeding API, Playwright config
- [Playwright config](../../playwright.config.ts) — Auth setup project, storageState pattern
- CLAUDE.md — Dev server port 3999, MCP testing workflow
