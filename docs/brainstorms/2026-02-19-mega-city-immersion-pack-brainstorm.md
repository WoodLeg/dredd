# Mega-City Immersion Pack — Brainstorm

**Date:** 2026-02-19
**Status:** Draft
**Branch:** TBD (from `main`)

---

## What We're Building

A suite of design, UX, and atmosphere improvements that transform Dredd from a functional voting app into an immersive Mega-City One experience. Five pillars:

1. **Teaching Page** — Dredd's intimidating lecture explaining Jugement Majoritaire
2. **Results Ceremony** — Dredd pronounces the sentence with staged reveal
3. **Soundscape** — Ambient audio, interaction SFX, dramatic verdict sounds
4. **Page Transitions** — Animated transitions between routes
5. **Home Page Upgrade** — More atmospheric, dramatic landing

## Why This Approach

The visual theming (neon HUD, scan lines, Orbitron font, angular cards, Judge Dredd character) is already deep and consistent. But the experience is still mostly static — pages appear instantly, results show all at once, there's no audio, and newcomers have no way to learn what Jugement Majoritaire is. These five pillars address the gaps without reworking what already works (the voting UX is solid).

## Role Model (Narrative Framework)

| Role | Who | In-app term |
|------|-----|-------------|
| **Judge** | The person who creates the poll | Juge en Chef |
| **Citizens** | The people who vote | Citoyens (giving depositions) |
| **Dredd** | The app itself / narrator | System voice, teaching character |

The creator submits a case and closes the audience (they are the authority). Voters are citizens giving their depositions. Dredd is the omnipresent narrator/teacher — he explains the system and announces verdicts.

---

## Key Decisions

### 1. Teaching Page (`/le-code`)

**Tone:** Intimidating lecture. Dredd barking at citizens about how justice works in Mega-City One. Aggressive, in-character, entertaining.

**Content structure:**
- What is Jugement Majoritaire (the voting method)
- How grades work (the 7-grade scale from Exemplaire to Condamne)
- How the median is determined (the key differentiator from simple majority)
- Why it's better than traditional voting (resistant to strategic voting)
- How to use this app (brief flow: create → share → vote → verdict)

**Visual approach:**
- Scrolling sections with the Judge Dredd character
- Each section = Dredd "lecturing" with a speech bubble or text block
- Possibly animated diagrams showing how median grade works
- Same HUD card aesthetic as the rest of the app

**Linked from:** Home page (prominent link), possibly voting page header

### 2. Results Ceremony

**Current state:** Results appear all at once as a ranked list with animated bar charts.

**New experience:**
- Brief "Dredd deliberating" staging moment (Dredd character + loading animation)
- Dredd announces the verdict: winner name + grade, with dramatic reveal
- Then full results list appears below
- Sound accompanies the reveal (gavel, dramatic sting)

**Key constraint:** Must still work without sound (muted by default or graceful degradation).

### 3. Soundscape

**Three layers:**
- **Ambient:** Subtle Mega-City drone/hum on all pages (low volume, loopable)
- **Interaction SFX:** Click/tap sounds, form submission confirmation, copy-to-clipboard
- **Dramatic moments:** Verdict reveal (gavel/sting), poll creation success, poll closing

**Implementation considerations:**
- Sound must be opt-in or muted by default (browser autoplay policies)
- Need a global sound toggle (mute/unmute) accessible from every page
- Audio files should be small (web-optimized, likely MP3/OGG)
- Source: royalty-free libraries (Freesound.org, Pixabay, etc.)

**Key constraint:** Sound enhances but never blocks. Every interaction must work silently.

### 4. Page Transitions

**Current state:** Instant page loads, no transition animation. Each page has `animate-fade-in-up` on mount.

**New experience:**
- Smooth transitions between routes (fade, slide, or glitch effect)
- Brief "processing" state for mutations (creating poll, submitting vote, closing)
- Options: View Transitions API (native, modern browsers) or motion/react layout animations

**Key constraint:** Must not slow down perceived performance. Transitions should be fast (200-400ms).

### 5. Home Page Upgrade

**Current state:** Centered column with glitch "DREDD" title, one paragraph of intro text, and the poll creation form. Functional but sparse.

**Improvements to explore:**
- Stronger visual hierarchy — larger, more dramatic hero section
- Link to teaching page prominently placed
- SVG Mega-City skyline silhouette as background illustration
- Better separation between "what is this" and "create a poll"
- Prominent link to `/le-code` teaching page

---

## Resolved Questions

1. **Sound assets:** Royalty-free libraries (Freesound.org, Pixabay, etc.)
2. **Teaching page route:** `/le-code` — "The Code", short and dystopian
3. **Sound toggle UX:** Fixed corner icon (speaker icon, top-right or bottom-right on every page)
4. **Page transition tech:** TBD at planning phase — likely motion/react since it's already in the stack
5. **Home page background:** Yes — SVG silhouette of Mega-City skyline behind content

---

## Out of Scope

- Voting UX changes (already satisfying)
- Database/persistence (separate concern)
- Authentication changes
- Mobile app
- Multiplayer/real-time features
