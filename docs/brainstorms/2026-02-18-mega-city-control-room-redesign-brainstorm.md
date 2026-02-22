# Brainstorm: Mega-City Control Room Visual Redesign

**Date**: 2026-02-18
**Status**: Ready for planning

## What We're Building

A full visual overhaul of the Dredd voting app, transforming it from a generic dark-mode SaaS look into an immersive **Mega-City One Justice Department terminal** — a neon cyberpunk HUD with comic book accents.

### Problem Statement

The current design uses a near-uniform dark palette (`#08080c` backgrounds, `#12121a` surfaces) with minimal color contrast. The only pops of color are the gold CTA button and selected grade pills. Despite rich dystopian vocabulary (Dredd lexical field), the visual design reads as "dark-mode Stripe checkout" — clean, minimal, and completely at odds with the Mega-City One theme.

### Vision

The app should feel like a Justice Department terminal interface: angular, glowing, alive with neon diagnostics. A citizen accessing this app should feel the weight of Mega-City One's authority infrastructure — scan lines humming, neon borders pulsing, Orbitron typeface screaming AUTHORITY.

## Why This Approach

**"Mega-City Control Room"** was chosen over "Neon Streets" (too atmospheric/moody) and "2000 AD Digital" (too comic-gimmicky). The HUD terminal aesthetic:

- Best matches the app's function (a "judicial system interface")
- Provides clear visual hierarchy through neon glow intensity
- Keeps UI functional/readable while being visually striking
- Allows comic book flavor without dominating (halftone textures, bold Dredd character)

## Key Decisions

### Color Palette

| Role | Current | New | Notes |
|------|---------|-----|-------|
| Primary accent | Gold `#c4941e` | Electric Cyan `#00f0ff` | Primary neon, links, focus states, active borders |
| Secondary accent | — | Hot Magenta `#ff2d7b` | Hover highlights, secondary CTAs, "danger" neon |
| Authority / Error | Dredd Red `#b5241a` | Keep `#b5241a` | Errors, closed states, "Condamne" grade |
| Success / Winner | Gold `#c4941e` | Keep `#c4941e` | Winner highlights, success feedback, CTA buttons |
| Background | `#08080c` | Deepen or keep | May add subtle blue/purple tint for depth |
| Surface | `#12121a` | Slightly blue-shifted | Cards should feel like glass/holographic panels |
| Border | `#2e2e3d` | Cyan-tinted `#1a3a4a` | Subtle neon bleed into borders |
| Text primary | `#e6e0d6` (warm beige) | Cooler white `#e0e8f0` | Shift from warm to cool to match neon aesthetic |
| Text muted | `#6b6b80` | Cyan-muted `#5a7a8a` | Muted text gets a slight cyan tint |

### Grade Button Colors (Neon Remap)

Each grade gets its own neon glow identity:

| Grade | Current Color | New Neon Color | Glow Effect |
|-------|--------------|----------------|-------------|
| Exemplaire | `#2d8e42` (green) | Electric Green `#39ff14` | Bright green glow |
| Honorable | `#3a7d32` (forest) | Cyan-Green `#00e5a0` | Teal glow |
| Acceptable | `#7a9a2e` (olive) | Cyan `#00f0ff` | Electric cyan glow |
| Tolerable | `#c4941e` (gold) | Amber `#ffb400` | Warm amber glow |
| Suspect | `#d47b1e` (orange) | Neon Orange `#ff6b2b` | Hot orange glow |
| Coupable | `#d43025` (red) | Hot Magenta `#ff2d7b` | Magenta glow |
| Condamne | `#b5241a` (dark red) | Deep Red `#ff0040` | Red danger glow |

### Typography

- **Headings**: Orbitron (Google Fonts) — geometric, futuristic, ALL CAPS with wide letter-spacing (`tracking-wider` or `tracking-widest`)
- **Body text**: Keep Geist Sans — clean, readable, neutral
- **Labels/badges**: Orbitron at small sizes or Geist with uppercase styling
- **Monospace accents**: For URLs, IDs, technical data — use a monospace font (Geist Mono or JetBrains Mono)

### Surface & Texture Effects

- **Scan lines**: CSS pseudo-element overlay on `<body>` — repeating linear gradient of semi-transparent lines (1px dark every 3-4px). Subtle opacity (~0.03-0.05)
- **Card surfaces**: Angular clip-path corners (top-left and bottom-right cut at 45deg). Subtle inner glow (`box-shadow: inset 0 0 20px rgba(0,240,255,0.05)`)
- **Halftone accent**: Optional CSS radial-gradient dot pattern on specific surfaces (comic DNA). Very subtle, maybe only on hover states
- **Background depth**: Subtle radial gradient from center (slightly lighter) to edges (darker), giving a "spotlight" or "monitor vignette" feel

### Animation & Effects

- **Glitch title**: The "DREDD" heading on the home page gets a CSS glitch/chromatic aberration effect (clip-path based text offset with cyan/magenta color shifts on a looping keyframe)
- **CRT flicker**: Subtle opacity fluctuation on hover for headings (very fast, barely perceptible — `0.97 -> 1.0 -> 0.98` over 0.1s)
- **Neon pulse**: Grade buttons pulse glow on hover (box-shadow intensity oscillation). Selected grade has steady bright glow
- **Scan line drift**: The scan line overlay slowly drifts downward (CSS animation, very slow — 15-20s cycle)
- **Input focus**: Neon border ignites on focus (transition from dark border to full cyan glow)
- **Submit button**: Glow intensifies on hover, slight scale-up, neon flare effect

### Component Redesigns

- **Buttons (CTA)**: Keep gold but add neon edge glow, angular clip-path shape instead of rounded corners
- **Buttons (Secondary)**: Cyan outline with glow on hover, transparent fill
- **Cards**: Angular clipped corners, thin cyan border with glow, dark glass surface
- **Inputs**: Dark surface, subtle inner glow, cyan border on focus with neon ignition transition
- **Grade pills**: Each grade is a neon-colored pill with matching glow. Unselected = dim outline. Selected = full neon fill + glow. Row should feel like a "spectrum analyzer" or "diagnostic readout"
- **Results bars**: Neon-colored gradient bars with glow effect, animated fill on page load
- **Share link box**: HUD-style frame with monospace URL, "COPIER" button in angular style

### Dredd Character Integration (Comic DNA)

- Keep prominent on 404/error pages (already great)
- Consider a small Dredd helmet icon in the header/title area on all pages
- DreddFeedback slide-in should have a neon glow border matching the variant color

## Affected Pages

1. **Home** (`/`) — Form page: glitch title, HUD inputs, angular CTA
2. **Vote** (`/poll/[id]`) — Grade selector redesign is the star here
3. **Vote submitted** — Confirmation with neon accents
4. **Admin** (`/poll/[id]/admin/[token]`) — HUD status panel
5. **Results** (`/poll/[id]/results`) — Neon results bars, winner highlight
6. **404 / Error pages** — Already has Dredd character, needs neon treatment
7. **Global layout** — Scan lines, background, font loading

## Resolved Questions

1. **Performance budget**: Yes — add `prefers-reduced-motion` fallback that strips all animations (scan lines, glitch, flicker, pulse). Users get a clean static neon look, still striking but no motion.
2. **Mobile considerations**: Keep angular clip-path everywhere — the HUD identity doesn't compromise on mobile. Same cuts, same vibe.
3. **Favicon/meta**: Yes — update theme-color meta tag to cyan, update OG image, consistent neon branding across all meta.

## Out of Scope (for now)

- Sound effects (would be cool but adds complexity)
- Dredd character on every page (only where it currently appears + subtle helmet icon)
- Custom cursor (tempting but accessibility concern)
- Full page transition animations between routes
