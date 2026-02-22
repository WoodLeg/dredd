---
title: Hydration Mismatch from typeof window in useState Initializer
date: 2026-02-18
category: runtime-errors
tags:
  - hydration-mismatch
  - server-client-render
  - state-initialization
  - next-js-16
  - ssr
severity: high
component: src/components/share-link.tsx, src/components/poll-form.tsx
framework: Next.js 16
symptoms:
  - "Hydration failed because the server rendered text didn't match the client"
  - URL display components show relative path on server, full URL on client
  - Error appears on every page containing ShareLink or AdminLinkDisplay
---

# Hydration Mismatch from `typeof window` in useState Initializer

## Symptom

Console error on every page containing a ShareLink component:

> Hydration failed because the server rendered text didn't match the client.

Server renders `/poll/xyz` but client renders `http://localhost:3999/poll/xyz`.

## Root Cause

`useState` initializers run during **both SSR and client hydration**. Branching on `typeof window` produces different values in each environment:

```tsx
// Server: window is undefined -> returns "/poll/xyz"
// Client: window exists -> returns "http://localhost:3999/poll/xyz"
const [url] = useState(() =>
  typeof window !== "undefined"
    ? `${window.location.origin}/poll/${pollId}`
    : `/poll/${pollId}`
);
```

React's hydration expects the server HTML to match the client's first render exactly. Different values break this invariant.

## Correction Notice

A previous solution document (`docs/solutions/performance-issues/vercel-react-best-practices-audit-next16.md`, Fix 7) recommended this exact pattern as an improvement over `useState("") + useEffect`. That recommendation was wrong — lazy `useState` with `typeof window` still causes hydration mismatch because the initializer runs on both server and client with different results. The `useEffect` approach below is the correct fix.

## Solution

### Before (Broken)

```tsx
const [url] = useState(() =>
  typeof window !== "undefined"
    ? `${window.location.origin}/poll/${pollId}`
    : `/poll/${pollId}`
);
```

### After (Fixed)

```tsx
const [url, setUrl] = useState(`/poll/${pollId}`);

useEffect(() => {
  setUrl(`${window.location.origin}/poll/${pollId}`);
}, [pollId]);
```

Applied to both `ShareLink` (`src/components/share-link.tsx`) and `AdminLinkDisplay` in `src/components/poll-form.tsx`.

## Why It Works

1. **Server-client agreement**: Both render `/poll/${pollId}` initially — hydration matches
2. **Effect timing**: `useEffect` runs only after hydration completes on the client
3. **No mismatch risk**: The update from relative to absolute path happens post-hydration

## Rule

**Never branch on `typeof window` inside a `useState` initializer.** The initializer runs on both server and client — it must produce the same value in both environments.

## Safe Patterns for Browser APIs in Next.js

| API | Pattern |
|-----|---------|
| `window.location` | `useState(fallback)` + `useEffect(() => setUrl(window.location...))` |
| `localStorage` | `useState(default)` + `useEffect(() => { const v = localStorage.getItem(...); if (v) setState(v); })` |
| `navigator.*` | `useState(false)` + `useEffect(() => setAvailable(!!navigator.clipboard))` |
| Full URL from server | Pass via Server Component props using `headers()` (preferred — no flash) |

## Grep Commands to Find Similar Issues

```bash
# Find typeof window in useState initializers
rg "useState.*typeof\s+window"

# Find browser API access outside useEffect
rg "window\.location" --type ts --type tsx
rg "(localStorage|sessionStorage)" --type ts --type tsx
```

## Secondary Fix: SVG Scaling

In the same session, a JudgeDredd SVG was invisible inside a 300x240px container because it had hardcoded `width="1280px" height="1024px"`.

**Fix**: Add `[&_svg]:w-full [&_svg]:h-full` to the parent container, forcing the SVG to scale:

```tsx
<div className="w-[300px] h-[240px] [&_svg]:w-full [&_svg]:h-full">
  <JudgeDredd />
</div>
```

**Rule**: Always ensure inline SVGs either omit hardcoded `width`/`height` or have a parent that overrides them.

## Related Documentation

- `docs/solutions/performance-issues/vercel-react-best-practices-audit-next16.md` — Fix 7 (superseded by this document)
- `docs/solutions/logic-errors/localstorage-redirect-blocks-voters.md` — Correct localStorage + useEffect pattern
- `docs/solutions/code-quality/full-app-review-security-testing-cleanup.md` — Noted the pre-existing hydration issue
- [Next.js Hydration Error Docs](https://nextjs.org/docs/messages/react-hydration-error)
