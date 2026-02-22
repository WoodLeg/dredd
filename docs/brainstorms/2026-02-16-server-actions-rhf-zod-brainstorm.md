# Brainstorm: Server Actions + react-hook-form + Zod Refactor

**Date:** 2026-02-16
**Status:** Draft

## What We're Building

A refactor of all forms and data fetching in Dredd to use:
- **Zod schemas** as the single source of truth for validation
- **Server actions** calling the store directly (replacing API routes)
- **react-hook-form** with `@hookform/resolvers/zod` for client-side form state
- **Server components** for page-level data fetching (replacing `useEffect` + `fetch`)

## Why This Approach

The current codebase has significant boilerplate:
- 3 forms each with 4-6 `useState` calls for fields, errors, submitting state
- Copy-pasted `fetch` + try/catch/finally patterns across every component
- Duplicated `useEffect` data fetching on every page
- Manual validation functions alongside untyped `as` casts in API routes
- API routes that just proxy calls to the in-memory store

Server actions + RHF + Zod eliminates most of this:
- **Zod** replaces manual validation functions AND `as` casts — single schema validates and types
- **Server actions** call the store directly — no API routes, no fetch boilerplate, no JSON serialization
- **react-hook-form** manages form state, errors, submission — replaces 4-6 `useState` per form
- **Server components** fetch data at render time — no `useEffect`, no loading states for initial data

## Key Decisions

1. **Remove API routes entirely** — Server actions and server components call the store directly. The REST API is not needed externally.

2. **Replace all manual validators with Zod** — Schemas in `src/lib/schemas.ts` become the single source of truth. Remove validation functions from `utils.ts`.

3. **Use react-hook-form + @hookform/resolvers/zod** — Best DX for complex forms (PollForm has dynamic candidate fields). Adds 2 dependencies.

4. **Convert pages to server components** — Pages fetch data from the store directly and pass to client form components. Eliminates `useEffect` + loading state boilerplate.

5. **All three forms refactored** — PollForm, VoteForm, and AdminPanel all move to the new pattern.

## Scope

### Files to Create
- `src/lib/schemas.ts` — Zod schemas (poll creation, vote, admin)
- `src/lib/actions.ts` — Server actions (createPoll, submitVote, closePoll, getPoll, getResults)

### Files to Modify
- `src/components/poll-form.tsx` — RHF + Zod, call server action
- `src/components/vote-form.tsx` — RHF + Zod, call server action
- `src/components/admin-panel.tsx` — RHF + Zod, call server action
- `src/app/page.tsx` — Can stay client (it's the home/create page)
- `src/app/poll/[id]/page.tsx` — Server component, fetch poll data
- `src/app/poll/[id]/results/page.tsx` — Server component, fetch results
- `src/app/poll/[id]/admin/[token]/page.tsx` — Server component, fetch admin data
- `src/lib/utils.ts` — Remove validation functions
- `package.json` — Add zod, react-hook-form, @hookform/resolvers

### Files to Delete
- `src/app/api/polls/route.ts`
- `src/app/api/polls/[id]/route.ts`
- `src/app/api/polls/[id]/results/route.ts`
- `src/app/api/polls/[id]/close/route.ts`
- `src/app/api/polls/[id]/admin/route.ts`

## Architecture After Refactor

```
User visits page
  → Server component fetches data from store
  → Passes data to client form component
  → Client form uses react-hook-form + Zod for validation
  → On submit → server action → store → return result
  → RHF handles errors, loading, success automatically
```

## Open Questions

_None — all key decisions resolved during brainstorming._
