# Google OAuth Authentication (@rockfi.fr only)

**Date:** 2026-02-16
**Status:** Abandoned
**Feature:** Add Google OAuth authentication restricted to @rockfi.fr email addresses
**Abandoned reason:** Over-engineered for the app's needs. The admin-token approach from the poll-closing plan is simpler, has no external dependencies, and doesn't lock the app to a single domain. Reverting to secret admin links with nanoid tokens.

---

## What We're Building

A Google OAuth authentication layer for the Dredd voting app that:

- **Gates all access** behind @rockfi.fr Google account login (create, vote, view results, close polls)
- **Replaces admin tokens** with email-based poll ownership (the creator's Google email owns the poll)
- **Replaces voter name input** with automatic Google account identity (one vote per Google account)
- **Redirects unauthenticated users** to a dedicated login page, then back to their original URL
- **Blocks non-rockfi.fr accounts** at the Google OAuth level using the `hd` parameter (users never reach the app)

## Why This Approach

**Auth.js v5 (NextAuth)** was chosen over custom OAuth or managed services because:

- Battle-tested library with native Google provider and `hd` parameter support
- First-class Next.js App Router + middleware integration
- Built-in session management (JWT-based, no database needed — fits the in-memory architecture)
- No vendor lock-in, no recurring costs
- Active community and security patches

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Auth scope | Everything (create, vote, results, close) | Full lockdown — only @rockfi.fr users can access any feature |
| Auth library | Auth.js v5 | Mature, Google provider built-in, good Next.js integration |
| Domain restriction | Google `hd` parameter | Blocks non-rockfi.fr at OAuth level, cleanest UX |
| Poll ownership | Creator's email | Replaces admin token URLs — simpler, more secure |
| Voter identity | Google account | Auto-dedup by email, removes manual name field |
| Login UX | Dedicated `/login` page | Middleware redirects all unauthenticated requests to `/login` with callback URL |
| Session strategy | JWT (stateless) | No database needed — consistent with in-memory architecture |

## Impact on Existing Features

### Poll Creation
- **Before:** Anonymous, returns admin token URL
- **After:** Requires login, stores creator email on poll, no admin token generated
- Poll creation form stays the same minus any admin URL display

### Voting
- **Before:** Voter types a name, dedup by name
- **After:** Voter identified by Google email/name, dedup by email, name field removed
- Vote form shows user's Google display name as "voting as"

### Admin / Closing
- **Before:** Access via `/poll/[id]/admin/[token]` URL with secret token
- **After:** Access via `/poll/[id]/admin` — server checks if logged-in user's email matches poll creator
- Admin token URL pattern removed entirely

### Results
- **Before:** Public when poll is closed
- **After:** Requires login (any @rockfi.fr user can view results of a closed poll)

## Data Model Changes

```typescript
// Poll type changes
interface Poll {
  id: string;
  question: string;
  candidates: string[];
  votes: Vote[];
  createdAt: number;
  cachedResults?: PollResults;
  // REMOVED: adminToken: string;
  ownerEmail: string;       // NEW: creator's Google email
  isClosed: boolean;
}

// Vote type changes
interface Vote {
  // REMOVED: voterName: string;
  voterEmail: string;       // NEW: Google email
  voterDisplayName: string; // NEW: Google display name
  grades: Record<string, number>;
}
```

## New Files / Changes

- `src/auth.ts` — Auth.js configuration (Google provider, `hd` restriction, callbacks)
- `src/middleware.ts` — Route protection (redirect unauthenticated to `/login`)
- `src/app/login/page.tsx` — Dedicated login page with Google sign-in button
- `src/app/api/auth/[...nextauth]/route.ts` — Auth.js API route handler
- `src/lib/types.ts` — Updated Poll and Vote types
- `src/lib/store.ts` — Updated to use email-based ownership and voting
- `src/lib/actions.ts` — Updated server actions to read session, enforce ownership
- `src/app/poll/[id]/admin/` — Simplified (no more `[token]` segment)
- `src/components/vote-form.tsx` — Remove voter name field, show Google identity
- `src/components/admin-panel.tsx` — Remove admin token display
- `src/components/poll-form.tsx` — Remove admin link display after creation

## Open Questions

*None — all key decisions resolved during brainstorming.*
