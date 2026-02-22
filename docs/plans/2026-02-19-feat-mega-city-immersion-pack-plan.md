---
title: "feat: Mega-City Immersion Pack"
type: feat
status: completed
date: 2026-02-19
brainstorm: docs/brainstorms/2026-02-19-mega-city-immersion-pack-brainstorm.md
---

# feat: Mega-City Immersion Pack

## Overview

Transform Dredd from a functional voting app into an immersive Mega-City One experience through five coordinated pillars: a teaching page, results ceremony, soundscape, page transitions, and home page upgrade. The voting UX is already solid — these improvements focus on atmosphere, polish, and discoverability.

## Problem Statement / Motivation

The visual theming (neon HUD, scan lines, Orbitron font, angular cards, Judge Dredd character) is deep and consistent. But the experience is still mostly static:

- **No explanation** — newcomers have no way to learn what Jugement Majoritaire is
- **Flat results** — the verdict appears all at once, no drama
- **Silent** — the visual theme begs for atmosphere but there's no audio
- **Abrupt navigation** — pages appear instantly with no transition
- **Sparse home page** — functional but doesn't sell the experience

## Proposed Solution

Five pillars, implemented in dependency order:

| Phase | Pillar | Scope |
|-------|--------|-------|
| 1 | Home Page Upgrade | SVG skyline, visual hierarchy, `/le-code` link |
| 1 | Teaching Page (`/le-code`) | Dredd lectures citizens on Jugement Majoritaire |
| 2 | Page Transitions | React `<ViewTransition>` cross-fades between routes |
| 3 | Soundscape | Ambient + SFX + dramatic sounds with mute toggle |
| 4 | Results Ceremony | Staged verdict reveal with Dredd character + sound |

---

## Technical Approach

### Architecture

#### Role Model (Narrative Framework)

| Role | Who | In-app term |
|------|-----|-------------|
| **Judge** | Poll creator | Juge en Chef |
| **Citizens** | Voters giving depositions | Citoyens |
| **Dredd** | The app / narrator | System voice |

#### Key Technical Decisions

1. **Page transitions**: React `<ViewTransition>` (native in Next.js 16 via `experimental.viewTransition`). NOT motion/react AnimatePresence — the FrozenRouter hack is fragile and breaks Server Components.
2. **Audio SFX**: `use-sound` library (1KB + async Howler.js). Simple API, handles autoplay policy.
3. **Ambient audio**: Vanilla `HTMLAudioElement` via `useRef` in the SoundscapeProvider. Persists across navigations in root layout.
4. **Sound state**: Context provider following the `DreddFeedbackProvider` pattern. Sound OFF by default, persisted in localStorage.
5. **Teaching page**: Server Component with client islands for scroll-triggered animations via motion `useInView`.
6. **SVG skyline**: Inline SVG component, positioned absolutely behind home page content. Static (no parallax).

#### Cross-Pillar Interaction Rules

| Interaction | Behavior |
|-------------|----------|
| Sound + page transitions | Ambient continues seamlessly (player lives in root layout above page tree) |
| Page transition → results page | Cross-fade completes first, then ceremony begins |
| Sound + results ceremony | Gavel/sting SFX accompanies the verdict announcement phase |
| Sound + DreddFeedback slide-in | Subtle notification sound on appear (different tone for error vs success) |
| Teaching page + sound | Ambient plays if enabled; no page-specific SFX |
| `prefers-reduced-motion` + sound | Visual animations only — no effect on audio. Sound is independently controlled by toggle. |

---

### Implementation Phases

#### Phase 1: Home Page + Teaching Page

These have no dependencies on other pillars and establish visual foundations.

##### 1a. Home Page Upgrade

**Files to modify:**
- `src/app/page.tsx` — restructure layout with hero section, skyline, `/le-code` link
- `src/app/globals.css` — skyline positioning/animation utilities if needed

**Files to create:**
- `src/components/mega-city-skyline.tsx` — inline SVG component of Mega-City skyline silhouette

**Design:**
- SVG skyline silhouette positioned absolutely behind main content, using neon-cyan at low opacity
- Hero section: larger "DREDD" glitch title, subtitle, prominent `/le-code` link (Button secondary variant)
- Visual separator between hero/explanation area and the `PollForm`
- Skyline must scale gracefully on mobile (CSS `object-fit` or viewBox scaling)
- Keep skyline SVG simple — outline shapes only, avoid thousands of path elements

**Acceptance criteria:**
- [x] SVG Mega-City skyline renders behind home page content
- [x] Skyline is responsive (scales on mobile without overflow)
- [x] Prominent "Le Code" link navigates to `/le-code`
- [x] Clear visual separation between intro/hero and poll creation form
- [x] `PollForm` functionality unchanged
- [x] Existing E2E tests pass (`e2e/create-poll.spec.ts`)

##### 1b. Teaching Page (`/le-code`)

**Files to create:**
- `src/app/le-code/page.tsx` — Server Component, page metadata, renders sections
- `src/app/le-code/le-code-client.tsx` — Client component with scroll-triggered animations

**Content sections (single long-scroll page):**

1. **"La Loi, c'est moi."** — Introduction. What is this system? Dredd establishes authority.
2. **"Les Suspects"** — How candidates/options work. Each suspect stands before the tribunal.
3. **"L'Echelle de Jugement"** — The 7-grade scale from Exemplaire to Condamne. Render each grade with `GradeBadge` component and neon colors.
4. **"La Mention Majoritaire"** — How the median grade is determined. This is the key differentiator. Visual diagram showing votes being sorted and the median found.
5. **"Pourquoi ce systeme?"** — Why it's better than traditional voting. Resistant to strategic voting, more expressive.
6. **"Procedure"** — Brief how-to-use flow: Ouvrir l'audience → Transmettre → Verdict. CTA button to create a poll.

**Visual approach:**
- Each section uses `hud-card` styling with the Judge Dredd character (reuse existing `JudgeDredd` SVG at different scales, wrapped in sized containers)
- Scroll-triggered fade-in-up animations using motion `useInView` hook (client boundary on the animation wrapper only)
- Orbitron headings, Geist body text
- Section 4 (median diagram) needs a simple animated visualization — could be a bar chart of grades with the median highlighted

**Accessibility:**
- Proper heading hierarchy (h1 → h2 per section)
- `aria-hidden="true"` on decorative Dredd illustrations
- Landmark regions for each section
- Skip-to-content link at top

**Acceptance criteria:**
- [x] `/le-code` route renders with all 6 content sections
- [x] Scroll-triggered animations work (fade-in-up on each section)
- [x] Grade scale section renders all 7 grades with correct neon colors
- [x] Median explanation section has a visual diagram/illustration
- [x] CTA at bottom links to home page (poll creation)
- [x] Page metadata (title, description) set correctly
- [x] Accessible heading hierarchy and landmarks
- [x] Responsive layout (readable on mobile)

---

#### Phase 2: Page Transitions

Infrastructure that enhances all existing and new pages.

**Files to modify:**
- `next.config.ts` — add `experimental: { viewTransition: true }`
- `src/app/page.tsx` — wrap root element in `<ViewTransition>`
- `src/app/le-code/page.tsx` — wrap root element in `<ViewTransition>`
- `src/app/poll/[id]/page.tsx` — wrap root element in `<ViewTransition>`
- `src/app/poll/[id]/results/page.tsx` — wrap root element in `<ViewTransition>`
- `src/app/poll/[id]/admin/[token]/page.tsx` — wrap root element in `<ViewTransition>`
- `src/app/not-found.tsx` — wrap root element in `<ViewTransition>`
- `src/app/globals.css` — custom transition animations via `::view-transition-old()` / `::view-transition-new()` pseudo-selectors

**Implementation:**
```tsx
// Each page.tsx wraps its root content:
import { ViewTransition } from 'react';

export default function SomePage() {
  return (
    <ViewTransition>
      <main className="...">
        {/* page content */}
      </main>
    </ViewTransition>
  );
}
```

**Custom transition CSS:**
- Default cross-fade for general navigation (200-300ms)
- Consider a subtle glitch/scan-line effect for transitions (fits the aesthetic)
- `@media (prefers-reduced-motion: reduce)` → disable all transition animations

**Key points:**
- `<ViewTransition>` works in Server Components — no `"use client"` needed
- Layout.tsx stays unchanged (no wrapper needed)
- Progressive enhancement — unsupported browsers get instant navigation
- Does NOT conflict with existing `animate-fade-in-up` CSS (those fire on mount, ViewTransition fires during route change)

**Acceptance criteria:**
- [x] Cross-fade transition visible when navigating between any two pages
- [x] Transition timing is 200-300ms (fast, not sluggish)
- [x] `prefers-reduced-motion` disables transition animations
- [x] No regression in page load performance
- [x] Server Components remain server-rendered (no forced client boundaries)
- [x] All existing E2E tests pass (Playwright may need `waitForLoadState` adjustments)

---

#### Phase 3: Soundscape

New audio infrastructure layered on top of the existing app.

**Files to create:**
- `src/lib/soundscape-context.tsx` — `SoundscapeProvider` + `useSoundscape()` hook
- `src/components/ui/sound-toggle.tsx` — fixed-position mute/unmute button

**Files to modify:**
- `src/app/layout.tsx` — mount `SoundscapeProvider` alongside `DreddFeedbackProvider`
- `src/components/ui/button.tsx` — add click SFX via `useSoundscape().play('click')`
- `src/components/poll-form.tsx` — add success SFX on poll creation
- `src/components/vote-form.tsx` — add success SFX on vote submission
- `src/components/admin-panel.tsx` — add SFX on poll close
- `src/components/share-link.tsx` — add SFX on copy
- `src/components/ui/dredd-feedback.tsx` — add notification SFX on slide-in

**Audio files to source (royalty-free, placed in `public/sounds/`):**

| Sound | Usage | Target size | Format |
|-------|-------|-------------|--------|
| `ambient-drone.mp3` | Background hum on all pages | ~300KB (15-30s loop, 96kbps mono) | MP3 |
| `click.mp3` | Button clicks | ~2KB | MP3 |
| `success.mp3` | Form submissions (create, vote) | ~15KB | MP3 |
| `notification.mp3` | DreddFeedback slide-in | ~10KB | MP3 |
| `error.mp3` | Error feedback | ~10KB | MP3 |
| `gavel.mp3` | Verdict announcement | ~30KB | MP3 |
| `dramatic-sting.mp3` | Results ceremony start | ~40KB | MP3 |
| **Total** | | **~410KB** | |

**SoundscapeProvider architecture:**
```
SoundscapeProvider (in root layout)
├── State: soundEnabled (boolean, localStorage-persisted)
├── Ambient: HTMLAudioElement via useRef (loop, low volume)
├── SFX: use-sound hooks for each sound
├── API: play(soundId), toggleSound(), isSoundEnabled
└── Renders: <SoundToggle /> fixed-position button
```

**Sound toggle:**
- Fixed bottom-right corner
- Speaker icon (unmuted) / speaker-with-slash icon (muted)
- `z-40` (below DreddFeedback's `z-50`)
- `role="switch"` + `aria-checked` + `aria-label`
- Keyboard accessible (Enter/Space to toggle)
- Neon cyan border/glow when enabled, muted/dim when disabled

**Sound behavior:**
- Sound OFF by default on first visit
- `localStorage` key: `dredd_sound_enabled`
- Enabling sound on first click resumes AudioContext (browser autoplay policy)
- Ambient starts immediately when enabled, continues across navigations
- Ambient stops immediately when disabled
- SFX only play when sound is enabled
- Rapid clicks: `use-sound` handles interrupt (new sound cuts previous)
- Ambient volume: 15-20% of max. SFX volume: 60-80%. Not user-adjustable (on/off only).

**Accessibility:**
- Toggle is early in tab order (rendered in root layout)
- Clear `aria-label`: "Activer le son" / "Couper le son"
- Sound never replaces visual feedback (DreddFeedback slide-in always appears regardless)
- `prefers-reduced-motion` has no effect on audio (visual and audio are independent)

**Acceptance criteria:**
- [x] Sound toggle visible on all pages (fixed bottom-right)
- [x] Sound OFF by default
- [x] Toggling ON starts ambient drone + enables SFX
- [x] Toggling OFF stops all audio immediately
- [x] Preference persisted across sessions (localStorage)
- [x] Ambient continues seamlessly across page navigations
- [x] Button clicks, form submissions, copy, and feedback each have distinct SFX
- [x] Sound toggle is keyboard accessible with proper ARIA attributes
- [x] Total audio assets under 500KB (0KB — all Web Audio API synthesized)
- [x] Audio files lazy-loaded (not blocking page render)
- [x] All existing E2E tests unaffected (sound is off by default)

**Dependency:** Install `use-sound` package (`pnpm add use-sound`)

---

#### Phase 4: Results Ceremony

The dramatic centerpiece — Dredd pronounces the sentence.

**Files to modify:**
- `src/app/poll/[id]/results/results-page-client.tsx` — multi-phase state machine replacing immediate results render

**State machine:**

```
Phase 1: DELIBERATING (3s)
  → Dredd character centered, "Deliberation en cours..." text
  → Subtle pulsing/scanning animation
  → Dramatic sting SFX plays (if sound enabled)
  → Skip button available ("Passer au verdict")

Phase 2: VERDICT (4s)
  → Dredd announces winner: name + median grade in large text
  → Gavel SFX plays (if sound enabled)
  → HUD card with neon glow, dramatic entrance animation
  → If tied: show all tied winners
  → Skip button available

Phase 3: FULL_RESULTS
  → Existing results list fades in (staggered cards with bar charts)
  → No skip needed — this is the final state
```

**Edge cases:**
- **Zero votes**: Skip ceremony entirely, show existing "Aucune deposition enregistree" message
- **Ties**: Show all tied winners in Phase 2 (e.g., "Pizza et Sushi — Exemplaire")
- **Repeat visits**: Store `ceremony_seen_${pollId}` in localStorage. First visit: full ceremony. Subsequent visits: skip to Phase 3 (full results).
- **Skip button**: Clicking skip at any phase jumps directly to Phase 3. Satisfies WCAG 2.2.1 (timing control).

**Timing:**
- Phase 1 → Phase 2: 3 seconds auto-advance
- Phase 2 → Phase 3: 4 seconds auto-advance
- Skip button available during Phases 1 and 2
- `prefers-reduced-motion`: reduce to 1s per phase (or skip directly to Phase 3)

**Visual design:**
- Phase 1: Dark overlay with Dredd character (reuse `JudgeDredd` SVG), scan-line animation intensified, text in Orbitron
- Phase 2: Winner card with neon-cyan glow, `GradeBadge` for median grade, scale-in entrance animation
- Phase 3: Existing `ResultsCard` components with staggered fade-in-up

**Sound integration:**
- Phase 1 start: `dramatic-sting.mp3`
- Phase 2 start: `gavel.mp3`
- Phase 3: no additional sound (ambient continues)

**Acceptance criteria:**
- [x] First visit to results shows 3-phase ceremony
- [x] Phase 1 shows Dredd deliberating with animation
- [x] Phase 2 reveals winner name + median grade dramatically
- [x] Phase 3 shows full ranked results (existing layout)
- [x] Skip button works at any phase, jumping to full results
- [x] Repeat visits skip to full results (localStorage tracking)
- [x] Zero-vote polls skip ceremony
- [x] Tied winners displayed correctly in Phase 2
- [x] Sound effects play at correct moments (when sound is enabled)
- [x] `prefers-reduced-motion` shortens or skips ceremony
- [x] E2E tests updated to account for ceremony (wait for Phase 3 or use skip)

---

## Acceptance Criteria

### Functional Requirements

- [x] Teaching page at `/le-code` with 6 content sections explaining Jugement Majoritaire
- [x] Home page shows SVG skyline + prominent link to `/le-code`
- [x] Cross-fade transitions between all routes
- [x] Global sound system with ambient + SFX + mute toggle
- [x] Staged results ceremony with deliberation → verdict → full results

### Non-Functional Requirements

- [x] Total audio assets < 500KB (0KB — Web Audio API synthesized)
- [x] Page transitions < 300ms (250ms cross-fade)
- [x] No Lighthouse regression on home page (Performance score)
- [x] All animations respect `prefers-reduced-motion`
- [x] Sound toggle WCAG AA accessible (keyboard, ARIA)
- [x] Teaching page has proper heading hierarchy and landmarks
- [x] Results ceremony has skip mechanism (WCAG 2.2.1 timing)

### Quality Gates

- [x] All existing E2E tests pass (updated for ceremony if needed)
- [ ] New E2E test for teaching page content
- [ ] New E2E test for results ceremony flow (skip + full)
- [x] Manual test: sound toggle persists across sessions
- [x] Manual test: ambient continues across navigations
- [x] Manual test: ceremony + sound + transition work together on results page

---

## Dependencies & Prerequisites

| Dependency | Type | Phase |
|------------|------|-------|
| `use-sound` npm package | New dependency | Phase 3 |
| Royalty-free audio files (7 files, ~410KB) | External assets | Phase 3 |
| SVG Mega-City skyline illustration | Asset creation | Phase 1 |
| `experimental.viewTransition` Next.js flag | Config change | Phase 2 |

---

## Risk Analysis & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| ViewTransition API not stable in Next.js 16 | Medium | Progressive enhancement — no-op in unsupported browsers. Can revert to CSS-only transitions. |
| Audio autoplay blocked on mobile | Medium | Sound OFF by default. User must tap toggle first (satisfies browser policy). |
| Audio files too large | Medium | Strict 500KB budget. Mono, compressed MP3. Lazy-loaded. |
| Results ceremony annoying on repeat visits | High | localStorage tracking skips ceremony after first view |
| SVG skyline too complex (perf) | Low | Keep it simple — outline shapes only, < 100 path elements |
| E2E tests broken by ceremony timing | Medium | Add skip mechanism, update E2E to use skip button or wait for final state |

---

## Implementation Order

```
Phase 1 (no dependencies, parallelizable)
├── 1a. Home Page Upgrade (skyline SVG + layout + /le-code link)
└── 1b. Teaching Page (/le-code route + content + scroll animations)

Phase 2 (infrastructure)
└── Page Transitions (ViewTransition config + CSS + wrap all pages)

Phase 3 (new system)
└── Soundscape (provider + toggle + audio files + integration points)

Phase 4 (depends on Phase 3 for sound)
└── Results Ceremony (state machine + animations + sound cues + skip)
```

Phases 1a and 1b can be built in parallel. Each subsequent phase builds on the previous.

---

## References & Research

### Internal References
- Brainstorm: `docs/brainstorms/2026-02-19-mega-city-immersion-pack-brainstorm.md`
- DreddFeedbackProvider pattern: `src/lib/dredd-feedback-context.tsx`
- JudgeDredd character SVG: `src/app/icons/dredd/judge.tsx`
- Results page: `src/app/poll/[id]/results/results-page-client.tsx`
- Grades system: `src/lib/grades.ts`
- GradeBadge component: `src/components/grade-badge.tsx`
- Vercel React best practices audit: `docs/solutions/performance-issues/vercel-react-best-practices-audit-next16.md`
- Hydration mismatch learnings: `docs/solutions/runtime-errors/next-hydration-mismatch-typeof-window-useState.md`

### External References
- [React `<ViewTransition>` reference](https://react.dev/reference/react/ViewTransition)
- [Next.js viewTransition config](https://nextjs.org/docs/app/api-reference/config/next-config-js/viewTransition)
- [use-sound library](https://github.com/joshwcomeau/use-sound)
- [MDN Web Audio API best practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices)
- [WCAG 1.4.2 Audio Control](https://www.w3.org/WAI/WCAG21/Understanding/audio-control.html)
- [Chrome autoplay policy](https://developer.chrome.com/blog/autoplay)
