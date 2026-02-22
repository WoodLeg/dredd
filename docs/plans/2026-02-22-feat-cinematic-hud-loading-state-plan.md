---
title: "feat: Cinematic HUD Loading State"
type: feat
status: completed
date: 2026-02-22
---

# Cinematic HUD Loading State

## Overview

Replace the generic `PageSkeleton` (3 gray pulsing rounded rectangles) with a cinematic Mega-City One terminal boot sequence. The current loading state uses `rounded-xl` and `bg-surface-light` — visually disconnected from the angular HUD cards, neon cyan glow, Orbitron font, scan lines, and Dredd branding that define every other screen.

The new loading state combines: HUD frame drawing in, DreddHelmetIcon with neon glow, status text reveal in Orbitron, and a looping neon scan-line progress bar.

## Problem Statement

Every page transition shows a generic skeleton that looks like it belongs to a different app. The loading state is the one remaining screen that breaks the Mega-City One immersion. Since loading states are the first thing users see on navigation, they set the tone — and right now that tone is "dark-mode SaaS checkout."

## Proposed Solution

A single `CinematicLoader` Server Component with route-specific status text, using **CSS-only animations** (no motion/react — restricted to 4 existing files per codebase audit). The animation sequence:

### Boot Sequence (CSS animation-delay chain, ~1s total)

| Phase | Timing | Effect |
|-------|--------|--------|
| 1. HUD Frame | 0-300ms | Angular clip-path card fades + scales in from center (`opacity: 0, scale(0.95)` → `opacity: 1, scale(1)`) |
| 2. Helmet Icon | 200-500ms | DreddHelmetIcon fades in with `filter: drop-shadow(0 0 12px #00f0ff)` glow |
| 3. Status Text | 400-800ms | Orbitron text fades in with a left-to-right clip reveal (`clip-path: inset(0 100% 0 0)` → `clip-path: inset(0 0 0 0)`) + blinking cursor pseudo-element |
| 4. Progress Bar | 600ms+ | Neon cyan bar sweeps left→right infinitely (reuses DELIBERATING pattern: `translateX(-100%)` → `translateX(100%)`, 1.5s loop) |

**Key timing decisions:**
- Phases 1-3 are **one-shot**, completing within ~800ms — so even fast page loads (~200ms) show a brief, coherent flash rather than a jarring cut
- Phase 4 (progress bar) **loops infinitely** — providing continuous motion feedback for slow loads (dashboard with many polls can take 5s+)
- Total intro sequence is fast enough that it doesn't feel like artificial delay
- The looping bar prevents the "static completed animation" problem on long loads

### Reduced Motion Fallback

The existing `globals.css` media query kills all animations. Reduced-motion users see:
- Static fully-drawn HUD frame
- Helmet icon visible (no glow pulse)
- Full status text (no reveal animation)
- Static thin neon cyan bar (no sweep) — indicates "loading" without motion

### Route-Specific Status Text

| Route | Primary Text | Secondary Text |
|-------|-------------|----------------|
| `/poll/[id]` | CHARGEMENT DU DOSSIER... | Accession aux archives du Tribunal |
| `/poll/[id]/admin` | ACCES AU TRIBUNAL... | Verification des accreditations |
| `/poll/[id]/results` | RECUPERATION DU VERDICT... | Consultation des deliberations |
| `/dashboard` | SCAN DES ARCHIVES... | Inventaire des dossiers en cours |

### Results Route: Lighter Variant

The results page has its own DELIBERATING ceremony (3s, JudgeDredd character + progress bar + "Deliberation en cours..."). Using the full cinematic boot sequence creates a double-ceremony problem. Solution: the results route uses the same `CinematicLoader` but **without the progress bar** — just helmet + text + HUD frame. This visually differentiates "server loading" from "deliberation ceremony" and avoids redundancy.

## Technical Approach

### Component Architecture

```
src/components/ui/cinematic-loader.tsx   ← NEW (Server Component, CSS-only)
src/components/ui/page-skeleton.tsx      ← DELETE (no other consumers)
src/app/poll/[id]/loading.tsx            ← UPDATE import
src/app/poll/[id]/admin/loading.tsx      ← UPDATE import
src/app/poll/[id]/results/loading.tsx    ← UPDATE import + lighter variant
src/app/dashboard/loading.tsx            ← UPDATE import
src/app/globals.css                      ← ADD 4 new @keyframes
```

### `CinematicLoader` Component API

```tsx
// src/components/ui/cinematic-loader.tsx

interface CinematicLoaderProps {
  status: string;       // Primary text (Orbitron, uppercase)
  detail?: string;      // Secondary text (Geist, muted)
  showProgress?: boolean; // Default true. False for results route.
}

export function CinematicLoader({ status, detail, showProgress = true }: CinematicLoaderProps) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg flex flex-col items-center gap-6">

        {/* Phase 1: HUD Frame draws in */}
        <div
          className="hud-card w-full px-8 py-10 flex flex-col items-center gap-5 loader-frame-in"
          style={{ '--hud-border': 'rgba(0,240,255,0.3)', '--hud-bg': 'rgba(13,17,23,0.95)' }}
        >

          {/* Phase 2: Helmet icon with neon glow */}
          <div className="loader-helmet-in">
            <DreddHelmetIcon size={64} className="loader-helmet-glow" />
          </div>

          {/* Phase 3: Status text with clip reveal */}
          <div className="flex flex-col items-center gap-2">
            <h1 className="font-heading font-bold text-lg uppercase tracking-widest text-neon-cyan loader-text-reveal">
              {status}
              <span className="loader-cursor" aria-hidden="true">_</span>
            </h1>
            {detail && (
              <p className="text-xs text-muted tracking-wide loader-text-reveal-delayed">
                {detail}
              </p>
            )}
          </div>

          {/* Phase 4: Neon progress bar (loops) */}
          {showProgress && (
            <div className="w-48 h-1 bg-surface-light overflow-hidden rounded-full loader-bar-in">
              <div className="h-full w-full bg-neon-cyan loader-bar-sweep" />
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
```

### CSS Keyframes (in `globals.css`)

```css
/* ─── Cinematic loader ─── */
@keyframes loader-frame-in {
  from { opacity: 0; transform: scale(0.95); }
  to   { opacity: 1; transform: scale(1); }
}

@keyframes loader-helmet-glow {
  0%, 100% { filter: drop-shadow(0 0 8px rgba(0,240,255,0.4)); }
  50%      { filter: drop-shadow(0 0 20px rgba(0,240,255,0.7)); }
}

@keyframes loader-text-reveal {
  from { clip-path: inset(0 100% 0 0); }
  to   { clip-path: inset(0 0 0 0); }
}

@keyframes loader-cursor-blink {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0; }
}

@keyframes loader-bar-sweep {
  from { transform: translateX(-100%); }
  to   { transform: translateX(100%); }
}

/* Loader animation classes */
.loader-frame-in {
  animation: loader-frame-in 0.4s ease-out both;
}

.loader-helmet-in {
  opacity: 0;
  animation: fade-in-up 0.3s ease-out 0.2s both;
}

.loader-helmet-glow {
  animation: loader-helmet-glow 2s ease-in-out infinite;
  animation-delay: 0.3s;
}

.loader-text-reveal {
  animation: loader-text-reveal 0.4s ease-out 0.4s both;
}

.loader-text-reveal-delayed {
  animation: loader-text-reveal 0.4s ease-out 0.55s both;
}

.loader-cursor {
  animation: loader-cursor-blink 0.8s steps(1) infinite;
  animation-delay: 0.8s;
  opacity: 0;
}

.loader-bar-in {
  opacity: 0;
  animation: fade-in-up 0.3s ease-out 0.6s both;
}

.loader-bar-sweep {
  animation: loader-bar-sweep 1.5s linear infinite;
  animation-delay: 0.7s;
}
```

### Loading.tsx Files (4 updates)

```tsx
// src/app/poll/[id]/loading.tsx
import { CinematicLoader } from "@/components/ui/cinematic-loader";

export default function Loading() {
  return (
    <CinematicLoader
      status="Chargement du dossier..."
      detail="Accession aux archives du Tribunal"
    />
  );
}
```

```tsx
// src/app/poll/[id]/results/loading.tsx — lighter variant
import { CinematicLoader } from "@/components/ui/cinematic-loader";

export default function Loading() {
  return (
    <CinematicLoader
      status="Recuperation du verdict..."
      detail="Consultation des deliberations"
      showProgress={false}
    />
  );
}
```

### Layout and CLS

- Uses same `min-h-screen flex items-center justify-center` + `max-w-lg` container as `PageLayout`
- The HUD card occupies the same viewport region as actual page content
- No structural mismatch — transition from loader to page content stays centered and same-width

### Performance Considerations

- **Compositor-friendly**: `transform` (scale, translateX) and `opacity` are GPU-composited — no layout/paint triggers
- **Exception**: `clip-path` on text reveal triggers paint, but on a tiny text element — negligible cost
- **Exception**: `filter: drop-shadow()` on the helmet icon is GPU-composited but may be expensive on very low-end devices. The icon is small (64px) so this is acceptable
- **Total animated elements**: 5 (frame, helmet, text, cursor, bar) — well within budget alongside the global scan-line overlay
- **No motion/react imports** — zero JS bundle cost for loading animations

### Font Loading

`next/font/google` with Orbitron uses `font-display: swap` by default. On cold first visit, the text may briefly render in the fallback font before Orbitron loads. The clip-path reveal animation does not depend on `ch` units or character width — it clips the entire element from right to left, so font metrics don't affect timing. The visual impact of a font swap mid-reveal is minimal and only affects the very first visit.

## Acceptance Criteria

### Functional
- [x] All 4 loading.tsx routes show the cinematic HUD boot sequence
- [x] Each route displays its unique status text in the Dredd lexicon
- [x] Results route uses lighter variant (no progress bar) to avoid double-ceremony with DELIBERATING phase
- [x] Progress bar loops continuously for routes that show it
- [x] DreddHelmetIcon renders centered with neon cyan pulse glow

### Visual
- [x] HUD frame uses angular clip-path (`.hud-card` class) with cyan border glow
- [x] Status text uses Orbitron font, uppercase, `tracking-widest`, neon-cyan color
- [x] Blinking cursor appears after text reveal completes
- [x] Animation sequence feels like a terminal boot (sequential phase reveal, not simultaneous)

### Accessibility
- [x] `prefers-reduced-motion` shows static fallback (no animations, all elements visible)
- [x] Screen readers get meaningful status text (not decorative cursor character) — `aria-hidden="true"` on cursor

### Performance
- [x] No motion/react imports — CSS-only animations
- [x] No layout shift — same container dimensions as target pages
- [x] Animations use compositor-friendly properties (transform, opacity) except minor clip-path on text

### Cleanup
- [x] `page-skeleton.tsx` deleted (no consumers remain)
- [x] No dead imports in any loading.tsx files

## References

- **Design language**: `src/app/globals.css:100-141` — `.hud-card` clip-path system
- **DELIBERATING loading pattern**: `src/components/results-page-client.tsx` — neon bar sweep reference
- **DreddHelmetIcon**: `src/components/ui/dredd-helmet-icon.tsx`
- **motion/react restriction**: `docs/solutions/performance-issues/vercel-react-best-practices-audit-next16.md`
- **Visual redesign brainstorm**: `docs/brainstorms/2026-02-18-mega-city-control-room-redesign-brainstorm.md`
- **Immersion pack brainstorm**: `docs/brainstorms/2026-02-19-mega-city-immersion-pack-brainstorm.md`
