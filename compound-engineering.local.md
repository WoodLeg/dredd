---
review_agents:
  [
    kieran-typescript-reviewer,
    code-simplicity-reviewer,
    security-sentinel,
    code-simplifier:code-simplifier,
    architecture-strategist,
    pattern-recognition-specialist,
    julik-frontend-races-reviewer,
  ]
plan_review_agents: [kieran-typescript-reviewer, code-simplicity-reviewer, spec-flow-analyzer]
---

# Review Context

## Stack
- Next.js 16 (App Router, Turbopack), React 19, TypeScript strict, Tailwind CSS v4, motion/react
- In-memory store (no DB) — state lives in server memory
- pnpm, dev server on port 3999

## Architecture Rules
- Server Components by default; `"use client"` only on smallest leaf components needing hooks/browser APIs
- Server Actions for mutations (`src/lib/actions.ts`), no API routes for forms
- `params` is a Promise in Next.js 16 — always `await params`
- No `useEffect` for data the server already has

## Hydration & Client State
- Never read `localStorage` or `window.*` in `useState` initializers — causes hydration mismatch
- Always use `useEffect` for browser-only reads (localStorage, matchMedia, etc.)
- CSS custom properties use `--*` keys via `src/lib/css.d.ts` augmentation — no `as string` casts

## UI & Theming
- French UI with dystopian Judge Dredd / Mega-City One lexical field
- Grade colors defined in `src/lib/grades.ts` — single source of truth, never hardcode hex values elsewhere
- Use `DreddFeedback` (slide-in) for transient messages, `DreddFullPage` for blocking states
- HUD cards use `.hud-card` CSS class with `--hud-bg` / `--hud-border` custom properties

## Performance
- Large static SVGs should be wrapped in `React.memo()`
- Images in `public/` should be WebP, not PNG
- Respect `prefers-reduced-motion` — all animations disable via CSS media query
