---
title: "feat: Poll Creator Dashboard (Mes Dossiers)"
type: feat
status: completed
date: 2026-02-22
---

# feat: Poll Creator Dashboard ("Mes Dossiers")

## Overview

A dedicated `/dashboard` route where authenticated poll creators see all their polls as rich cards in reverse chronological order. Server Component reads directly from the in-memory store — no client-side fetching, no real-time updates. Accessible via a "Mes Dossiers" link in the UserBadge dropdown.

## Problem Statement

Poll creators currently have no way to see all their polls in one place. After creating a poll, the only way back is through the admin link in the share flow. There's no persistent "home base" for a creator to review their past and active polls.

## Proposed Solution

Add a Server Component page at `/dashboard` that:
1. Auth-guards with redirect to `/login`
2. Queries a new `getPollsByOwner()` store function
3. Projects each `Poll` into a `DashboardPollData` type
4. Renders poll cards with title, status badge, vote count, winner info (closed polls only), share link, and timestamp
5. Shows an empty state via `DreddFullPage` when no polls exist

## Key Decisions (from brainstorm)

| Decision | Choice |
|----------|--------|
| Results bars | **Closed polls only** — open polls show vote count only, consistent with results page behavior |
| Card click | **Contextual** — open polls → `/poll/[id]/admin`, closed → `/poll/[id]/results` |
| Header nav | **Inside UserBadge dropdown** — new menu item above "Quitter le Tribunal" |
| Mini results | **Winner only** — top-ranked candidate with median grade badge + grade distribution bar |
| Sort order | `createdAt` descending (strict, no grouping) |
| Last activity | `closedAt ?? createdAt` (no schema changes) |
| Empty state | `DreddFullPage` with CTA to create a poll |

## Technical Approach

### Files to Create

#### `src/app/dashboard/page.tsx` — Server Component (main page)

Auth guard + data fetching + projection, following the exact pattern of `src/app/poll/[id]/admin/page.tsx`:

```tsx
// src/app/dashboard/page.tsx
import { ViewTransition } from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getPollsByOwner } from "@/lib/store";
import { computeResults } from "@/lib/majority-judgment";
import { DreddFullPage } from "@/components/ui/dredd-full-page";
import { DashboardClient } from "./dashboard-client";
import type { DashboardPollData } from "@/lib/types";

export const metadata = {
  title: "Mes Dossiers — Dredd",
  description: "Tableau de bord du Juge — Tous vos dossiers en un coup d'œil.",
};

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login?callbackUrl=/dashboard");
  }

  const polls = getPollsByOwner(session.user.id);

  if (polls.length === 0) {
    return (
      <ViewTransition>
        <DreddFullPage
          message="Aucun dossier enregistré"
          description="Votre casier judiciaire est vierge. Ouvrez votre première audience."
          action={{ label: "Ouvrir un dossier", href: "/" }}
        />
      </ViewTransition>
    );
  }

  const dashboardPolls: DashboardPollData[] = polls.map((poll) => {
    // Only compute results for closed polls with votes
    let winner: DashboardPollData["winner"] = undefined;
    if (poll.isClosed && poll.votes.length > 0) {
      const results = poll.cachedResults ?? computeResults(
        poll.id, poll.question, poll.candidates, poll.votes
      );
      const top = results.ranking[0];
      winner = {
        name: top.name,
        medianGrade: top.medianGrade,
        gradeDistribution: top.gradeDistribution,
      };
    }

    return {
      id: poll.id,
      question: poll.question,
      candidateCount: poll.candidates.length,
      voterCount: poll.votes.length,
      isClosed: poll.isClosed,
      createdAt: poll.createdAt,
      closedAt: poll.closedAt,
      winner,
    };
  });

  return (
    <ViewTransition>
      <DashboardClient polls={dashboardPolls} />
    </ViewTransition>
  );
}
```

#### `src/app/dashboard/dashboard-client.tsx` — Client Component (share link copy)

Minimal client component. The card layout itself is server-renderable, but the "copy share link" button needs clipboard API access, so the entire list is a client component (the client boundary is as low as possible — just the card list, not the page).

```tsx
// src/app/dashboard/dashboard-client.tsx
"use client";

import Link from "next/link";
import { useDreddFeedback } from "@/lib/dredd-feedback-context";
import { GradeBadge } from "@/components/grade-badge";
import { ResultsChart } from "@/components/results-chart";
import { PageLayout } from "@/components/page-layout";
import type { DashboardPollData } from "@/lib/types";

interface DashboardClientProps {
  polls: DashboardPollData[];
}

export function DashboardClient({ polls }: DashboardClientProps) {
  // Renders the poll card grid with share link copy buttons
  // Uses useDreddFeedback() for copy confirmation
  // Each card is a <Link> to admin (open) or results (closed)
}
```

#### `src/app/dashboard/loading.tsx` — Suspense fallback

```tsx
import { PageSkeleton } from "@/components/ui/page-skeleton";

export default function Loading() {
  return <PageSkeleton />;
}
```

### Files to Modify

#### `src/lib/types.ts` — Add `DashboardPollData`

```tsx
export interface DashboardPollData {
  id: string;
  question: string;
  candidateCount: number;
  voterCount: number;
  isClosed: boolean;
  createdAt: number;
  closedAt?: number;
  winner?: {
    name: string;
    medianGrade: Grade;
    gradeDistribution: Record<Grade, number>;
  };
}
```

#### `src/lib/store.ts` — Add `getPollsByOwner()`

```tsx
export function getPollsByOwner(ownerId: string): Poll[] {
  const owned: Poll[] = [];
  for (const poll of polls.values()) {
    if (poll.ownerId === ownerId) owned.push(poll);
  }
  // Reverse chronological (most recent first)
  owned.sort((a, b) => b.createdAt - a.createdAt);
  return owned;
}
```

Simple `Map` iteration with filter and sort. No index needed — `MAX_POLLS = 10,000` is trivially fast to iterate.

#### `src/components/user-badge.tsx` — Add "Mes Dossiers" dropdown item

Add a `<Link>` menu item between the user info section and the sign-out button:

```tsx
{/* Dashboard link — between user info and sign out */}
<div className="px-2 py-2 border-b border-border">
  <Link
    href="/dashboard"
    onClick={() => setOpen(false)}
    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neon-cyan hover:bg-neon-cyan/10 rounded-md transition-colors"
  >
    Mes Dossiers
  </Link>
</div>
```

Import `Link` from `next/link` at the top.

### Component Design: Poll Card

Each card is wrapped in a `<Link>` for contextual navigation:
- Open poll → `/poll/[id]/admin`
- Closed poll → `/poll/[id]/results`

Card layout:

```
┌──────────────────────────────────────────────┐
│ [OUVERTE] or [CLÔTURÉE]          il y a 3h   │
│                                               │
│ Question title (line-clamp-2)                 │
│                                               │
│ 12 dépositions · 5 suspects                  │
│                                               │
│ ┌─ Winner (closed only) ──────────────────┐  │
│ │ "Suspect Name"  [Exemplaire]            │  │
│ │ ▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░ (results bar)  │  │
│ └─────────────────────────────────────────┘  │
│                                               │
│ [📋 Copier le lien]                          │
└──────────────────────────────────────────────┘
```

- Status badge: green glow for open ("OUVERTE"), red glow for closed ("CLÔTURÉE")
- Question: `line-clamp-2` with `font-heading` style
- Stats line: vote count + candidate count
- Winner section (closed only): candidate name + `GradeBadge` + mini `ResultsChart`
- Share button: copies `{origin}/poll/{id}` to clipboard, shows `DreddFeedback` on success
- Timestamp: relative time using `Intl.RelativeTimeFormat('fr')` for < 7 days, absolute otherwise
- Card styling: `hud-card` class with `--hud-border` and `--hud-bg` custom properties

### Timestamp Utility

Add a small helper (no external dependency):

```tsx
// In dashboard-client.tsx or a shared util if needed later
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 7) {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "numeric", month: "short", year: "numeric"
    }).format(timestamp);
  }

  const rtf = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });
  if (days > 0) return rtf.format(-days, "day");
  if (hours > 0) return rtf.format(-hours, "hour");
  if (minutes > 0) return rtf.format(-minutes, "minute");
  return rtf.format(-seconds, "second");
}
```

## Acceptance Criteria

### Functional

- [x] `/dashboard` renders all polls owned by the authenticated user, sorted by `createdAt` desc
- [x] Unauthenticated users are redirected to `/login?callbackUrl=/dashboard`
- [x] Empty state shows `DreddFullPage` with "Aucun dossier enregistré" and CTA to create a poll
- [x] Each card shows: question, status badge, vote count, candidate count, relative timestamp
- [x] Closed polls with votes show the winner's name, `GradeBadge`, and `ResultsChart`
- [x] Open polls do **not** show results bars — only vote count
- [x] Clicking a card navigates to `/poll/[id]/admin` (open) or `/poll/[id]/results` (closed)
- [x] Share button copies poll URL to clipboard and triggers `DreddFeedback` confirmation
- [x] UserBadge dropdown includes "Mes Dossiers" link above "Quitter le Tribunal"
- [x] All text uses dystopian lexical field (Dossiers, Audiences, Dépositions, Suspects, etc.)

### Non-Functional

- [x] Page is a Server Component — no unnecessary client JS beyond the card list
- [x] `getPollsByOwner` handles empty result gracefully
- [x] Question text is truncated with `line-clamp-2` for layout consistency
- [x] Accessible: cards are keyboard-navigable links, share button has accessible label

### Testing

- [x] Unit test: `getPollsByOwner` returns correct polls sorted by `createdAt` desc
- [x] Unit test: `getPollsByOwner` returns empty array for unknown owner
- [ ] E2E: authenticated user sees dashboard with created polls
- [ ] E2E: unauthenticated user is redirected to login
- [ ] E2E: empty state shown when user has no polls
- [ ] E2E: card click navigates to correct page (admin vs results)

## Implementation Sequence

The build order matters — each step is independently testable:

1. **`src/lib/store.ts`** — Add `getPollsByOwner()` + unit tests
2. **`src/lib/types.ts`** — Add `DashboardPollData` interface
3. **`src/app/dashboard/page.tsx`** — Server component with auth guard, data projection, empty state
4. **`src/app/dashboard/dashboard-client.tsx`** — Card grid with all visual elements
5. **`src/app/dashboard/loading.tsx`** — Suspense fallback
6. **`src/components/user-badge.tsx`** — Add "Mes Dossiers" dropdown link
7. **E2E tests** — Full flow coverage

## References

### Internal

- Store pattern: `src/lib/store.ts`
- Data projection pattern: `src/app/poll/[id]/page.tsx:37-72`
- Admin auth guard: `src/app/poll/[id]/admin/page.tsx:13-39`
- Results computation: `src/lib/majority-judgment.ts:102-114`
- Results visualization: `src/components/results-chart.tsx`
- Grade badge: `src/components/grade-badge.tsx`
- Full-page blocking state: `src/components/ui/dredd-full-page.tsx`
- UserBadge dropdown: `src/components/user-badge.tsx:91-142`
- HUD card styling: `hud-card` class with `--hud-border`/`--hud-bg` CSS vars

### Brainstorm

- `docs/brainstorms/2026-02-22-poll-dashboard-brainstorm.md`

### Institutional Learnings

- Discriminated union types for polymorphic button: `docs/solutions/code-quality/full-app-review-security-testing-cleanup.md`
- Server Components + Suspense best practices: `docs/solutions/performance-issues/vercel-react-best-practices-audit-next16.md`
- React hooks purity / side-effects in render: `docs/solutions/logic-errors/react-hooks-and-state-machine-violations.md`
