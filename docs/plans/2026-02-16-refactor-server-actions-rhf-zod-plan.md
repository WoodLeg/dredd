---
title: "refactor: Server Actions + react-hook-form + Zod"
type: refactor
status: completed
date: 2026-02-16
brainstorm: docs/brainstorms/2026-02-16-server-actions-rhf-zod-brainstorm.md
---

# refactor: Server Actions + react-hook-form + Zod

## Overview

Replace the hand-rolled form management (manual `useState`, raw `fetch`, duplicated validation) with server actions, react-hook-form + Zod, and server components for data fetching. This eliminates ~80% of form/async boilerplate and removes all API routes.

## Problem Statement

Every form (PollForm, VoteForm, AdminPanel) repeats the same pattern: 4-6 `useState` calls, manual validation, `fetch` + try/catch/finally, error state management. Every page repeats: `useEffect` + `fetch` + `loading`/`notFound` states. Validation logic is duplicated between client components and API routes. API routes are thin wrappers around the in-memory store.

## Proposed Solution

| Concern | Current | After |
|---|---|---|
| Form state | Manual `useState` x5 per form | `useForm()` + `zodResolver` |
| Validation | `validateX()` functions in utils.ts | Zod schemas in `schemas.ts` |
| Mutations | `fetch POST /api/...` | Server actions calling store directly |
| Data fetching | `useEffect` + `fetch GET /api/...` | Server components calling store directly |
| Error handling | Manual `setError()` + Toast | RHF field errors + action return type |
| Loading states | Manual `useState(true)` | Server component streaming / `useFormStatus` |

## Technical Approach

### Architecture

```
┌─────────────────────────────────────────┐
│  Server Components (pages)              │
│  ─ Call store directly for reads        │
│  ─ Pass data as props to client children│
└──────────────┬──────────────────────────┘
               │ props
┌──────────────▼──────────────────────────┐
│  Client Components (forms)              │
│  ─ useForm() + zodResolver for state    │
│  ─ Call server actions for mutations    │
│  ─ Handle localStorage, animations     │
└──────────────┬──────────────────────────┘
               │ server action call
┌──────────────▼──────────────────────────┐
│  Server Actions (src/lib/actions.ts)    │
│  ─ Zod parse input                      │
│  ─ Call store functions                 │
│  ─ Return ActionResult<T>              │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│  Store (src/lib/store.ts) — unchanged   │
└─────────────────────────────────────────┘
```

### Key Design Decisions

**1. Server action return type**

All server actions return a discriminated union:

```typescript
// src/lib/types.ts
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; errors: Record<string, string[]> }  // Zod field errors
  | { success: false; error: string }                      // Business logic error
```

react-hook-form handles field errors via `setError()` in the `onSubmit` handler. Business logic errors (e.g., "Ce vote est fermé") display as a Toast.

**2. Reads vs. mutations**

- **Reads** (get poll, get results, validate admin): Direct store calls in server component bodies. Not server actions.
- **Mutations** (create poll, vote, close poll): Server actions in `src/lib/actions.ts` with `"use server"`.
- **Admin refresh**: `router.refresh()` from client component — re-triggers server component data fetching.

**3. localStorage + server components**

The poll page becomes a server component that fetches poll data and passes it to a `<PollPageClient>` client component. The client component checks `localStorage` for the "already voted" flag. A brief loading skeleton covers the hydration gap between server render and client-side localStorage check.

**4. Dynamic Zod schemas for vote grades**

The vote Zod schema validates the basic shape (`z.record(z.string(), gradeEnum)`). The server action then validates that grade keys match the poll's actual candidates after fetching the poll from the store. This two-step approach keeps schemas static and composable.

**5. createPoll returns data (no redirect)**

The `createPollAction` returns `{ id, adminToken }`. The PollForm component transitions to a success state showing share links — preserving current UX exactly.

**6. useFieldArray for dynamic candidates**

PollForm uses react-hook-form's `useFieldArray` for the candidates array. The Zod schema validates at both levels: individual candidate (non-empty, max 80 chars) and array (min 2, max 20, unique names via `.refine()`).

### Zod Schemas (`src/lib/schemas.ts`)

```typescript
// createPollSchema
{
  question: z.string().min(1, "La question est requise").max(200, "..."),
  candidates: z.array(
    z.object({ value: z.string().min(1, "...").max(80, "...") })
  ).min(2, "Il faut au moins 2 options").max(20, "20 options maximum")
   .refine(uniqueCaseInsensitive, "Les options doivent être uniques")
}

// voteSchema
{
  voterName: z.string().min(1, "Le nom est requis").max(50, "..."),
  grades: z.record(z.string(), gradeEnum)
}

// closePollSchema
{
  pollId: z.string(),
  adminToken: z.string().min(1)
}
```

### Server Actions (`src/lib/actions.ts`)

| Action | Input | Store calls | Returns |
|---|---|---|---|
| `createPollAction` | `CreatePollInput` | `createPoll()` | `ActionResult<{ id: string; adminToken: string }>` |
| `submitVoteAction` | `VoteInput + pollId` | `getPoll()`, `addVote()` | `ActionResult<{ success: true }>` |
| `closePollAction` | `ClosePollInput` | `closePoll()` | `ActionResult<{ success: true }>` |

Each action: parse with Zod → call store → return result. Business logic errors from the store (duplicate name, poll closed, invalid token) returned as `{ success: false, error: "..." }`.

### Page Conversions

| Page | Before | After |
|---|---|---|
| `/` (home) | Client component, renders PollForm | Keep as-is (PollForm is self-contained, uses server action) |
| `/poll/[id]` | Client, useEffect fetch | Server component → `<PollPageClient poll={poll}>` |
| `/poll/[id]/results` | Client, useEffect fetch | Server component, calls `getPoll()` + `computeResults()` directly |
| `/poll/[id]/admin/[token]` | Client, useEffect POST | Server component, calls `validateAdmin()` + `getPoll()` directly |

## Acceptance Criteria

### Functional
- [x] All three forms (PollForm, VoteForm, AdminPanel) use react-hook-form + Zod
- [x] All API routes deleted, replaced by server actions (mutations) and direct store calls (reads)
- [x] Validation is defined once in Zod schemas, used on both client (zodResolver) and server (action parse)
- [x] French error messages preserved for all validation rules
- [x] Poll creation returns `{ id, adminToken }` and shows share links (same UX)
- [x] Vote submission sets localStorage and shows confirmation (same UX)
- [x] Admin close uses two-step confirmation and calls server action
- [x] Results page shows results only for closed polls, "not ready" for open polls
- [x] Admin page validates token server-side and shows admin panel

### Non-Functional
- [x] `timingSafeEqual` still used for admin token comparison (via `tokensMatch` in store.ts)
- [x] No hydration mismatch warnings in console
- [x] `pnpm build` passes with no TypeScript errors
- [x] Existing UI components (`Button`, `Input`, `Toast`, `ShareLink`) unchanged
- [x] Motion animations still work on all pages

## Implementation Phases

### Phase 1: Foundation (schemas, types, dependencies)

**Files to create/modify:**

- `package.json` — add `zod`, `react-hook-form`, `@hookform/resolvers`
- `src/lib/schemas.ts` — all Zod schemas with French messages
- `src/lib/types.ts` — add `ActionResult<T>` type, optionally derive form types from Zod with `z.infer<>`
- `src/lib/actions.ts` — all server actions (`"use server"`)

**Exit criteria:** Server actions callable, Zod schemas validate correctly, `pnpm build` passes.

### Phase 2: Form components

**Files to modify:**

- `src/components/poll-form.tsx` — `useForm` + `useFieldArray` + `zodResolver` + call `createPollAction`
- `src/components/vote-form.tsx` — `useForm` + `zodResolver` + `setValue` for grade buttons + call `submitVoteAction`
- `src/components/admin-panel.tsx` — call `closePollAction` server action + `router.refresh()` for refresh

**Exit criteria:** All three forms submit via server actions, validation works client+server, UX unchanged.

### Phase 3: Page conversions

**Files to modify:**

- `src/app/poll/[id]/page.tsx` — server component + `<PollPageClient>` client wrapper (localStorage)
- `src/app/poll/[id]/results/page.tsx` — server component, direct store calls
- `src/app/poll/[id]/admin/[token]/page.tsx` — server component, direct store calls

**Exit criteria:** Pages fetch data server-side, no `useEffect` for data loading, loading handled by Next.js.

### Phase 4: Cleanup

**Files to delete:**

- `src/app/api/polls/route.ts`
- `src/app/api/polls/[id]/route.ts`
- `src/app/api/polls/[id]/results/route.ts`
- `src/app/api/polls/[id]/close/route.ts`
- `src/app/api/polls/[id]/admin/route.ts`
- Entire `src/app/api/` directory

**Files to modify:**

- `src/lib/utils.ts` — remove `validateQuestion`, `validateCandidates`, `validateVoterName`, `validateGrades`, `sanitizeGrades` (replaced by Zod schemas)

**Exit criteria:** No API routes remain, no unused validation functions, `pnpm build` passes, app works end-to-end.

## Dependencies & Risks

**Dependencies:**
- `zod` — schema validation (no special Next.js adapter needed)
- `react-hook-form` — form state management
- `@hookform/resolvers` — connects Zod to react-hook-form

**Risks:**
- **Hydration flash on poll page:** Brief moment between server render and localStorage check where wrong UI may flash. Mitigate with a loading skeleton in the client wrapper.
- **Vote rejected after poll closes:** User submits after admin closes poll. The server action returns an error; form state (grades, name) is preserved so the user sees what happened. Toast shows "Ce vote est fermé."
- **Dynamic grade validation:** Zod schema validates shape, server action validates against actual candidates. Two-step validation keeps schemas simple.

## References

- Brainstorm: `docs/brainstorms/2026-02-16-server-actions-rhf-zod-brainstorm.md`
- Institutional learning: `docs/solutions/logic-errors/localstorage-redirect-blocks-voters.md` — never redirect based on localStorage, use conditional rendering
- Store implementation: `src/lib/store.ts`
- Current validation: `src/lib/utils.ts`
- Current types: `src/lib/types.ts`
