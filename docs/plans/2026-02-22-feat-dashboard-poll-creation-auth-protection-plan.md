---
title: "feat: Dashboard poll creation with route auth protection"
type: feat
status: completed
date: 2026-02-22
---

# Dashboard Poll Creation with Route Auth Protection

## Overview

Move poll creation from the public home page (`/`) into the authenticated dashboard (`/dashboard`). Introduce Next.js middleware for centralized route protection. Only the results page (`/poll/[id]/results`), landing page (`/`), `/le-code`, and `/login` remain publicly accessible.

## Problem Statement / Motivation

Currently, poll creation lives at `/` — a public page with no server-side auth check. The auth wall only triggers at form submission (`createPollAction` calls `getRequiredSession()`), meaning unauthenticated users fill out the entire form before being told to log in. Additionally, route protection is scattered across individual page components with no centralized enforcement.

The dashboard already exists but only lists polls. It should be the central hub for poll management, including creation.

## Proposed Solution

Three coordinated changes:

1. **Landing page** — `/` becomes a public marketing/explainer page. Authenticated users are server-side redirected to `/dashboard`.
2. **Dashboard as creation hub** — `PollForm` moves into `/dashboard`, displayed above the poll list (or as the primary content when no polls exist).
3. **Middleware auth** — New `src/middleware.ts` enforces authentication on all routes except an explicit public allowlist.

## Access Control Model

| Route | Auth | Notes |
|---|---|---|
| `/` | Public | Landing page. Server-side redirect to `/dashboard` if authenticated. |
| `/login` | Public | OAuth + test credentials |
| `/le-code` | Public | Explainer page |
| `/poll/[id]/results` | Public | Results of closed polls |
| `/api/*` | Pass-through | API routes have their own guards (`better-auth`, env-var checks) |
| `/_next/*`, `/favicon.ico`, etc. | Pass-through | Static assets |
| `/dashboard` | **Auth required** | Poll creation + poll list |
| `/poll/[id]` | **Auth required** | Vote page |
| `/poll/[id]/admin` | **Auth required** + ownership | Admin panel |

## Technical Approach

### 1. Middleware (`src/middleware.ts`) — NEW

```typescript
// Public route allowlist
const PUBLIC_PATHS = ["/", "/login", "/le-code"];
const PUBLIC_PREFIXES = ["/api/", "/_next/", "/poll/"];
// /poll/* is partially public — only /poll/[id]/results is truly public,
// but middleware passes all /poll/* through; per-page checks handle the rest.

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp3|woff2?|css|js)$).*)"],
};
```

**Behavior:**
- GET requests to protected routes → `redirect("/login?callbackUrl=<path+search>")`
- Non-GET requests (server actions, API calls) → pass through (they have their own `getRequiredSession()` checks)
- Session check via `auth.api.getSession({ headers })` — uses cookie cache (JWE), cheap on hit

**Design decision — `/poll/*` pass-through in middleware:** Rather than parsing dynamic segments in middleware to distinguish `/poll/[id]` from `/poll/[id]/results`, pass all `/poll/*` routes through middleware. The vote page (`/poll/[id]/page.tsx`) and admin page (`/poll/[id]/admin/page.tsx`) already have per-page auth checks that redirect correctly. This keeps middleware simple and the existing page-level checks act as the real enforcement for poll sub-routes.

**Alternative considered:** Regex matching `/poll/[^/]+/results` in middleware. Rejected — adds complexity, fragile with path changes, and per-page checks already work.

### 2. Landing Page (`src/app/page.tsx`) — MODIFY

Replace `PollForm` with a public landing page:

- Server-side session check: if authenticated, `redirect("/dashboard")`
- If not authenticated: hero section (keep existing DREDD branding + background), "Le Code" link, and a prominent login CTA
- Update `metadata` export for SEO (description should explain the app, not poll creation)

The redirect means authenticated users never see the landing page — they go straight to their dashboard.

### 3. Dashboard Page (`src/app/dashboard/page.tsx`) — MODIFY

Add `PollForm` to the dashboard:

- **When polls exist:** Add a "Ouvrir un dossier" CTA button at the top of the page that toggles/reveals the `PollForm` inline above the poll grid. Use Motion for expand/collapse animation.
- **When no polls (empty state):** Replace the current `DreddFullPage` empty state with the `PollForm` shown directly, preceded by a brief welcome message ("Ouvrez votre premier dossier").
- The form itself (`PollForm` component) is reused as-is with minor adjustments.

### 4. Dashboard Client (`src/app/dashboard/dashboard-page-client.tsx`) — MODIFY

- Accept an optional `showFormInitially` prop (true when no polls exist)
- Add collapsible form section at the top with a toggle button
- Wire the "Ouvrir un dossier" button to expand/reveal the form

### 5. PollForm (`src/components/poll-form.tsx`) — MODIFY

- Update auth expiry reconnect link: `callbackUrl` from `/` to `/dashboard`
- The form is now always rendered within an authenticated context (dashboard), so the `authExpired` fallback is a defense-in-depth case only (cookie cache stale while Redis session expired)

### 6. Login Page (`src/app/login/page.tsx`) — MODIFY

- Change `getSafeCallbackUrl` fallback from `/` to `/dashboard`
- After login with no explicit callbackUrl, users land on their dashboard instead of the landing page

### 7. Link Updates (various files) — MODIFY

All `href="/"` links that assume `/` is the poll creation page must be updated:

| File | Line | Current | New |
|---|---|---|---|
| `src/app/le-code/page.tsx` | ~332 | `href="/"` ("Ouvrir une audience") | `href="/dashboard"` |
| `src/app/not-found.tsx` | action `href` | `href="/"` ("Retour au Tribunal") | Keep as `/` (landing page is the correct "home") |
| `src/components/poll-form.tsx` | ~57 | `callbackUrl=/` | `callbackUrl=/dashboard` |
| `src/app/login/page.tsx` | ~7 | fallback `"/"` | fallback `"/dashboard"` |

### 8. UserBadge (`src/components/user-badge.tsx`) — NO CHANGE

Already has "Mes Dossiers" → `/dashboard` link in the dropdown. No changes needed.

## Acceptance Criteria

### Functional

- [x] `/` shows a public landing page with login CTA for unauthenticated users
- [x] `/` redirects authenticated users to `/dashboard`
- [x] `/dashboard` includes the poll creation form (toggle-able when polls exist, always visible when empty)
- [x] Poll creation from dashboard works end-to-end: submit → redirect to `/poll/[id]/admin`
- [x] `/poll/[id]/results` is accessible without authentication
- [x] `/poll/[id]` (vote) requires authentication — unauthenticated users redirected to `/login` with correct `callbackUrl`
- [x] `/poll/[id]/admin` requires authentication + ownership check
- [x] `/dashboard` requires authentication
- [x] `/le-code` remains publicly accessible
- [x] `/login` with no callbackUrl redirects to `/dashboard` after successful auth
- [x] Middleware preserves full path + search params in `callbackUrl`

### Non-Functional

- [x] Per-page auth checks remain as defense-in-depth alongside middleware
- [x] Middleware does not intercept non-GET requests (server actions)
- [x] Static assets, API routes, and Better Auth routes are not affected by middleware
- [x] E2E tests updated for poll creation at `/dashboard` instead of `/`

## Dependencies & Risks

**Dependencies:**
- Better Auth `auth.api.getSession()` works in middleware context (it does — uses cookie cache)
- Next.js 16 middleware API compatibility

**Risks:**
- **Vote link UX degradation**: Shared vote links (`/poll/[id]`) now show a login wall with zero context about the poll. Recipients don't know what they're authenticating for. This is the current behavior already (vote page is auth-gated), but moving creation to dashboard makes sharing the primary discovery channel. **Mitigation**: Flag as follow-up — consider showing poll question on the login redirect page or as a public preview before auth.
- **E2E test breakage**: Tests that navigate to `/` for poll creation will fail. Must be updated in this PR.
- **Cookie cache staleness**: Middleware may pass a user through on a stale cookie while the Redis session is expired. Server actions catch this. Documented, not actionable.

## Files to Create/Modify

| Action | File |
|---|---|
| **Create** | `src/middleware.ts` |
| Modify | `src/app/page.tsx` (landing page) |
| Modify | `src/app/dashboard/page.tsx` (add form) |
| Modify | `src/app/dashboard/dashboard-page-client.tsx` (form toggle UI) |
| Modify | `src/components/poll-form.tsx` (callbackUrl fix) |
| Modify | `src/app/login/page.tsx` (default callbackUrl) |
| Modify | `src/app/le-code/page.tsx` (CTA link) |
| Modify | `e2e/*.spec.ts` (poll creation route change) |

## References

### Internal

- Dashboard brainstorm: `docs/brainstorms/2026-02-22-poll-dashboard-brainstorm.md`
- Auth config: `src/lib/auth.ts`
- Store layer: `src/lib/store.ts`
- Server actions: `src/lib/actions.ts`
- Login page: `src/app/login/page.tsx`
- Documented auth gotcha: `docs/solutions/integration-issues/agent-browser-auth-react-controlled-inputs.md`
- React hooks lesson: `docs/solutions/logic-errors/react-hooks-and-state-machine-violations.md`

### Patterns

- Per-page auth check pattern: `src/app/dashboard/page.tsx:17-21`
- Server action auth guard: `src/lib/actions.ts` → `getRequiredSession()`
- DreddFullPage for blocking states: `src/components/ui/dredd-full-page.tsx`
