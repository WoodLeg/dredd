---
title: Jugement Majoritaire Voting App
type: feat
status: completed
date: 2026-02-15
---

# Jugement Majoritaire — Voting App

## Overview

A lightweight, shareable French-language voting app using the Jugement Majoritaire (Majority Judgment) system. Users create informal polls, share a link, and voters grade every candidate on a 7-level scale. The app computes median grades and declares a winner. Dark & sleek visual style with animations.

## Tech Stack

| Technology | Package | Version | Import |
|------------|---------|---------|--------|
| Next.js | `next` | 16.x | N/A (App Router) |
| TypeScript | `typescript` | 5.x | N/A |
| Tailwind CSS | `tailwindcss @tailwindcss/postcss` | v4.x | `@import "tailwindcss"` in CSS |
| Motion | `motion` | 12.x | `import { motion } from "motion/react"` |
| nanoid | `nanoid` | 5.x | `import { nanoid } from 'nanoid'` |

## Data Model

```typescript
// lib/types.ts

type Grade =
  | 'excellent'
  | 'tres-bien'
  | 'bien'
  | 'assez-bien'
  | 'passable'
  | 'insuffisant'
  | 'a-rejeter'

interface Vote {
  voterName: string
  grades: Record<string, Grade> // candidateName -> grade
}

interface Poll {
  id: string
  question: string
  candidates: string[]
  votes: Vote[]
  createdAt: number // Date.now()
}

interface CandidateResult {
  name: string
  medianGrade: Grade
  gradeDistribution: Record<Grade, number> // grade -> count
  rank: number
}

interface PollResults {
  pollId: string
  question: string
  ranking: CandidateResult[]
  totalVotes: number
}
```

## Grading Scale

| Key | Label (FR) | Color | Hex |
|-----|-----------|-------|-----|
| `excellent` | Excellent | Deep green | `#1b7d3a` |
| `tres-bien` | Très bien | Green | `#3fa34d` |
| `bien` | Bien | Light green | `#8bc34a` |
| `assez-bien` | Assez bien | Yellow | `#f0c929` |
| `passable` | Passable | Orange | `#f09a29` |
| `insuffisant` | Insuffisant | Red-orange | `#e85d3a` |
| `a-rejeter` | À rejeter | Red | `#d32f2f` |

Grades are ordered from best (index 0) to worst (index 6). The numeric index is used for median computation.

## Algorithm: Majority Judgment

```
1. For each candidate, collect all grades as numeric indices (0=Excellent, 6=À rejeter)
2. Sort the list of grade indices
3. Median = value at floor(n/2) where n = number of votes
   - If even count, take the lower (worse) of the two middle values
4. Candidate with the lowest median index (= best grade) wins

Tie-breaking (when two candidates share the same median):
5. Remove one instance of the median grade from each tied candidate
6. Recompute median for each
7. Repeat until tie breaks or all grades removed (then co-winners)
```

## Validation Rules

| Field | Min | Max | Required |
|-------|-----|-----|----------|
| Poll question | 1 char | 200 chars | Yes |
| Candidate name | 1 char | 80 chars | Yes |
| Number of candidates | 2 | 20 | Yes |
| Voter name | 1 char | 50 chars | Yes |
| All candidates graded | — | — | Yes (block submit otherwise) |

**Duplicate voter names:** Rejected — if a name already exists in the poll's votes, return error "Ce nom a déjà été utilisé."

**Duplicate candidate names:** Rejected at poll creation — names must be unique.

## Routes & Pages

| Route | Page | Purpose |
|-------|------|---------|
| `/` | `app/page.tsx` | Home — create a new poll |
| `/poll/[id]` | `app/poll/[id]/page.tsx` | Vote page (or redirect to results if already voted) |
| `/poll/[id]/results` | `app/poll/[id]/results/page.tsx` | Results page |

**"Already voted" detection:** Store `voted_<pollId>=<voterName>` in localStorage. If present, redirect from `/poll/[id]` to `/poll/[id]/results`.

## API Routes

| Endpoint | Method | Body / Params | Response |
|----------|--------|---------------|----------|
| `/api/polls` | POST | `{ question, candidates }` | `{ id, shareUrl }` |
| `/api/polls/[id]` | GET | — | `Poll` (without vote details) |
| `/api/polls/[id]/vote` | POST | `{ voterName, grades }` | `{ success: true }` |
| `/api/polls/[id]/results` | GET | — | `PollResults` |

**Error responses:** `{ error: string }` with appropriate HTTP status codes (400, 404, 409).

## File Structure

```
app/
├── layout.tsx              # Root layout (dark theme, fonts, metadata)
├── page.tsx                # Home — poll creation form
├── globals.css             # Tailwind import + custom theme vars
├── poll/
│   └── [id]/
│       ├── page.tsx        # Vote page
│       └── results/
│           └── page.tsx    # Results page
├── api/
│   └── polls/
│       ├── route.ts        # POST /api/polls
│       └── [id]/
│           ├── route.ts    # GET /api/polls/[id]
│           ├── vote/
│           │   └── route.ts # POST /api/polls/[id]/vote
│           └── results/
│               └── route.ts # GET /api/polls/[id]/results
lib/
├── types.ts                # TypeScript interfaces & types
├── store.ts                # In-memory poll store (Map)
├── grades.ts               # Grade definitions, labels, colors, ordering
├── majority-judgment.ts    # MJ algorithm (median + tie-breaking)
└── utils.ts                # Shared helpers (validation, etc.)
components/
├── poll-form.tsx           # Create poll form (question + candidates)
├── vote-form.tsx           # Voting interface (grade each candidate)
├── grade-badge.tsx         # Single grade pill/badge with color
├── results-card.tsx        # Single candidate result row
├── results-chart.tsx       # Stacked bar chart for grade distribution
├── share-link.tsx          # Copy-to-clipboard share component
└── ui/                     # Small reusable UI atoms
    ├── button.tsx
    ├── input.tsx
    └── toast.tsx
```

## Implementation Phases

### Phase 1: Project Setup

- [ ] Initialize Next.js 16 project with TypeScript, Tailwind CSS v4, App Router
- [ ] Install dependencies: `motion`, `nanoid`
- [ ] Configure dark theme in `globals.css` (dark background `#0a0a0b`, card surfaces `#18181b`, accent colors)
- [ ] Set up root layout with French `<html lang="fr">`, metadata, font (Inter or Geist)
- [ ] Create `lib/types.ts` with all TypeScript interfaces
- [ ] Create `lib/grades.ts` with grade definitions, labels, colors, ordering

**Files:** `package.json`, `app/layout.tsx`, `app/globals.css`, `lib/types.ts`, `lib/grades.ts`

### Phase 2: Core Logic

- [ ] Implement `lib/store.ts` — in-memory Map with `createPoll`, `getPoll`, `addVote`, `getVotes` functions
- [ ] Implement `lib/majority-judgment.ts` — median computation + tie-breaking algorithm
- [ ] Implement `lib/utils.ts` — validation helpers (question length, candidate count, voter name)
- [ ] Write all 4 API routes with proper validation and error handling

**Files:** `lib/store.ts`, `lib/majority-judgment.ts`, `lib/utils.ts`, `app/api/polls/route.ts`, `app/api/polls/[id]/route.ts`, `app/api/polls/[id]/vote/route.ts`, `app/api/polls/[id]/results/route.ts`

### Phase 3: UI Components

- [ ] Build reusable UI atoms (`button.tsx`, `input.tsx`, `toast.tsx`) — dark theme styled
- [ ] Build `grade-badge.tsx` — colored pill showing a grade label
- [ ] Build `share-link.tsx` — URL display + copy-to-clipboard button with toast feedback
- [ ] Build `poll-form.tsx` — question input + dynamic candidate list (add/remove) + submit
- [ ] Build `vote-form.tsx` — candidate rows with 7 grade radio buttons, submit button
- [ ] Build `results-card.tsx` — candidate name + median badge + rank
- [ ] Build `results-chart.tsx` — horizontal stacked bar showing grade distribution per candidate

**Files:** All `components/*.tsx`

### Phase 4: Pages & Integration

- [ ] Home page (`app/page.tsx`) — hero text explaining JM + poll creation form, animates in with Motion
- [ ] Vote page (`app/poll/[id]/page.tsx`) — fetch poll, show vote form, handle submit, redirect to results, localStorage tracking
- [ ] Results page (`app/poll/[id]/results/page.tsx`) — fetch results, animated ranking reveal, winner highlight, share link
- [ ] 404 / error handling — poll not found page with "Ce vote n'existe pas" message

**Files:** `app/page.tsx`, `app/poll/[id]/page.tsx`, `app/poll/[id]/results/page.tsx`

### Phase 5: Animations & Polish

- [ ] Page transition animations with Motion (fade-in / slide-up on mount)
- [ ] Winner reveal animation on results page (scale + glow effect)
- [ ] Grade selection micro-interaction (press feedback, color fill)
- [ ] Stacked bar chart animate-in (bars grow from left)
- [ ] Mobile responsive pass — ensure all views work on small screens
- [ ] Copy-to-clipboard toast animation
- [ ] Loading states for API calls

**Files:** Updates across all component and page files

## Error States

| Scenario | Behavior |
|----------|----------|
| Poll not found (invalid ID) | 404 page: "Ce vote n'existe pas" |
| Duplicate voter name | Toast error: "Ce nom a déjà été utilisé" |
| Incomplete grades | Submit button disabled until all candidates graded |
| Empty results (0 votes) | Results page shows "Aucun vote pour l'instant" with share link |
| Validation failures | Inline error messages in French |

## UI/UX Notes

- **Language:** Entire UI in French — all labels, buttons, messages, error texts
- **Theme:** Dark background (`#0a0a0b`), zinc card surfaces (`#18181b`), grade colors as accents
- **Typography:** System font stack or Geist Sans (bundled with Next.js)
- **Mobile-first:** Grade selection should be touch-friendly (large tap targets)
- **No explanation modal needed:** Grade labels are self-explanatory in French (Excellent → À rejeter)

## Acceptance Criteria

- [ ] User can create a poll with question + 2-20 candidates
- [ ] Poll generates a shareable URL (`/poll/[id]`)
- [ ] Voter enters name and grades every candidate on 7-level scale
- [ ] Duplicate voter names are rejected
- [ ] After voting, voter is redirected to results
- [ ] Results show correct median grade per candidate using MJ algorithm
- [ ] Tie-breaking works correctly when candidates share the same median
- [ ] Results show stacked bar chart of grade distribution
- [ ] Winner is highlighted with animation
- [ ] All UI text is in French
- [ ] Dark theme with grade-colored accents
- [ ] Works on mobile and desktop
- [ ] Copy-to-clipboard for sharing poll link

## References

- [Jugement Majoritaire — Mieux Voter](https://mieuxvoter.fr/en/le-jugement-majoritaire)
- [Majority Judgment — Electowiki](https://electowiki.org/wiki/Majority_Judgment)
- [Brainstorm document](../brainstorms/2026-02-15-jugement-majoritaire-brainstorm.md)
