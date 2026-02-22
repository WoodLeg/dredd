# Brainstorm: Poll Creator Dashboard ("Mes Dossiers")

**Date:** 2026-02-22
**Status:** Complete
**Feature area:** Poll management — creator experience

## What We're Building

A dedicated dashboard page at `/dashboard` where authenticated poll creators can see all their polls in one place. Each poll displays as a rich card with title, status (open/closed), vote count, mini majority judgment results bars, share link, and last activity timestamp. Polls are listed in simple reverse chronological order (most recent first).

The page is a Server Component that reads directly from the in-memory store — no client-side fetching, no real-time updates. Data reflects the state at page load time.

Navigation: a link in the site header (visible when authenticated) takes users to the dashboard.

## Why This Approach

- **Server Component first** — aligns with project conventions, no unnecessary client JS
- **Direct store access** — no API layer needed, reads poll data server-side
- **Static snapshot** — simplest model, avoids polling/SSE complexity
- **Separate route** — gives room for future features (filters, search, bulk actions) without cramming into a panel or dropdown
- **Foundation for admin features** — once polls are listed, adding edit/delete/preview actions is incremental

## Key Decisions

| Decision | Choice | Reasoning |
|----------|--------|-----------|
| Page location | `/dashboard` (separate route) | Dedicated space, bookmarkable, room to grow |
| Rendering | Server Component | No interactivity needed for the list itself |
| Data freshness | Static (page load snapshot) | Simplicity; manual refresh acceptable |
| Organization | Reverse chronological, flat list | Simple, no filtering/grouping overhead |
| Card content | Title, status badge, vote count, mini results bars, share link, timestamp | Rich enough to be useful without visiting each poll |
| Persistence | In-memory (unchanged) | Dashboard works within server session; persistence is a separate future decision |
| Auth guard | Required — redirect unauthenticated users | Dashboard is personal; only shows polls created by the logged-in user |

## Scope Boundaries

**In scope:**
- New `/dashboard` route with auth guard
- Poll card component with mini results visualization
- Store query: "get all polls by creator ID"
- Header navigation link (authenticated users only)
- Empty state when no polls exist
- Dystopian theming ("Mes Dossiers", "Audiences", etc.)

**Out of scope (future work):**
- Edit/delete polls from dashboard
- Real-time updates
- Filtering, search, or status grouping
- Persistence layer
- Admin results preview before closing

## Open Questions

None — all questions resolved during brainstorming.
