---
title: Vercel React Best Practices Audit - Dredd Voting App
date: 2026-02-16
category: performance-issues
tags: [bundle-optimization, server-components, suspense-boundaries, hydration, re-render-optimization, algorithm-performance, motion-react, css-animations]
severity: medium
component: app-wide
symptoms:
  - Heavy client bundle from motion/react imported in 10 components for trivial animations
  - Homepage unnecessarily rendered as client component preventing static prerendering
  - No Suspense boundaries on server pages blocking streaming
  - VoteForm re-rendering all 7xN grade buttons on every grade selection
  - URL display components flashing empty on first paint (hydration mismatch)
  - Render-time store mutation in results page
  - Toast timer resetting on parent re-renders due to unstable onClose callback
root_cause: >
  Lack of adherence to React 19 / Next.js 16 best practices during initial implementation.
  Motion/react used as default animation tool even for trivial CSS-replaceable effects.
  Components marked "use client" unnecessarily. Missing Suspense boundaries. Broad state
  subscriptions causing cascading re-renders. Side effects in render functions.
resolution: >
  12 fixes applied in 3 parallel phases: replaced motion with CSS in 6 components, converted
  homepage to Server Component, added Suspense boundaries, fixed re-renders with per-field
  useWatch, stabilized effect deps with useRef, eliminated hydration flash, extracted shared
  PageLayout, and optimized algorithms. Result: 22 files changed, homepage now statically
  prerendered, motion/react reduced from 10 to 4 imports.
prevention: >
  Default to CSS for simple animations. Default all pages to Server Components. Wrap async
  components in Suspense. Use per-field useWatch instead of broad watch(). Stabilize effect
  callbacks with useRef. Enable @next/next/no-html-link-for-pages ESLint rule.
---

# Vercel React Best Practices Audit - Dredd Voting App

## Problem

The Dredd Jugement Majoritaire voting app (Next.js 16, TypeScript, Tailwind CSS v4, motion/react) was audited against the [Vercel React Best Practices](https://vercel.com/docs) guide. 12 issues were identified across 8 priority categories spanning bundle size, waterfalls, server performance, re-renders, rendering correctness, and JavaScript efficiency.

**Observable symptoms:**
- `motion/react` (~30KB+ gzipped) imported in 10 of 10 client components, most for trivial fade-in animations
- Homepage marked `"use client"` — prevented static prerendering, shipped react-hook-form + zod to all visitors
- No Suspense boundaries — server pages blocked streaming entirely
- Every grade button selection in VoteForm triggered a full re-render of all candidates (7 grades x 20 candidates = 140 buttons)
- ShareLink and AdminLinkDisplay showed empty URL on first paint, then filled in after hydration
- `poll.cachedResults` mutated directly during render in results page

## Investigation

Systematic audit of all source files against 45 rules across 8 categories:

| Priority | Category | Issues Found |
|----------|----------|-------------|
| CRITICAL | Bundle Size Optimization | 2 (motion overuse, unnecessary "use client") |
| CRITICAL | Eliminating Waterfalls | 1 (no Suspense boundaries) |
| HIGH | Server-Side Performance | 1 (render-time mutation) |
| MEDIUM-HIGH | Re-render Optimization | 2 (broad watch, unstable deps) |
| MEDIUM | Rendering Performance | 4 (hydration flash, layout duplication, wrong link tag, unsafe &&) |
| LOW-MEDIUM | JavaScript Performance | 2 (O(n^2) algorithm, redundant loops) |

## Root Cause

The issues clustered around three themes:

1. **Over-reliance on motion/react** — Used as the default animation tool even for simple opacity/transform transitions that CSS handles natively with zero JS cost
2. **Missing React Server Component patterns** — Pages defaulted to `"use client"` without evaluating whether interactivity was truly needed at the page level
3. **Broad state subscriptions** — `watch("grades")` subscribed the entire form to every grade change instead of using per-field subscriptions

## Solution

### Execution Strategy

12 fixes executed in 3 phases using parallel subagents to avoid file conflicts:

```
Phase 1 (7 parallel agents - independent files):
  #9  not-found.tsx        → Link fix
  #11 majority-judgment.ts → compareSorted optimization
  #12 actions.ts           → combine validation loops
  #7  share-link.tsx       → URL hydration flash
  #6  toast.tsx            → effect deps fix
  #3+#4 server pages      → Suspense + mutation fix
  #5+#10 vote-form.tsx     → re-renders + ternaries

Phase 2 (1 agent - after Phase 1):
  #1  10 files             → motion → CSS animations

Phase 3 (1 agent - after Phase 2):
  #2+#8 page.tsx + layouts → homepage SSR + PageLayout extraction
```

### Fix 1: Replace motion/react with CSS (CRITICAL)

Added CSS keyframes to `globals.css` and removed `motion/react` from 6 components:

```css
/* globals.css */
@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in-up {
  animation: fade-in-up 0.5s ease-out both;
}
```

```tsx
// Before (page.tsx, poll-page-client.tsx, results-page-client.tsx, etc.)
import { motion } from "motion/react";
<motion.main
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5 }}
>

// After — zero JS, same visual effect
<main className="w-full max-w-lg flex flex-col gap-8 animate-fade-in-up">
```

**Kept motion/react** only in 4 files that genuinely need it:
- `poll-form.tsx` — `AnimatePresence` for field list exit animations
- `toast.tsx` — `AnimatePresence` for toast exit animations
- `vote-form.tsx` — `whileTap` for grade button interactions
- `button.tsx` — `whileTap` for press feedback

### Fix 2: Homepage → Server Component (CRITICAL)

```tsx
// Before — entire page client-rendered, ships RHF + zod to all visitors
"use client";
import { motion } from "motion/react";
export default function Home() {
  return <motion.main>...</motion.main>;
}

// After — statically prerendered, PollForm is a client island
import { PollForm } from "@/components/poll-form";
export default function Home() {
  return <main className="... animate-fade-in-up"><PollForm /></main>;
}
```

Build output confirmed: `/ ○ (Static) prerendered as static content`.

### Fix 3: Suspense Boundaries (CRITICAL)

```tsx
// All 3 server pages now stream content
import { Suspense } from "react";

export default async function PollPage({ params }: PollPageProps) {
  const { id } = await params;
  const poll = getPoll(id);
  // ...
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg flex flex-col gap-6">
          <div className="h-8 bg-surface-light rounded-xl animate-pulse w-3/4" />
          <div className="h-4 bg-surface-light rounded-xl animate-pulse w-1/2" />
          <div className="h-32 bg-surface-light rounded-xl animate-pulse" />
        </div>
      </div>
    }>
      <PollPageClient poll={pollData} />
    </Suspense>
  );
}
```

### Fix 4: Store API for Cached Results (HIGH)

```tsx
// Before — direct mutation during render
const results = poll.cachedResults ?? computeResults(...);
if (!poll.cachedResults) {
  poll.cachedResults = results; // side effect in render!
}

// After — mutation through store API
// store.ts
export function setCachedResults(pollId: string, results: PollResults): void {
  const poll = polls.get(pollId);
  if (poll && !poll.cachedResults) {
    poll.cachedResults = results;
  }
}

// results/page.tsx
import { setCachedResults } from "@/lib/store";
if (!poll.cachedResults) {
  setCachedResults(id, results);
}
```

### Fix 5: Per-Field useWatch in VoteForm (MEDIUM-HIGH)

```tsx
// Before — watch("grades") re-renders ALL candidates on any grade change
const grades = watch("grades");
{candidates.map((candidate) => (
  <div>{GRADES.map((g) => <button>{grades[candidate] === g.key ? "..." : "..."}</button>)}</div>
))}

// After — each row watches only its own field
function CandidateGradeRow({ candidate, control, onSelectGrade, index }: Props) {
  const selectedGrade = useWatch({ control, name: `grades.${candidate}` });
  return (
    <div>{GRADES.map((g) => (
      <button onClick={() => onSelectGrade(candidate, g.key)}>
        {selectedGrade === g.key ? "..." : "..."}
      </button>
    ))}</div>
  );
}
```

### Fix 6: Stable Toast Callback via useRef (MEDIUM-HIGH)

```tsx
// Before — timer resets on every parent re-render
useEffect(() => {
  if (visible) {
    const timer = setTimeout(onClose, duration); // onClose is new ref each render
    return () => clearTimeout(timer);
  }
}, [visible, onClose, duration]);

// After — ref captures latest callback, effect only depends on visible + duration
const onCloseRef = useRef(onClose);
onCloseRef.current = onClose;

useEffect(() => {
  if (visible) {
    const timer = setTimeout(() => onCloseRef.current(), duration);
    return () => clearTimeout(timer);
  }
}, [visible, duration]);
```

### Fix 7: Lazy State Init for URLs (MEDIUM)

```tsx
// Before — flash of empty content
const [url, setUrl] = useState("");
useEffect(() => {
  setUrl(`${window.location.origin}/poll/${pollId}`);
}, [pollId]);

// After — correct value on first render, no flash
const [url] = useState(() =>
  typeof window !== "undefined"
    ? `${window.location.origin}/poll/${pollId}`
    : `/poll/${pollId}`
);
```

### Fix 8: Shared PageLayout Component (MEDIUM)

```tsx
// Extracted from 6 duplicated instances
export function PageLayout({ children, className = "" }: PageLayoutProps) {
  return (
    <div className={`min-h-screen flex items-center justify-center px-4 py-12 ${className}`}>
      {children}
    </div>
  );
}
```

### Fix 11: O(n) compareSorted with Cached Median Order (LOW)

```tsx
// Before — O(n^2) per comparison: copies arrays then splices from middle
function compareSorted(aSorted: number[], bSorted: number[]): number {
  const a = [...aSorted]; const b = [...bSorted];
  while (a.length > 0 && b.length > 0) {
    const mid = Math.floor(a.length / 2);
    if (a[mid] !== b[mid]) return a[mid] - b[mid];
    a.splice(mid, 1); b.splice(mid, 1); // O(n) each!
  }
  return 0;
}

// After — O(n) per comparison: precomputed index sequence, cached per array length
const medianOrderCache = new Map<number, number[]>();

function medianRemovalOrder(n: number): number[] {
  const cached = medianOrderCache.get(n);
  if (cached) return cached;
  const indices = Array.from({ length: n }, (_, i) => i);
  const order: number[] = new Array(n);
  for (let step = 0; step < n; step++) {
    const mid = Math.floor(indices.length / 2);
    order[step] = indices[mid];
    indices.splice(mid, 1);
  }
  medianOrderCache.set(n, order);
  return order;
}

function compareSorted(aSorted: number[], bSorted: number[]): number {
  const order = medianRemovalOrder(aSorted.length);
  for (const idx of order) {
    if (aSorted[idx] !== bSorted[idx]) return aSorted[idx] - bSorted[idx];
  }
  return 0;
}
```

## Verification

- Build passes with zero TypeScript errors
- Homepage now statically prerendered (`○ Static`)
- `motion/react` reduced from 10 to 4 imports
- 22 files changed: +1007 / -397 lines
- All 3 server pages wrapped in Suspense with skeleton fallbacks

## Prevention Strategies

### Code Review Checklist

- [ ] `motion/react` used only for AnimatePresence or whileTap — simple animations use CSS
- [ ] Pages default to Server Components — `"use client"` only with documented justification
- [ ] All async server components wrapped in `<Suspense>` with fallback
- [ ] No store mutations during render — all writes via store API or event handlers
- [ ] Form `watch()` calls are minimal — use per-field `useWatch` for isolated re-renders
- [ ] Effect callbacks stabilized with `useRef` or `useCallback`
- [ ] No `useState` + `useEffect` for values derivable from props — use lazy init
- [ ] All internal links use `next/link` `<Link>`, not `<a href>`
- [ ] Conditional rendering uses ternaries for string conditions, not `&&`
- [ ] No duplicate layout patterns — use shared components

### Recommended Tooling

- **ESLint `@next/next/no-html-link-for-pages`** — catches `<a>` instead of `<Link>` (already available in `eslint-config-next`)
- **`@next/bundle-analyzer`** — visualize bundle impact of motion/react and other heavy deps
- **React DevTools Profiler** — identify unnecessary re-renders in VoteForm and other interactive components

## Related Documentation

- [Server Actions + RHF + Zod Refactor Plan](../../plans/2026-02-16-refactor-server-actions-rhf-zod-plan.md) — architectural shift enabling many of these optimizations
- [localStorage Redirect Blocks Voters](../logic-errors/localstorage-redirect-blocks-voters.md) — related client-side state management pattern
- [Poll Closing with Admin Link Plan](../../plans/2026-02-16-feat-poll-closing-with-admin-link-plan.md) — feature context for admin page changes
