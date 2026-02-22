# Jugement Majoritaire - Voting App Brainstorm

**Date:** 2026-02-15
**Status:** Draft

## What We're Building

A lightweight, shareable voting app using the **Jugement Majoritaire** (Majority Judgment) voting system. Users create polls, share a link with friends, and each voter grades every candidate on a 7-level scale. The app computes the median grade for each candidate and declares a winner.

**Target users:** Friends making informal group decisions (choosing restaurants, trip destinations, activities, etc.)

**Language:** French (entire UI)

## Why This Approach

### Voting System: Jugement Majoritaire

- Voters evaluate **every candidate** independently on a qualitative scale
- Each candidate's **median grade** determines their ranking
- **Tie-breaking:** remove one copy of the shared median from each tied candidate and recompute, repeat until resolved
- This avoids the flaws of plurality voting (vote splitting, strategic voting)

### Grading Scale (7 levels)

| Grade | Color (suggested) |
|-------|-------------------|
| Excellent | Deep green |
| Tres bien | Green |
| Bien | Light green |
| Assez bien | Yellow |
| Passable | Orange |
| Insuffisant | Red-orange |
| A rejeter | Red |

### Architecture: Next.js + API Routes + In-Memory Store

- **Next.js App Router** for pages and API routes
- **In-memory Map** as the data store (simple module-level variable)
- **Tailwind CSS** for styling (dark & sleek theme)
- **Motion** (framer-motion) for animations
- No database, no auth, no external dependencies beyond the stack

## Key Decisions

1. **Informal polls only** - No formal election features, no admin panel
2. **Name-only identity** - Voters enter their name to vote, no accounts
3. **Fixed 7-grade scale** - Excellent, Tres bien, Bien, Assez bien, Passable, Insuffisant, A rejeter
4. **Results visible after voting** - Each voter sees results immediately after casting their vote
5. **Votes are final** - No editing after submission
6. **Dark & sleek visual style** - Dark backgrounds, accent colors, premium feel
7. **Shareable by URL** - Polls accessible via `/poll/[id]`
8. **In-memory storage** - Data lost on restart (acceptable for informal use)

## User Flow

### Flow 1: Create a Poll
1. User lands on home page
2. Enters poll question (e.g., "Ou mange-t-on ce soir ?")
3. Adds candidates/options (e.g., "Pizza", "Sushi", "Burger")
4. Clicks "Creer le vote"
5. Gets a shareable link + sees a page to share it

### Flow 2: Vote
1. Voter opens shared link
2. Enters their name
3. Sees all candidates with the 7-grade scale
4. Assigns a grade to each candidate
5. Submits vote
6. Redirected to results page

### Flow 3: View Results
1. Shows each candidate with their median grade (highlighted)
2. Shows grade distribution as a stacked bar chart
3. Winner is highlighted at the top with an animation
4. Ranking of all candidates from best to worst

## Pages / Routes

| Route | Purpose |
|-------|---------|
| `/` | Home - create a new poll |
| `/poll/[id]` | Vote on a poll (or see results if already voted) |
| `/poll/[id]/results` | Results page |

## API Routes

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/polls` | POST | Create a new poll |
| `/api/polls/[id]` | GET | Get poll data |
| `/api/polls/[id]/vote` | POST | Submit a vote |
| `/api/polls/[id]/results` | GET | Get computed results |

## Data Model (In-Memory)

```typescript
interface Poll {
  id: string
  question: string
  candidates: string[]
  votes: Vote[]
  createdAt: Date
}

interface Vote {
  voterName: string
  grades: Record<string, Grade>  // candidateName -> grade
}

type Grade = 'excellent' | 'tres-bien' | 'bien' | 'assez-bien' | 'passable' | 'insuffisant' | 'a-rejeter'
```

## Tech Stack

- **Next.js 16** (App Router)
- **TypeScript**
- **Tailwind CSS v4** (dark theme)
- **Motion** (framer-motion) for animations
- **nanoid** for generating poll IDs

## Open Questions

_None - all key decisions have been made._
