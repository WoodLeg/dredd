---
title: "refactor: Revert Google OAuth to admin token approach"
type: refactor
status: completed
date: 2026-02-17
---

# refactor: Revert Google OAuth to admin token approach

## Context

Google OAuth (Auth.js v5) was added to restrict access to @rockfi.fr accounts, replacing the original admin-token system. This proved over-engineered: beta dependency, Google Cloud setup, domain lock, 3-layer auth checks — all for a simple voting app. Reverting to the admin-token approach from `docs/plans/2026-02-16-feat-poll-closing-with-admin-link-plan.md`.

## Changes

### Phase 1 — Backend (types, store, schemas, actions)

**`src/lib/types.ts`**
- `Vote`: replace `voterEmail` + `voterDisplayName` with `voterName: string`
- `Poll`: replace `ownerEmail` with `adminToken: string`, add `closedAt?: number`

**`src/lib/store.ts`**
- Add `import { timingSafeEqual } from "node:crypto"` and `tokensMatch` helper
- Replace `validateOwner(pollId, email)` with `validateAdmin(pollId, adminToken)` using timing-safe compare
- `addVote`: change email dedup to name dedup (`v.voterName === vote.voterName`)
- `closePoll`: change signature from `(pollId, ownerEmail)` to `(pollId, adminToken)`, use `tokensMatch`

**`src/lib/schemas.ts`**
- `voteSchema`: add `voterName: z.string().min(1).max(100).transform(v => v.trim())`
- `closePollSchema`: add `adminToken: z.string().min(1)`

**`src/lib/actions.ts`**
- Remove `import { auth } from "@/auth"` and all `auth()` session checks
- `createPollAction`: generate `adminToken = nanoid(32)`, store on poll, return `{ id, adminToken }`
- `submitVoteAction`: read `voterName` from validated input (not session), pass `{ voterName, grades }` to `addVote`
- `closePollAction`: read `{ pollId, adminToken }` from input (not session), pass to `closePoll`

### Phase 2 — Frontend (components, pages, admin route)

**`src/components/admin-panel.tsx`** — Add `adminToken` prop, pass `{ pollId, adminToken }` to `closePollAction`

**`src/components/poll-form.tsx`** — `CreatedPoll` type gets `adminToken`, add `AdminLinkDisplay` sub-component showing `/poll/[id]/admin/[token]` with copy button, store token in `localStorage` as `admin_${id}`

**`src/components/vote-form.tsx`** — Remove `voterDisplayName` prop, add `voterName` `<Input>` with `register("voterName")`, add `localStorage.setItem(`voted_${pollId}`, "1")` after success

**`src/components/page-layout.tsx`** — Remove `adminHref` prop, admin link, and `UserMenu` import

**`src/app/poll/[id]/page.tsx`** — Remove `auth()`, just fetch poll + pass `pollData` to client

**`src/app/poll/[id]/poll-page-client.tsx`** — Remove `hasVoted`/`voterDisplayName`/`isOwner` props, restore localStorage voted detection via `useState` + `useEffect` (conditional render, NOT router.replace — per `docs/solutions/logic-errors/localstorage-redirect-blocks-voters.md`)

**`src/app/poll/[id]/results/page.tsx`** — Remove `auth()` and `isOwner`

**`src/app/poll/[id]/results/results-page-client.tsx`** — Remove `isOwner` prop and `adminHref`

**Admin route restructure:**
- Delete `src/app/poll/[id]/admin/page.tsx` and `admin-page-client.tsx`
- Create `src/app/poll/[id]/admin/[token]/page.tsx` — validates token against `poll.adminToken`
- Create `src/app/poll/[id]/admin/[token]/admin-page-client.tsx` — passes `adminToken` to `AdminPanel`

**`src/app/layout.tsx`** — Remove `SessionProvider` import and wrapper

### Phase 3 — Cleanup

**Delete 5 files:**
- `src/auth.ts`
- `src/proxy.ts`
- `src/app/api/auth/[...nextauth]/route.ts` (+ empty dirs)
- `src/app/login/page.tsx` (+ dir)
- `src/components/user-menu.tsx`

**`next.config.ts`** — Remove `https://accounts.google.com` from CSP `connect-src` and `frame-src`

**`package.json`** — Remove `"next-auth"` dependency, run `pnpm install`

## Verification

```bash
pnpm build    # No TypeScript errors
pnpm lint     # No new warnings
```
