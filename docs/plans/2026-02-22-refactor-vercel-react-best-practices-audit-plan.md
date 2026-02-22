---
title: "Vercel React Best Practices Audit"
type: refactor
status: completed
date: 2026-02-22
---

# Vercel React Best Practices Audit

## Overview

Systematic audit of the Dredd codebase against Vercel Engineering's React Best Practices guide (v1.0.0, 45 rules across 8 categories). The codebase is already in good shape — Server Components by default, Server Actions for mutations, no barrel imports, proper Suspense usage. This plan documents every actionable improvement found, prioritized by real-world impact.

**Context:** In-memory store (no DB), Next.js 16, React 19 (no React Compiler), motion/react v12, Tailwind v4.

## Findings by Category

---

### 1. Bundle Size Optimization (HIGH)

#### 1.1 `Button` imports `motion/react` for `whileTap` only

- **File:** `src/components/ui/button.tsx:3,61-62`
- **Rule:** `bundle-dynamic-imports`, `bundle-defer-third-party`
- **Impact:** HIGH — `Button` is used on every page. `motion.button` pulls in the full motion DOM animation runtime (~117KB minified pre-gzip) because the `motion` proxy object is not statically analyzable for tree-shaking. The `Link` branch does not use motion at all.

**Current:**
```tsx
import { motion } from "motion/react";
// ...
<motion.button whileTap={disabled ? undefined : { scale: 0.97 }}>
```

**Fix:** Replace with CSS `:active` transform. Zero-dependency, hardware-accelerated:
```tsx
// button.tsx — remove motion import entirely
<button className={`${classes} active:scale-[0.97] transition-transform`}>
```

Preserve the dual-mode API (`Button` as link vs button).

#### 1.2 Evaluate remaining `motion/react` imports

- **Files:** 6 components import `motion/react`
- **Rule:** `bundle-dynamic-imports`

| Component | Import | Justification | Action |
|-----------|--------|---------------|--------|
| `button.tsx` | `motion` | `whileTap` only | **Remove** — CSS `:active` |
| `grade-drawer.tsx` | `motion, AnimatePresence, useReducedMotion` | Drawer slide + exit animation | **Keep** — `AnimatePresence` needs JS |
| `user-badge.tsx` | `motion, AnimatePresence` | Dropdown + `whileTap` on badge | **Keep** AnimatePresence, **remove** `whileTap` from badge button (CSS) |
| `dredd-feedback.tsx` | `motion, AnimatePresence` | Slide-up alert with exit | **Keep** — core UX |
| `results-page-client.tsx` | `motion, AnimatePresence` | Ceremony phases + verdict cards | **Keep** — `AnimatePresence` for phase transitions |
| `le-code-client.tsx` | `useInView` | Scroll-triggered section reveal | **Keep** — lightweight hook |

**Net result:** Remove motion from `button.tsx`, reduce `whileTap` in `user-badge.tsx` to CSS. Drops motion from the critical path (every page) to on-demand pages only.

#### 1.3 `optimizePackageImports` in next.config.ts

- **File:** `next.config.ts`
- **Rule:** `bundle-barrel-imports`
- **Impact:** LOW — `motion/react` is a subpath export (not a barrel), so `optimizePackageImports` has negligible effect. `@react-aria/interactions` may benefit slightly. Adding it is harmless defensive practice.

**Fix:**
```ts
experimental: {
  viewTransition: true,
  optimizePackageImports: ["@react-aria/interactions"],
},
```

---

### 2. Eliminating Waterfalls (MEDIUM — style/correctness only)

#### 2.1 `Promise.resolve()` wrapping synchronous `getPoll()`

- **Files:** `src/app/poll/[id]/page.tsx:42`, `src/app/poll/[id]/admin/page.tsx:18`
- **Rule:** `async-parallel`
- **Impact:** MEDIUM — Zero performance impact (Map.get is sync), but misleading. `Promise.all` signals "parallel async operations" — `Promise.resolve` of a sync function breaks that mental model. If `getPoll` ever becomes async (DB migration), wrapping in `Promise.resolve` would silently swallow the async nature.

**Current:**
```tsx
const [session, poll] = await Promise.all([
  auth.api.getSession({ headers: await headers() }),
  Promise.resolve(getCachedPoll(id)),
]);
```

**Fix:**
```tsx
const [session, poll] = await Promise.all([
  auth.api.getSession({ headers: await headers() }),
  getCachedPoll(id),  // sync — Promise.all accepts non-Promise values
]);
```

`Promise.all` handles non-thenable values by wrapping them internally — the explicit `Promise.resolve` is redundant.

---

### 3. Re-render Optimization (MEDIUM)

#### 3.1 `watch("grades")` causes full VoteForm re-renders

- **File:** `src/components/vote-form.tsx:111-112`
- **Rule:** `rerender-derived-state`
- **Impact:** MEDIUM — `watch("grades")` subscribes VoteForm to the entire grades object. Every grade change triggers a parent re-render. The `CandidateGradeRow` and `MobileSuspectRow` subcomponents correctly use per-field `useWatch`, but the parent re-renders them all anyway. Additionally, the full `grades` object is passed to `AnimatedGradeDrawer` (line 199) which only needs `grades[activeCandidate]`.

**Current:**
```tsx
const grades = watch("grades");
const allGraded = candidates.every((c) => grades[c]);
// ...
<AnimatedGradeDrawer grades={grades} ... />
```

**Fix — derive `allGraded` from per-field watches without broad subscription:**

Option A (simplest): Keep `watch("grades")` but pass only the needed slice to the drawer:
```tsx
<AnimatedGradeDrawer
  currentGrade={activeCandidate ? grades[activeCandidate] : undefined}
  ...
/>
```

Option B (optimal): Replace `watch` with a custom derived value:
```tsx
const { control, formState: { isValid } } = useForm<VoteInput>({
  resolver: zodResolver(voteSchema),
  mode: "onChange",  // enables isValid tracking
});
// Use isValid instead of allGraded
<Button disabled={!isValid || isSubmitting}>
```

This eliminates the `watch("grades")` subscription entirely. The ESLint suppression comment (`react-hooks/incompatible-library`) would also be removed.

---

### 4. Rendering Performance (LOW-MEDIUM)

#### 4.1 SVG `judge.tsx` path precision and delivery

- **File:** `src/app/icons/dredd/judge.tsx` (26KB, 576 lines)
- **Rule:** `rendering-svg-precision`
- **Impact:** LOW-MEDIUM — Path coordinates have 9-12 decimal places (`178.169921875`, `658.964453125`). Reducing to 1-2 decimal places would cut file size significantly.

**Additional concern:** The SVG is inlined as JSX, meaning it is re-serialized in every HTML response and bypasses browser HTTP caching. Extracting to a static `.svg` file loaded via `<img>` or `next/image` would enable caching.

**Fix (two-step):**

1. Run SVGO to reduce precision:
```bash
npx svgo --precision=1 --multipass src/app/icons/dredd/judge.svg
```

2. Consider extracting to a static file if the SVG is not animated via React (it is not — only wrapped in `memo`):
```tsx
// Instead of inline JSX:
import Image from "next/image";
<Image src="/judge-dredd.svg" alt="" width={200} height={160} />
```

#### 4.2 Skeleton fallbacks duplicated across 3 pages

- **Files:** `poll/[id]/page.tsx:71-78`, `results/page.tsx:63-70`, `admin/page.tsx:52-59`
- **Rule:** `rendering-hoist-jsx`
- **Impact:** LOW — Byte-for-byte identical markup. DX/maintainability only.

**Note:** These Suspense fallbacks are effectively dead code — the wrapped client components receive all data as props and never suspend. The real fix would be to use Next.js `loading.tsx` files per route segment (see 4.3).

**Fix:** Extract shared skeleton:
```tsx
// src/components/ui/page-skeleton.tsx (Server Component — no "use client")
export function PageSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg flex flex-col gap-6">
        <div className="h-8 bg-surface-light rounded-xl animate-pulse w-3/4" />
        <div className="h-4 bg-surface-light rounded-xl animate-pulse w-1/2" />
        <div className="h-32 bg-surface-light rounded-xl animate-pulse" />
      </div>
    </div>
  );
}
```

#### 4.3 Missing `loading.tsx` route files

- **Rule:** Strategic Suspense Boundaries (`async-suspense-boundaries`)
- **Impact:** LOW — Next.js App Router supports `loading.tsx` as automatic Suspense boundaries per route segment. The three poll pages manually wrap content in `<Suspense>`. Using `loading.tsx` would be more idiomatic and eliminate both the manual Suspense wrappers and the duplicated skeleton markup.

**Fix:** Create `src/app/poll/[id]/loading.tsx`:
```tsx
import { PageSkeleton } from "@/components/ui/page-skeleton";
export default function Loading() {
  return <PageSkeleton />;
}
```

---

### 5. Accessibility (MEDIUM)

#### 5.1 `ResultsChart` animation ignores `prefers-reduced-motion`

- **File:** `src/components/results-chart.tsx:20-31`
- **Rule:** (not explicit in Vercel guide, but cross-cutting accessibility concern)
- **Impact:** MEDIUM — Bar expansion animation via `useEffect` + CSS transition fires unconditionally. `GradeDrawer` and `ResultsPageClient` both check for reduced motion. This is an inconsistency.

**Fix:**
```tsx
useEffect(() => {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    // Set bars to final width immediately, skip animation
    containerRef.current?.querySelectorAll<HTMLDivElement>("[data-bar]").forEach((bar) => {
      bar.style.width = bar.dataset.target || "0%";
    });
    return;
  }
  const timeout = setTimeout(() => { /* existing animation code */ }, (delay + 0.1) * 1000);
  return () => clearTimeout(timeout);
}, [delay]);
```

---

### 6. Ceremony Phase Flash (MEDIUM)

#### 6.1 `ResultsPageClient` flashes "Deliberating" on return visits

- **File:** `src/app/poll/[id]/results/results-page-client.tsx:55,65-75`
- **Impact:** MEDIUM — State initializes as `"DELIBERATING"` to avoid hydration mismatch. Users who have already seen the ceremony (or use `prefers-reduced-motion`) see one paint of the deliberation screen before `useEffect` corrects it to `FULL_RESULTS`.

**Current approach is correct for hydration safety** per the documented learning in `docs/solutions/runtime-errors/next-hydration-mismatch-typeof-window-useState.md`. The flash is a known trade-off.

**Mitigation (not a full fix):** Add CSS to hide the deliberation phase until hydration completes:
```tsx
// Add to the DELIBERATING phase wrapper:
<div className="[.hydrated_&]:block hidden">
  {/* deliberation content */}
</div>
```

Then in layout, mark `<body>` as hydrated after mount. This is the `rendering-hydration-no-flicker` pattern from the Vercel guide (inline script to set class before React hydrates).

---

### 7. Rules That Don't Apply (Confirmed Clean)

| Rule | Why Not Applicable |
|------|-------------------|
| `async-defer-await` | Actions use early returns correctly |
| `async-dependencies` | No partial dependency chains |
| `bundle-barrel-imports` | No barrel imports found |
| `bundle-preload` | QR code already dynamically imported, no other heavy lazy components |
| `server-cache-lru` | In-memory store is already cross-request by design |
| `server-serialization` | Poll data is minimized before passing to client (pollData object) |
| `server-parallel-fetching` | No server-side component tree waterfalls |
| `server-after-nonblocking` | No post-response work (no analytics, logging) |
| `client-swr-dedup` | No client-side data fetching — all via Server Actions |
| `client-event-listeners` | Single-instance event listeners only |
| `rerender-functional-setstate` | State updates use simple values, no stale closure risk |
| `rerender-lazy-state-init` | All initial values are cheap primitives |
| `rerender-transitions` | AdminPanel correctly uses `useTransition` for refresh |
| `rendering-conditional-render` | Ternary operators used consistently |
| `js-set-map-lookups` | `validKeys` in actions.ts already uses Set |
| `js-tosorted-immutable` | `[...indices].sort()` in majority-judgment.ts correctly copies before sort |
| `js-early-exit` | Actions and store functions use early returns |
| `js-cache-function-results` | `medianOrderCache` Map in majority-judgment.ts |

---

## Implementation Priority

| # | Finding | Priority | Effort | Files Changed | Status |
|---|---------|----------|--------|---------------|--------|
| 1 | Remove motion from Button (CSS `:active`) | HIGH | 10 min | `button.tsx` | Done |
| 2 | Remove `Promise.resolve()` wrappers | MEDIUM | 5 min | `page.tsx`, `admin/page.tsx` | Done |
| 3 | Fix `watch("grades")` re-render scope | MEDIUM | 20 min | `vote-form.tsx`, `grade-drawer.tsx` | Done (Option A) |
| 4 | Add `prefers-reduced-motion` to ResultsChart | MEDIUM | 10 min | `results-chart.tsx` | Done |
| 5 | Optimize judge.tsx SVG precision | LOW-MEDIUM | 10 min | `judge.tsx` | Done (59% reduction) |
| 6 | Extract shared PageSkeleton + loading.tsx | LOW | 15 min | 7 files | Done |
| 7 | Add `optimizePackageImports` | LOW | 2 min | `next.config.ts` | Done |
| 8 | Mitigate ceremony phase flash | LOW | 15 min | `results-page-client.tsx`, `layout.tsx` | Skipped — known hydration trade-off |

## References

- [Vercel React Best Practices v1.0.0](file:///Users/paulsouvestre/.claude/skills/vercel-react-best-practices/AGENTS.md)
- Previous audit: `docs/solutions/performance-issues/vercel-react-best-practices-audit-next16.md`
- Hydration fix: `docs/solutions/runtime-errors/next-hydration-mismatch-typeof-window-useState.md`
- Hooks violations: `docs/solutions/logic-errors/react-hooks-and-state-machine-violations.md`
