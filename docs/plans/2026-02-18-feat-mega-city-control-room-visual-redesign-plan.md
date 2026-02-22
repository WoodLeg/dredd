---
title: "feat: Mega-City Control Room Visual Redesign"
type: feat
status: active
date: 2026-02-18
brainstorm: docs/brainstorms/2026-02-18-mega-city-control-room-redesign-brainstorm.md
---

# Mega-City Control Room Visual Redesign

## Overview

Transform the Dredd voting app from its current minimal dark-mode aesthetic into an immersive **Mega-City One Justice Department terminal** — a neon cyberpunk HUD with angular surfaces, electric cyan accents, scan line overlays, glitch effects, and fully redesigned neon grade buttons.

The vocabulary already says "dystopian tribunal" — the visuals need to match.

## Problem Statement

The current design uses a near-uniform dark palette (`#08080c` / `#12121a`) with minimal color differentiation. The only color pops are a gold CTA button and selected grade pills. Despite rich Dredd-themed vocabulary, the visual design reads as "dark-mode SaaS checkout." The Judge Dredd character only appears on error pages. The grade buttons are invisible ghost outlines until clicked.

## Proposed Solution

**"Mega-City Control Room"** — Full HUD terminal aesthetic with:
- Electric Cyan (`#00f0ff`) as primary neon accent
- Orbitron geometric sci-fi font for headings
- Angular clip-path cards (not rounded corners)
- Scan line CSS overlay on backgrounds
- Glitch chromatic aberration on "DREDD" title
- Neon-colored grade buttons with glow effects
- CRT flicker, neon pulse, scan line drift animations
- `prefers-reduced-motion` fallback for all animations
- Comic DNA: halftone textures, Dredd character prominence

## Technical Approach

### Architecture

All changes are CSS/styling-focused. No data model, API, or routing changes needed.

**Files to modify:**
| File | Change Type |
|------|-------------|
| `src/app/globals.css` | Major — new color tokens, scan line overlay, all new animations, prefers-reduced-motion |
| `src/app/layout.tsx` | Minor — add Orbitron font, update meta theme-color |
| `src/lib/grades.ts` | Minor — update 7 grade colors to neon palette |
| `src/components/ui/button.tsx` | Moderate — angular clip-path, neon glow styling |
| `src/components/ui/input.tsx` | Moderate — neon focus states, angular styling |
| `src/components/ui/dredd-feedback.tsx` | Minor — neon glow border colors |
| `src/components/ui/dredd-full-page.tsx` | Minor — neon treatment |
| `src/components/grade-badge.tsx` | Minor — update badge colors/glow |
| `src/components/vote-form.tsx` | Moderate — neon grade button redesign |
| `src/components/results-chart.tsx` | Minor — neon bar glow |
| `src/components/results-card.tsx` | Minor — angular card, winner neon glow |
| `src/components/poll-form.tsx` | Minor — neon input/button styling flows through |
| `src/components/admin-panel.tsx` | Minor — HUD status panel styling |
| `src/components/share-link.tsx` | Minor — HUD-style frame, monospace URL |
| `src/app/page.tsx` | Minor — glitch title class on "DREDD" heading |
| `src/app/icon.svg` | Minor — update favicon colors if needed |
| `e2e/*.spec.ts` | Conditional — only if data-testid or text selectors change |

**No new files** except possibly a font file if `next/font/google` doesn't work for Orbitron (fallback: self-host in `public/fonts/`).

### Implementation Phases

#### Phase 1: Foundation (Theme Tokens + Typography + Scan Lines)

The base layer that everything else builds on.

**1a. Color tokens** — `src/app/globals.css`
Update the `@theme inline` block with the new neon palette:

```css
@theme inline {
  /* Foundations — Mega-City terminal */
  --color-background: #08080c;
  --color-foreground: #e0e8f0;        /* cooler white (was #e6e0d6) */
  --color-surface: #0d1117;           /* blue-shifted dark (was #12121a) */
  --color-surface-light: #161b26;     /* blue-shifted light (was #1c1c28) */
  --color-border: #1a2a3a;            /* cyan-tinted (was #2e2e3d) */
  --color-muted: #5a7a8a;             /* cyan-muted (was #6b6b80) */

  /* Neon — primary interface */
  --color-neon-cyan: #00f0ff;
  --color-neon-magenta: #ff2d7b;

  /* Authority — Judge uniform (kept) */
  --color-primary: #b5241a;
  --color-primary-hover: #d43025;
  --color-secondary: #c4941e;
  --color-secondary-hover: #daa520;

  /* Grade neon spectrum */
  --color-grade-exemplaire: #39ff14;
  --color-grade-honorable: #00e5a0;
  --color-grade-acceptable: #00f0ff;
  --color-grade-tolerable: #ffb400;
  --color-grade-suspect: #ff6b2b;
  --color-grade-coupable: #ff2d7b;
  --color-grade-condamne: #ff0040;

  --font-sans: var(--font-geist-sans);
  --font-heading: var(--font-orbitron);
}
```

**1b. Orbitron font** — `src/app/layout.tsx`

```tsx
import { Geist } from "next/font/google";
import { Orbitron } from "next/font/google";

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const orbitron = Orbitron({ subsets: ["latin"], variable: "--font-orbitron", weight: ["400", "700", "900"] });
```

Apply both variables to `<body>` className. Add `<meta name="theme-color" content="#00f0ff" />` to metadata.

> **CSP note**: `next/font/google` downloads fonts at build time and self-hosts them, so no CSP change needed (confirmed in docs/solutions).

**1c. Scan line overlay** — `src/app/globals.css`

```css
body::after {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 0, 0, 0.03) 2px,
    rgba(0, 0, 0, 0.03) 4px
  );
  animation: scan-drift 20s linear infinite;
}

@keyframes scan-drift {
  from { transform: translateY(0); }
  to { transform: translateY(4px); }
}
```

**1d. prefers-reduced-motion** — `src/app/globals.css`

```css
@media (prefers-reduced-motion: reduce) {
  body::after {
    animation: none;
  }
  .animate-fade-in-up {
    animation: none;
  }
  .glitch-title {
    animation: none;
  }
  /* All other animation classes stripped */
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

**1e. Grade colors update** — `src/lib/grades.ts`

Update the GRADES array colors:
```ts
{ key: "excellent", label: "Exemplaire", color: "#39ff14" },
{ key: "tres-bien", label: "Honorable", color: "#00e5a0" },
{ key: "bien", label: "Acceptable", color: "#00f0ff" },
{ key: "assez-bien", label: "Tolérable", color: "#ffb400" },
{ key: "passable", label: "Suspect", color: "#ff6b2b" },
{ key: "insuffisant", label: "Coupable", color: "#ff2d7b" },
{ key: "a-rejeter", label: "Condamné", color: "#ff0040" },
```

**Exit criteria Phase 1:** App renders with new color tokens, Orbitron headings visible, scan line overlay animating, grades show neon colors. All existing functionality works.

---

#### Phase 2: Component Overhaul (Angular Cards, Neon Buttons, HUD Inputs)

**2a. Utility CSS classes** — `src/app/globals.css`

Add shared neon utility classes:

```css
/* Angular clip-path for HUD cards */
.hud-card {
  clip-path: polygon(
    0 12px, 12px 0, 100% 0, 100% calc(100% - 12px),
    calc(100% - 12px) 100%, 0 100%
  );
}

/* Neon glow utility */
.neon-glow-cyan {
  box-shadow: 0 0 8px rgba(0, 240, 255, 0.3), inset 0 0 8px rgba(0, 240, 255, 0.05);
}

/* Glitch title effect */
.glitch-title {
  position: relative;
}
.glitch-title::before,
.glitch-title::after {
  content: attr(data-text);
  position: absolute;
  inset: 0;
}
.glitch-title::before {
  color: #00f0ff;
  animation: glitch-1 3s infinite;
  clip-path: inset(0 0 65% 0);
}
.glitch-title::after {
  color: #ff2d7b;
  animation: glitch-2 3s infinite;
  clip-path: inset(65% 0 0 0);
}

@keyframes glitch-1 {
  0%, 95%, 100% { transform: translate(0); }
  96% { transform: translate(-2px, 1px); }
  97% { transform: translate(2px, -1px); }
}
@keyframes glitch-2 {
  0%, 95%, 100% { transform: translate(0); }
  96% { transform: translate(2px, -1px); }
  98% { transform: translate(-2px, 1px); }
}
```

**2b. Button component** — `src/components/ui/button.tsx`

Update variant styles:
- **primary**: Keep gold bg, add angular clip-path (`hud-card`), neon edge glow on hover
- **secondary**: Cyan outline border, transparent bg, glow on hover (`shadow-[0_0_12px_rgba(0,240,255,0.3)]`)
- **ghost**: Subtle cyan text on hover
- Replace `rounded-xl` with `hud-card` class (or inline clip-path)
- Update focus ring colors to cyan (`focus:ring-neon-cyan/40`)

**2c. Input component** — `src/components/ui/input.tsx`

- Replace `rounded-xl` with angular clip-path styling
- Focus state: `border-neon-cyan` with `shadow-[0_0_12px_rgba(0,240,255,0.4)]` (neon ignition effect)
- Error state: keep red glow but use `#ff0040` (brighter neon red)
- Add `transition-shadow duration-300` for smooth focus glow transition

**2d. Vote form grade buttons** — `src/components/vote-form.tsx`

Redesign grade buttons as neon pills:
- **Unselected**: Dim border matching grade color at 30% opacity, transparent bg
- **Hovered**: Border brightens to 70%, subtle glow appears (`box-shadow: 0 0 8px <grade-color>/30`)
- **Selected**: Full neon fill with grade color, bright glow (`box-shadow: 0 0 16px <grade-color>/50`), white text
- Add `transition-all duration-200` for smooth state changes
- Add neon pulse animation on hover (CSS only, not motion/react):

```css
@keyframes neon-pulse {
  0%, 100% { box-shadow: 0 0 8px var(--glow-color); }
  50% { box-shadow: 0 0 16px var(--glow-color), 0 0 24px var(--glow-color); }
}
```

**2e. Results components** — `src/components/results-card.tsx`, `src/components/results-chart.tsx`

- Results card: Angular clip-path card, subtle inner glow
- Winner card: Cyan border glow (`shadow-[0_0_20px_rgba(0,240,255,0.2)]`), gold badge kept
- Results bars: Add neon glow matching grade color, gradient fill

**2f. Share link** — `src/components/share-link.tsx`

- HUD-style frame with cyan border
- URL text in monospace font (`font-mono`)
- "COPIER" button in angular secondary style

**2g. Admin panel** — `src/components/admin-panel.tsx`

- Status panel: angular card with cyan border
- "En session" text: neon green glow
- "Cloturer" button: primary variant (gold + angular)

**Exit criteria Phase 2:** All components use angular clip-path, neon glow effects, and updated colors. Grade buttons are visually striking neon pills. Forms look like HUD interfaces.

---

#### Phase 3: Page-Level Polish + Title Effects

**3a. Home page glitch title** — `src/app/page.tsx`

```tsx
<h1 className="text-4xl font-heading font-black tracking-widest uppercase glitch-title" data-text="DREDD">
  DREDD
</h1>
```

Apply Orbitron (`font-heading`), ALL CAPS, wide letter-spacing, glitch CSS effect.

**3b. All page headings** — Apply `font-heading uppercase tracking-wider` to all `<h1>` elements across pages:
- `src/app/page.tsx` (home)
- `src/app/poll/[id]/page.tsx` (vote)
- `src/app/poll/[id]/results/page.tsx` (results)
- `src/app/poll/[id]/admin/[token]/page.tsx` (admin)

**3c. DreddFeedback neon borders** — `src/components/ui/dredd-feedback.tsx`

- Error variant: border changes to `#ff0040` (neon red), glow shadow `rgba(255,0,64,0.4)`
- Success variant: border changes to `#00f0ff` (neon cyan), glow shadow `rgba(0,240,255,0.4)`

**3d. DreddFullPage neon treatment** — `src/components/ui/dredd-full-page.tsx`

- Speech bubble border: neon red glow
- Background: subtle blue-shifted surface

**3e. Vote submitted page** — `src/app/poll/[id]/page.tsx` (VoteConfirmation component)

- Centered text with Orbitron heading
- Subtle cyan accent on confirmation message

**3f. CRT flicker on headings** — `src/app/globals.css`

```css
.crt-flicker:hover {
  animation: crt-flicker 0.15s ease-in-out;
}

@keyframes crt-flicker {
  0% { opacity: 1; }
  25% { opacity: 0.97; }
  50% { opacity: 1; }
  75% { opacity: 0.98; }
  100% { opacity: 1; }
}
```

Apply `.crt-flicker` class to headings.

**Exit criteria Phase 3:** "DREDD" title has glitch effect, all headings use Orbitron, DreddFeedback/FullPage have neon treatment, CRT flicker works on heading hover.

---

#### Phase 4: Meta, Favicon & Final Polish

**4a. Meta theme-color** — `src/app/layout.tsx`

Update Next.js metadata:
```ts
export const metadata: Metadata = {
  title: "Dredd — Tribunal de Mega-City One",
  description: "...",
  themeColor: "#00f0ff",
};
```

**4b. OG image** — Consider generating or updating if one exists. Low priority.

**4c. Favicon** — `src/app/icon.svg`

Evaluate if the Dredd helmet favicon needs color updates. The helmet uses its own color palette (#192E47, #DACE4B, #97312A) — might keep as-is since it's already distinctive, or add a subtle cyan accent.

**4d. Final visual QA**

Use Playwright MCP to navigate through all pages and screenshot:
1. Home page (empty form)
2. Home page (filled form)
3. Vote page (unselected grades)
4. Vote page (selected grades — show neon pills)
5. Vote submitted confirmation
6. Admin panel (open + closed states)
7. Results page
8. 404 page
9. DreddFeedback slide-in (error + success)

**4e. E2E test pass** — `pnpm test:e2e`

Run full E2E suite. Tests should pass without changes since we're only modifying styling, not text content or data-testid attributes. If any fail, investigate and fix.

**Exit criteria Phase 4:** All meta updated, all pages visually verified, E2E tests pass.

## Acceptance Criteria

### Functional Requirements

- [ ] All 7 pages render correctly with new styling
- [ ] Grade buttons show neon colors matching the spectrum (green -> red)
- [ ] Selected grade buttons have bright neon glow
- [ ] "DREDD" title has glitch chromatic aberration effect
- [ ] All headings use Orbitron font (ALL CAPS, wide letter-spacing)
- [ ] Cards use angular clip-path instead of rounded corners
- [ ] Scan line overlay visible on all pages
- [ ] Inputs glow cyan on focus
- [ ] Buttons have neon glow on hover

### Non-Functional Requirements

- [ ] `prefers-reduced-motion` disables all animations (scan lines, glitch, flicker, pulse)
- [ ] No hydration mismatches (follow documented patterns from docs/solutions/)
- [ ] CSS animations only — no new motion/react imports for decorative effects
- [ ] Orbitron loaded via `next/font/google` (no CSP changes needed)
- [ ] No visible performance degradation (scan line overlay uses `pointer-events: none` and compositing)
- [ ] `pnpm build` succeeds (TypeScript + build checks)
- [ ] `pnpm test:e2e` passes

### Quality Gates

- [ ] Visual QA via Playwright screenshots on all 7+ page states
- [ ] Manual check of reduced-motion mode
- [ ] `pnpm lint` passes

## Risk Analysis & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| `clip-path` not supported on older browsers | Low — clip-path has 97%+ support (caniuse) | Graceful fallback: cards just show as rectangles |
| Scan line overlay impacts scroll perf | Medium — fixed overlay with `pointer-events: none` | Use `will-change: transform` on overlay, test on mobile |
| Orbitron + Geist font loading delay | Low — next/font/google preloads | Both fonts specified with `display: swap` by default |
| Neon glow box-shadows expensive on mobile | Medium — multiple box-shadows per element | Limit glow to 1-2 shadows max, simplify on mobile if needed |
| E2E tests break due to styling changes | Low — tests use text selectors not style-based | Run full suite in Phase 4, fix if needed |
| Color contrast accessibility | Medium — neon on dark can have low contrast | Verify WCAG AA for body text (foreground on background), neon colors are for decorative/accent only |

## Dependencies & Prerequisites

- Dev server running on port 3999
- Playwright installed for visual QA
- `next/font/google` must support Orbitron (confirmed: it does)
- No external dependencies to add — all CSS-based

## References & Research

### Internal References
- Color tokens: `src/app/globals.css:3-29`
- Grade system: `src/lib/grades.ts:1-27`
- Button component: `src/components/ui/button.tsx:1-72`
- Input component: `src/components/ui/input.tsx:1-24`
- DreddFeedback: `src/components/ui/dredd-feedback.tsx:1-103`
- DreddFullPage: `src/components/ui/dredd-full-page.tsx:1-45`
- Font loading: `src/app/layout.tsx:1-30`
- PageLayout: `src/components/page-layout.tsx:1-14`
- Vote form: `src/components/vote-form.tsx:1-136`
- Results chart: `src/components/results-chart.tsx:1-59`
- Results card: `src/components/results-card.tsx:1-56`
- Judge Dredd SVG: `src/app/icons/dredd/judge.tsx:1-575`

### Institutional Learnings (docs/solutions/)
- **Animation approach**: Use CSS keyframes for decorative effects, keep motion/react only for AnimatePresence/whileTap (`docs/solutions/performance-issues/vercel-react-best-practices-audit-next16.md`)
- **Hydration safety**: Never branch on `typeof window` in useState (`docs/solutions/runtime-errors/next-hydration-mismatch-typeof-window-useState.md`)
- **CSP constraint**: `font-src 'self'` only — next/font/google self-hosts at build time, safe (`docs/solutions/code-quality/full-app-review-security-testing-cleanup.md`)
- **SVG sizing**: Use parent container overrides for hardcoded SVG dimensions (`docs/solutions/runtime-errors/`)

### Brainstorm
- `docs/brainstorms/2026-02-18-mega-city-control-room-redesign-brainstorm.md`
