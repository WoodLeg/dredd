---
title: "feat: Add Google OAuth authentication restricted to @rockfi.fr"
type: feat
status: abandoned
date: 2026-02-16
brainstorm: docs/brainstorms/2026-02-16-google-oauth-rockfi-brainstorm.md
abandoned_reason: "Over-engineered. Reverting to admin-token approach from poll-closing plan."
---

# feat: Add Google OAuth Authentication (@rockfi.fr only)

## Overview

Add Google OAuth authentication using Auth.js v5 to the Dredd voting app, restricted to `@rockfi.fr` Google accounts. Every feature (create, vote, view results, close) requires authentication. Poll ownership is tied to the creator's email (replacing admin tokens), and voter identity comes from Google accounts (replacing the manual name field).

## Problem Statement / Motivation

The app is currently fully public — anyone can create polls, vote, and view results. For internal use at Rockfi, access must be restricted to `@rockfi.fr` team members only. Additionally, the current admin token URL system is fragile (tokens can be lost, shared accidentally, or leaked in browser history). Email-based ownership is simpler and more secure.

## Proposed Solution

Integrate **Auth.js v5** with the Google provider, using:
- Google's `hd` parameter to restrict the OAuth consent screen to `@rockfi.fr`
- Server-side `signIn` callback to validate the email domain (defense in depth)
- Next.js middleware/proxy to redirect unauthenticated users to `/login`
- JWT sessions (stateless, no database — fits the in-memory architecture)
- Email-based poll ownership and voter identity

## Technical Approach

### Architecture

```
User → proxy.ts (auth check) → /login (if unauthenticated) → Google OAuth → callback
                              → Page (if authenticated) → Server Action (session check) → Store
```

**Key principle:** Defense in depth. Auth is checked at 3 layers:
1. **Proxy/Middleware** — redirects unauthenticated requests to `/login`
2. **Server Components** — verify session + ownership before rendering
3. **Server Actions** — verify session before mutations (never trust the client)

### Data Model Changes

```typescript
// src/lib/types.ts

// BEFORE
interface Poll {
  id: string;
  question: string;
  candidates: string[];
  votes: Vote[];
  createdAt: number;
  cachedResults?: PollResults;
  adminToken: string;       // ← REMOVE
  isClosed: boolean;
}

interface Vote {
  voterName: string;        // ← REMOVE
  grades: Record<string, Grade>;
}

// AFTER
interface Poll {
  id: string;
  question: string;
  candidates: string[];
  votes: Vote[];
  createdAt: number;
  cachedResults?: PollResults;
  ownerEmail: string;       // ← NEW: creator's Google email
  isClosed: boolean;
}

interface Vote {
  voterEmail: string;       // ← NEW: Google email
  voterDisplayName: string; // ← NEW: Google display name
  grades: Record<string, Grade>;
}
```

### Implementation Phases

#### Phase 1: Auth.js Setup (Foundation)

Install and configure Auth.js v5 with Google provider. No existing features change yet.

**Tasks:**

- [x] Install `next-auth@beta` via pnpm
- [x] Generate `AUTH_SECRET` with `npx auth secret`
- [x] Create `.env.local` with `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`
- [x] Create `src/auth.ts` — Auth.js config with Google provider, `hd: "rockfi.fr"`, signIn callback for domain validation, custom `/login` page
- [x] Create `src/app/api/auth/[...nextauth]/route.ts` — Auth.js route handler
- [x] Create `src/proxy.ts` — protect all routes except `/login`, `/api/auth/*`, static assets
- [x] Create `src/app/login/page.tsx` — dedicated login page with Google sign-in button (French UI), error handling for rejected domains
- [x] Add `SessionProvider` wrapper in `layout.tsx`
- [x] Verify: `pnpm build` passes

**Files:**

```
NEW  src/auth.ts
NEW  src/app/api/auth/[...nextauth]/route.ts
NEW  src/middleware.ts (or proxy.ts)
NEW  src/app/login/page.tsx
MOD  src/app/layout.tsx (add SessionProvider)
MOD  package.json (add next-auth@beta)
NEW  .env.local (not committed)
```

<details>
<summary>src/auth.ts — Auth.js configuration</summary>

```typescript
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      authorization: {
        params: {
          hd: "rockfi.fr", // UI: restrict consent screen to @rockfi.fr
          prompt: "select_account",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      // Defense in depth: validate domain server-side
      if (account?.provider === "google") {
        return (
          profile?.email_verified === true &&
          profile?.email?.endsWith("@rockfi.fr") === true
        );
      }
      return false;
    },
    authorized: async ({ auth }) => {
      return !!auth;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
});
```

</details>

<details>
<summary>src/middleware.ts — Route protection</summary>

```typescript
// NOTE: Next.js 16 may require proxy.ts instead of middleware.ts
// Verify during implementation and adjust accordingly
import { auth } from "@/auth";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isLoginPage = req.nextUrl.pathname === "/login";
  const isAuthApi = req.nextUrl.pathname.startsWith("/api/auth");

  if (!isLoggedIn && !isLoginPage && !isAuthApi) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return Response.redirect(loginUrl);
  }

  // Redirect logged-in users away from login page
  if (isLoggedIn && isLoginPage) {
    return Response.redirect(new URL("/", req.url));
  }
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
```

</details>

<details>
<summary>src/app/login/page.tsx — Login page</summary>

```typescript
import { signIn } from "@/auth";
import { PageLayout } from "@/components/page-layout";

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  // Handle error display for rejected domains
  return (
    <PageLayout>
      <div className="flex flex-col gap-6 items-center text-center">
        <h1 className="text-3xl font-bold">Dredd</h1>
        <p className="text-muted">
          Connectez-vous avec votre compte Google @rockfi.fr
        </p>
        {/* Show error if non-@rockfi.fr user was rejected */}
        <form
          action={async () => {
            "use server";
            const params = await searchParams;
            await signIn("google", {
              redirectTo: params.callbackUrl || "/",
            });
          }}
        >
          <button type="submit">Se connecter avec Google</button>
        </form>
      </div>
    </PageLayout>
  );
}
```

</details>

#### Phase 2: Data Model & Store (Backend Changes)

Update types, store, schemas, and server actions to use email-based ownership and voting.

**Tasks:**

- [x] Update `src/lib/types.ts` — replace `adminToken` with `ownerEmail`, replace `voterName` with `voterEmail` + `voterDisplayName`
- [x] Update `src/lib/store.ts`:
  - Replace `validateAdmin(pollId, adminToken)` with `validateOwner(pollId, email)` (simple string comparison)
  - Update `addVote` duplicate check: `voterName` → `voterEmail` (case-insensitive)
  - Update `closePoll` to accept `ownerEmail` instead of `adminToken`
  - Remove `timingSafeEqual` import and `tokensMatch` helper
- [x] Update `src/lib/schemas.ts`:
  - Remove `voterName` from `voteSchema`
  - Remove `adminToken` from `closePollSchema`
- [x] Update `src/lib/actions.ts`:
  - All 3 actions: session check via `auth()`
  - `createPollAction`: set `ownerEmail`, return only `{ id }`
  - `submitVoteAction`: use session email/name
  - `closePollAction`: validate ownership via session
- [x] Verify: `pnpm build` passes

**Files:**

```
MOD  src/lib/types.ts
MOD  src/lib/store.ts
MOD  src/lib/schemas.ts
MOD  src/lib/actions.ts
```

#### Phase 3: Page & Component Updates (Frontend Changes)

Update all pages and components to work with the new auth-based system.

**Tasks:**

- [x] **Admin route restructure**: Moved `admin/[token]/` to `admin/`, session-based ownership check
- [x] **Admin panel**: Removed `adminToken` prop, updated `closePollAction` call
- [x] **Poll form**: Removed `AdminLinkDisplay`, shows admin link instead
- [x] **Vote form**: Removed name input, added "Vous votez en tant que" display via prop
- [x] **Poll page client**: Replaced localStorage with server-provided `hasVoted` prop
- [x] **Poll page server**: Gets session, checks hasVoted, passes voterDisplayName
- [x] **Results page**: Verified — no voter emails exposed
- [x] **Sign-out button**: Added `UserMenu` component to `PageLayout`
- [x] Verify: `pnpm build` passes

**Files:**

```
DEL  src/app/poll/[id]/admin/[token]/page.tsx
DEL  src/app/poll/[id]/admin/[token]/admin-page-client.tsx
NEW  src/app/poll/[id]/admin/page.tsx
NEW  src/app/poll/[id]/admin/admin-page-client.tsx (moved)
MOD  src/components/admin-panel.tsx
MOD  src/components/poll-form.tsx
MOD  src/components/vote-form.tsx
MOD  src/app/poll/[id]/page.tsx
MOD  src/app/poll/[id]/poll-page-client.tsx
MOD  src/app/poll/[id]/results/page.tsx (minor — ensure no email leak)
MOD  src/components/page-layout.tsx (or new user-menu component for sign-out)
```

#### Phase 4: Cleanup & Verification

- [x] Remove dead code: `timingSafeEqual`, `tokensMatch`, `AdminLinkDisplay` all removed
- [x] Remove `nanoid` usage for admin tokens (kept for poll IDs)
- [x] Run `pnpm build` — no TypeScript errors
- [x] Run `pnpm lint` — fixed unused Toast import (remaining warnings are pre-existing)
- [ ] Manual testing: full flow (login → create → vote → results → admin → close → sign out)

## Acceptance Criteria

### Functional Requirements

- [ ] Unauthenticated users are redirected to `/login` from any page
- [ ] Login page shows Google sign-in button with French text
- [ ] Only `@rockfi.fr` Google accounts can sign in (others blocked at OAuth level + server validation)
- [ ] Non-@rockfi.fr users see a clear French error message
- [ ] Authenticated users can create polls (ownership stored as email)
- [ ] Authenticated users can vote (identity from Google account, one vote per email)
- [ ] Vote form shows "Vous votez en tant que {name}" instead of name input
- [ ] Already-voted state detected server-side (no localStorage)
- [ ] Poll owner can access `/poll/[id]/admin` and close their poll
- [ ] Non-owners get "Accès refusé" on `/poll/[id]/admin`
- [ ] Users can sign out
- [ ] Session persists across page reloads (JWT cookie)
- [ ] Callback URL preserved: login redirects back to originally requested page

### Non-Functional Requirements

- [ ] `pnpm build` passes with no TypeScript errors
- [ ] `pnpm lint` passes
- [ ] No voter emails exposed in results UI
- [ ] French UI for all new text (login page, errors, user menu)
- [ ] Consistent with existing design system (Tailwind, Motion animations, UI components)

## Dependencies & Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Auth.js v5 still in beta | API changes possible | Pin exact version in package.json |
| `middleware.ts` vs `proxy.ts` in Next.js 16 | Wrong filename = middleware doesn't run | Verify during Phase 1, test immediately |
| Google OAuth requires registered redirect URIs | OAuth fails without proper config | Document setup steps, provide `.env.local.example` |
| In-memory store: server restart loses all data | Polls orphaned on restart | Acceptable per current architecture (no change) |
| `hd` parameter is UI-only | Non-rockfi.fr users could bypass UI | signIn callback validates server-side |
| No existing tests | Can't verify regression | Manual testing checklist in Phase 4 |

## References & Research

### Internal References
- Brainstorm: `docs/brainstorms/2026-02-16-google-oauth-rockfi-brainstorm.md`
- Store implementation: `src/lib/store.ts`
- Server Actions: `src/lib/actions.ts`
- Types: `src/lib/types.ts`

### External References
- [Auth.js v5 Installation](https://authjs.dev/getting-started/installation)
- [Auth.js Google Provider](https://authjs.dev/getting-started/providers/google)
- [Auth.js Protecting Routes](https://authjs.dev/getting-started/session-management/protecting)
- [Auth.js Environment Variables](https://authjs.dev/guides/environment-variables)
- [Google `hd` parameter discussion](https://github.com/nextauthjs/next-auth/discussions/266)
