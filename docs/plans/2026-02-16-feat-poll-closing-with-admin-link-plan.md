---
title: "feat: Poll closing with secret admin link"
type: feat
status: completed
date: 2026-02-16
---

# feat: Poll closing with secret admin link

## Overview

Results should only be visible after the poll owner closes it. The owner is identified via a secret admin link generated at poll creation time. After voting, voters see only a confirmation — no results until the owner closes the poll.

## Problem Statement / Motivation

Currently, results are visible immediately at `/poll/[id]/results` — anyone can see them at any time. This creates two problems:

1. **Anchoring bias**: Early voters' choices are visible, potentially influencing later voters
2. **No owner control**: The poll creator has no way to manage the poll lifecycle

## Proposed Solution

### New poll lifecycle

```
Create poll → Owner gets admin link + voter link
                ↓
Poll is OPEN → Voters vote → See "vote recorded" confirmation
                ↓
Owner visits admin link → Clicks "Close poll"
                ↓
Poll is CLOSED → Results visible to everyone → No more votes accepted
```

### Key design decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Owner identification | Secret admin link with 32-char nanoid token | No auth needed, consistent with existing nanoid usage |
| Admin URL format | `/poll/[id]/admin/[token]` | Path param, not query param — cleaner URLs, no accidental logging |
| Post-vote UX | "Votre vote a bien été enregistré" — no results link | Prevents result leaking before close |
| Reopen after close | No | Simplicity; voters who saw results would be biased |
| Lost admin link recovery | None (document as limitation) | No email/auth system to support recovery |
| Admin token length | `nanoid(32)` | ~190 bits of entropy, brute-force infeasible |

## Technical Approach

### Data model changes

```typescript
// src/lib/types.ts — modify Poll interface
export interface Poll {
  id: string;
  question: string;
  candidates: string[];
  votes: Vote[];
  createdAt: number;
  cachedResults?: PollResults;
  adminToken: string;      // NEW — 32-char nanoid
  isClosed: boolean;       // NEW — defaults to false
  closedAt?: number;       // NEW — timestamp when closed
}

// src/lib/types.ts — modify PollData (public view)
export interface PollData {
  id: string;
  question: string;
  candidates: string[];
  voterCount: number;
  isClosed: boolean;       // NEW
}
```

### Store changes

```typescript
// src/lib/store.ts — new function
export type ClosePollResult =
  | { success: true }
  | { success: false; error: string };

export function closePoll(pollId: string, adminToken: string): ClosePollResult {
  const poll = polls.get(pollId);
  if (!poll) return { success: false, error: "Sondage introuvable" };
  if (poll.adminToken !== adminToken) return { success: false, error: "Lien administrateur invalide" };
  if (poll.isClosed) return { success: false, error: "Ce vote est déjà fermé" };
  poll.isClosed = true;
  poll.closedAt = Date.now();
  return { success: true };
}

// src/lib/store.ts — modify addVote (add closed check)
// After the `if (!poll)` check:
if (poll.isClosed) return { success: false, error: "Ce vote est fermé" };
```

### API route changes

#### Modified: `POST /api/polls` (`src/app/api/polls/route.ts`)
- Generate `adminToken: nanoid(32)` alongside the poll ID
- Store it on the poll object with `isClosed: false`
- Return `{ id, adminToken }` in response

#### Modified: `GET /api/polls/[id]` (`src/app/api/polls/[id]/route.ts`)
- Add `isClosed: poll.isClosed` to the response

#### Modified: `POST /api/polls/[id]/vote` (`src/app/api/polls/[id]/vote/route.ts`)
- Check `poll.isClosed` before accepting vote, return 409 if closed

#### Modified: `GET /api/polls/[id]/results` (`src/app/api/polls/[id]/results/route.ts`)
- Check `poll.isClosed` — if not closed, return 403 with error message
- Exception: if `adminToken` query param matches, allow results preview

#### New: `POST /api/polls/[id]/close` (`src/app/api/polls/[id]/close/route.ts`)
- Accepts `{ adminToken }` in body
- Validates token against stored `poll.adminToken`
- Sets `isClosed = true`, `closedAt = Date.now()`
- Returns `{ success: true }`

### Page/component changes

#### Modified: `src/components/poll-form.tsx`
- After successful creation, show **two links**:
  1. Voter link: `/poll/[id]` (with copy button)
  2. Admin link: `/poll/[id]/admin/[token]` (with copy button + warning to save it)
- Store `adminToken` in `localStorage` as `admin_${pollId}` for convenience

#### Modified: `src/components/vote-form.tsx`
- After voting, do NOT redirect to results
- Stay on poll page, show confirmation message: "Votre vote a bien été enregistré"

#### Modified: `src/app/poll/[id]/page.tsx`
- **Already voted + poll open**: Show "Votre vote a bien été enregistré. Les résultats seront disponibles quand l'organisateur fermera le vote."
- **Already voted + poll closed**: Show "Votre vote a bien été enregistré" + link to results
- **Not voted + poll closed**: Show "Ce vote est fermé" + link to results
- **Not voted + poll open**: Show vote form (current behavior)

#### Modified: `src/app/poll/[id]/results/page.tsx`
- If API returns 403, show: "Les résultats seront disponibles quand l'organisateur fermera le vote." + link back to poll

#### New: `src/app/poll/[id]/admin/[token]/page.tsx`
- Validates token against API
- **Poll open**: Shows vote count + "Fermer le vote" button
- **Poll closed**: Shows "Vote fermé" status + link to results
- Reuses `ShareLink` component for the voter link

#### New: `src/components/admin-panel.tsx`
- Poll question display
- Current vote count
- "Fermer le vote" button (with confirmation)
- Share voter link
- Link to results (if closed)

### Page state matrix

| Route | Poll open, not voted | Poll open, voted | Poll closed |
|-------|---------------------|------------------|-------------|
| `/poll/[id]` | Vote form | "Vote enregistré, résultats bientôt" | "Vote fermé" + results link |
| `/poll/[id]/results` | "Résultats pas encore disponibles" | Same | Full results |
| `/poll/[id]/admin/[token]` | Vote count + close button | Same | "Fermé" + results link |

## Implementation Phases

### Phase 1: Data model + store + API
- [x] Add `adminToken`, `isClosed`, `closedAt` to `Poll` interface in `src/lib/types.ts`
- [x] Add `isClosed` to `PollData` interface in `src/lib/types.ts`
- [x] Add `closePoll` function to `src/lib/store.ts`
- [x] Add closed check to `addVote` in `src/lib/store.ts`
- [x] Generate `adminToken` in `POST /api/polls` route (`src/app/api/polls/route.ts`)
- [x] Return `adminToken` in poll creation response
- [x] Add `isClosed` to `GET /api/polls/[id]` response (`src/app/api/polls/[id]/route.ts`)
- [x] Add closed guard to `GET /api/polls/[id]/results` (`src/app/api/polls/[id]/results/route.ts`)
- [x] Add closed guard to `POST /api/polls/[id]/vote` (`src/app/api/polls/[id]/vote/route.ts`)
- [x] Create `POST /api/polls/[id]/close` route (`src/app/api/polls/[id]/close/route.ts`)

### Phase 2: Admin page
- [x] Create admin page at `src/app/poll/[id]/admin/[token]/page.tsx`
- [x] Create `AdminPanel` component at `src/components/admin-panel.tsx`
- [x] Admin page validates token via API call
- [x] Shows vote count + close button when open
- [x] Shows closed status + results link when closed

### Phase 3: Update voter flows
- [x] Update `src/components/poll-form.tsx` — show admin link after creation
- [x] Update `src/components/vote-form.tsx` — don't redirect to results after voting
- [x] Update `src/app/poll/[id]/page.tsx` — handle all 4 states (open/closed x voted/not-voted)
- [x] Update `src/app/poll/[id]/results/page.tsx` — handle 403 when poll not closed

## Acceptance Criteria

- [x] Poll creation returns an admin token alongside the poll ID
- [x] Admin link `/poll/[id]/admin/[token]` shows control panel
- [x] Owner can close poll from admin panel
- [x] Closed poll rejects new votes with error message
- [x] Results page returns 403 when poll is open
- [x] Results page shows full results when poll is closed
- [x] After voting, voter sees confirmation — no results link while poll is open
- [x] After voting + poll closed, voter sees results link
- [x] Visiting `/poll/[id]` on a closed poll shows "fermé" + results link
- [x] Invalid admin token returns error, not results
- [x] Build passes with no TypeScript errors

## Files Summary

**Modified files (8):**
1. `src/lib/types.ts` — Add fields to Poll and PollData
2. `src/lib/store.ts` — Add `closePoll`, modify `addVote`
3. `src/app/api/polls/route.ts` — Generate and return adminToken
4. `src/app/api/polls/[id]/route.ts` — Add isClosed to response
5. `src/app/api/polls/[id]/vote/route.ts` — Reject votes on closed polls
6. `src/app/api/polls/[id]/results/route.ts` — Guard results behind closed check
7. `src/components/poll-form.tsx` — Show admin link after creation
8. `src/components/vote-form.tsx` — Remove results redirect after voting

**Modified pages (2):**
1. `src/app/poll/[id]/page.tsx` — Handle open/closed x voted/not-voted states
2. `src/app/poll/[id]/results/page.tsx` — Handle 403 when not closed

**New files (3):**
1. `src/app/api/polls/[id]/close/route.ts` — Close poll endpoint
2. `src/app/poll/[id]/admin/[token]/page.tsx` — Admin page
3. `src/components/admin-panel.tsx` — Admin panel component

## References

- Current poll model: `src/lib/types.ts:15-22`
- Current store: `src/lib/store.ts:1-44`
- Poll creation API: `src/app/api/polls/route.ts:6-53`
- Results API: `src/app/api/polls/[id]/results/route.ts:1-29`
- Vote form: `src/components/vote-form.tsx:33-66`
- Poll page: `src/app/poll/[id]/page.tsx:1-101`
- Results page: `src/app/poll/[id]/results/page.tsx:1-103`
- nanoid usage: `src/app/api/polls/route.ts:39`
