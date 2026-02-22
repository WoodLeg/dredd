# Usability & Polish — Brainstorm

**Date:** 2026-02-21
**Status:** Decided
**Scope:** Auth, sharing, mobile grade UX

---

## What We're Building

Three feature pillars to improve usability, trust, and reach:

### 1. Google Authentication (Better Auth v1.4+ — Stateless Mode)

Full identity layer across the app. Every voter must sign in with Google to cast a verdict — one Google account = one vote per poll. Admin identity is also tied to Google sign-in, replacing the URL-embedded admin token.

- **Auth library:** Better Auth v1.4+ (stable, actively maintained) with Google OAuth social provider
- **Session mode:** Stateless JWE cookie sessions — no database required. Session data encrypted in a cookie, architecturally consistent with Dredd's in-memory-only approach.
- **Why not Auth.js v5:** Auth.js v5 has been in beta for years with no stable release. Active development has stopped; the project was absorbed by Better Auth. Auth.js v5 beta.30 works with Next.js 16 but is a dead-end dependency.
- **Why not in-memory SQLite:** Next.js App Router bundles Server Components and API Routes into separate module evaluation contexts. An in-memory DB instance in one context is invisible to the other — breaks auth completely.
- **Voter flow:** Sign in with Google before voting. The voter's Google user ID is stored per vote, enforcing one-vote-per-account server-side.
- **Admin flow:** Poll creator is authenticated. Admin panel access requires being the Google account that created the poll (no more shareable admin URLs).
- **Testing strategy:** Add a credentials-based test login alongside Google in dev/test environments only. Playwright and MCP browser tools log in via a simple form — no Google OAuth popup to navigate. Production keeps Google-only. This enables agent-browser and Playwright MCP interactive testing.

### 2. Sharing Upgrade (QR Codes + Open Graph)

Make it dead simple to share a poll link, both in-person and digitally.

- **QR codes:** Generate a styled QR code on the admin/share screen using `qr-code-styling`. Cyberpunk-themed: neon gradient dots, dark background, optional Dredd badge embedding. Client-side canvas rendering via `dynamic(() => import(...), { ssr: false })`.
- **Open Graph meta tags:** Dynamic OG title/description per poll page via `generateMetadata()`. Static Dredd-branded OG image shared across all polls. Rich preview cards on WhatsApp, Slack, iMessage, etc.

### 3. Mobile Grade UX — Suspect List + Bottom Drawer

Replace the inline 7-button grade row (too cramped on mobile) with:

1. **Suspect list:** Each candidate is a tappable row showing name + current grade (or "Non jugé").
2. **Bottom drawer:** Tapping a suspect opens a bottom sheet with all 7 grade buttons at full size. Select a grade, drawer closes, row updates with a `GradeBadge`.
3. **Submit:** Once all suspects have grades assigned, the submit button activates.

This pattern gives generous tap targets, keeps the main view clean, and scales to any number of candidates.

---

## Why These Approaches

| Decision | Reasoning |
|----------|-----------|
| Better Auth over Auth.js v5 | Actively maintained (v1.4.18 stable), stateless mode needs no DB, Next.js 16 compatible. Auth.js v5 is permanently beta with no development. |
| Stateless JWE cookies | No database, no schema, consistent with Dredd's in-memory architecture. Session data encrypted in cookie. |
| Mandatory auth (not optional) | Strongest deduplication guarantee. Acceptable friction for a voting app where integrity matters. |
| `qr-code-styling` for QR | Best styling options (gradients, dot shapes, logo embedding) for cyberpunk aesthetic. ~65-80KB gzip, stable API. |
| Static OG image | Simpler than dynamic generation. Poll question in OG text fields is sufficient for link previews. |
| QR + OG (not just one) | Different sharing contexts: QR for physical/in-person, OG for digital channels. Both are low-effort, high-impact. |
| Bottom drawer over grid/slider | Superior mobile pattern — avoids cramming 7 buttons into a narrow row. Familiar from mobile OS patterns (action sheets). |
| Credentials test login for E2E | Real Google OAuth is fragile in CI (CAPTCHAs, rate limits). A dev-only credentials flow lets Playwright/MCP fill a simple login form. Production stays Google-only. |

---

## Key Decisions

1. **Better Auth v1.4+ (stateless mode)** — no database, encrypted cookie sessions
2. **Auth is mandatory for voters** — no anonymous voting fallback
3. **Admin identity via Google** — replaces URL-based admin tokens
4. **`qr-code-styling`** — cyberpunk QR codes with gradient dots and logo embedding
5. **Static OG image + dynamic OG text** — per-poll `generateMetadata()` in Next.js
6. **Bottom drawer for mobile grades** — suspect list + sheet pattern
7. **Credentials-based test login for dev/test** — enables Playwright MCP and agent-browser testing
8. **Clean slate for migration** — in-memory store means no migration needed
9. **Vote deduplication by Google user ID** — server stores user ID per vote, rejects duplicates regardless of session state

---

## Resolved Questions

1. **Auth library choice** — Better Auth v1.4+ in stateless mode. Auth.js v5 is abandoned (permanently beta, absorbed by Better Auth). Better Auth's stateless mode needs no database.
2. **Existing polls migration** — Clean slate. The store is in-memory, so a server restart wipes everything. No migration needed.
3. **OG image** — Static Dredd-branded image for all polls. Poll question appears in OG title/description text fields.
4. **Testing with Playwright MCP / agent-browser** — Credentials-based test login in dev/test mode. Playwright fills a simple form. Works with MCP browser tools and agent-browser CLI.
5. **Sign-out behavior** — Server checks Google user ID per vote (not session state). Each vote stores the authenticated user's Google ID, and the server rejects duplicates by user ID.
6. **QR code library** — `qr-code-styling` for gradient fills, shaped dots, and logo embedding. Wrap in `dynamic()` for SSR compat.
7. **Auth.js v5 + Next.js 16 compat** — Moot. Switching to Better Auth which has stable Next.js 16 support.

---

## Implementation Order (Suggested)

1. **Google Auth (Better Auth)** — foundational, changes data model and all flows
2. **Mobile drawer** — improves the core voting experience
3. **Sharing (QR + OG)** — enhances distribution once the core flows are solid
