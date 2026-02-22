---
title: "feat: Judge Dredd slide-in feedback system + full dystopian lexical rewrite"
type: feat
status: active
date: 2026-02-18
---

# Judge Dredd Slide-In Feedback System + Full Dystopian Lexical Rewrite

## Overview

Replace all error/success feedback in the app with a Judge Dredd character that slides in from the bottom of the viewport with a dark dystopian HUD-style speech bubble. Rewrite ALL user-facing text across the entire app to follow a consistent Sci-Fi / MegaCity One / Judge Dredd / dystopian lexical field.

## Problem Statement

The app currently uses three disconnected feedback mechanisms (Toast, inline errors, full-page messages) with inconsistent theming. While some text already uses dystopian vocabulary ("proces", "verdict", "accuse"), many strings remain generic French ("Sondage introuvable", "La question est requise"). The experience lacks full immersion into the Judge Dredd universe.

## Proposed Solution

### Three-tier feedback system:

| Tier | Trigger | Behavior | Component |
|------|---------|----------|-----------|
| **A. Dredd Slide-In (transient)** | Server action errors, business rule violations, success confirmations | Slides up from bottom, auto-dismiss 5s, click to dismiss | `DreddFeedback` |
| **B. Dredd Full-Page (persistent)** | 404, access denied, results not ready, closed poll | Dredd IS the page content. No dismiss. | `DreddFullPage` |
| **C. Inline Styled (field-level)** | Form validation errors (Zod/react-hook-form) | Keep inline per-field errors for spatial context, restyle with dystopian text + neon border. Dredd slide-in also fires with summary. | Restyled `Input` + `DreddFeedback` |

### Success states: Dredd appears for successes too with a brief approving message ("Enregistre, citoyen.") and quicker auto-dismiss (~3s). Full character treatment for errors, lighter for success.

## Technical Approach

### Architecture

#### New Components

**`src/components/ui/dredd-feedback.tsx`** — Client component. The transient slide-in.

```tsx
interface DreddFeedbackProps {
  message: string | string[];
  variant: "error" | "success" | "forbidden";
  autoDismissMs?: number; // default 5000 for errors, 3000 for success
  onDismiss?: () => void;
}
```

- Uses `motion/react` `AnimatePresence` for slide-in/out (justified: complex enter/exit with gesture dismiss)
- SVG: Use `DreddHelmetIcon` (compact, ~109 lines) for the slide-in — the full `JudgeDredd` SVG (574 lines) is too heavy for transient feedback
- Dark semi-transparent backdrop (`bg-surface/95`) with neon border glow (`shadow-[0_0_15px_rgba(181,36,26,0.4)]` for errors, `shadow-[0_0_15px_rgba(196,148,30,0.4)]` for success)
- Speech bubble: dark HUD panel with glowing border, pointed tail toward helmet icon
- `role="alert"` + `aria-live="assertive"` for accessibility
- `prefers-reduced-motion`: skip slide animation, show immediately
- Non-modal: does not block interaction behind it
- Use `react-aria` (`usePress`) for accessible press/dismiss handling instead of raw `onClick`

**`src/components/ui/dredd-full-page.tsx`** — Client component. Persistent full-page Dredd.

```tsx
interface DreddFullPageProps {
  message: string;
  description?: string;
  action?: { label: string; href: string };
}
```

- Dredd character (full `JudgeDredd` SVG or cropped bust) IS the page content
- Speech bubble with the error/info message
- Optional action button (e.g., "Retour au Hall de Justice")
- CSS `fade-in-up` animation (no motion/react needed — persistent content)
- Replaces current full-page error layouts in `not-found.tsx`, admin denied, results not ready, poll closed

**`src/lib/dredd-feedback-context.tsx`** — Client context provider for global Dredd state.

```tsx
interface DreddFeedbackContextType {
  showDredd: (props: Omit<DreddFeedbackProps, 'onDismiss'>) => void;
  dismiss: () => void;
}
```

- Single `DreddFeedback` instance rendered in root layout
- Context provider wraps `{children}` in `layout.tsx`
- Queue behavior: latest message wins (no stacking). If new error arrives while Dredd is visible, message updates in-place
- Child components call `showDredd()` instead of managing local Toast state

#### Modified Components

**`src/app/layout.tsx`** — Wrap children with `DreddFeedbackProvider`. Add `DreddFeedback` as sibling.

**`src/components/ui/input.tsx`** — Restyle error state: neon red glow border (`shadow-[0_0_8px_rgba(181,36,26,0.3)]`), dystopian error text.

**`src/components/ui/toast.tsx`** — **DELETE**. Fully replaced by `DreddFeedback`.

**`src/components/vote-form.tsx`** — Replace Toast usage with `useDreddFeedback()` context hook. On server action error → `showDredd({ message, variant: "error" })`. On validation submit → `showDredd({ message: "Infractions detectees, citoyen.", variant: "error" })`.

**`src/components/poll-form.tsx`** — Replace Toast usage with `useDreddFeedback()`. Success copy → `showDredd({ message: "Transmission interceptee. Lien securise.", variant: "success" })`. Server error → `showDredd({ message, variant: "error" })`.

**`src/components/admin-panel.tsx`** — Replace Toast with `useDreddFeedback()`. Close error → Dredd error. Close success → handled by state change.

**`src/components/share-link.tsx`** — Replace Toast with `useDreddFeedback()`. Copy success → `showDredd({ message: "Coordonnees transmises.", variant: "success" })`.

**`src/app/not-found.tsx`** — Replace with `DreddFullPage` component.

**`src/app/poll/[id]/admin/[token]/page.tsx`** — Access denied section → `DreddFullPage`.

**`src/app/poll/[id]/results/page.tsx`** — Results not ready section → `DreddFullPage`.

**`src/app/poll/[id]/poll-page-client.tsx`** — Closed poll / already voted states → `DreddFullPage`.

### Animation Spec

**Slide-in (transient):**
1. **Entrance** (0.4s): Dredd helmet + speech bubble slide up from below viewport. `transform: translateY(100%) → translateY(0)`, `opacity: 0 → 1`. Easing: `cubic-bezier(0.34, 1.56, 0.64, 1)` (slight overshoot).
2. **Visible** (5s errors / 3s success): Static. Timer starts after entrance completes.
3. **Exit** (0.3s): Slide down + fade out. `translateY(0) → translateY(100%)`, `opacity: 1 → 0`.
4. **Reduced motion**: Instant appear/disappear with opacity fade only (0.15s).

**Full-page:**
- CSS `fade-in-up` animation (existing in `globals.css`). No motion/react.

### Speech Bubble Visual Spec

- Container: `bg-surface/95 backdrop-blur-sm border border-primary/40 rounded-xl`
- Error glow: `shadow-[0_0_20px_rgba(181,36,26,0.3)]`
- Success glow: `shadow-[0_0_20px_rgba(196,148,30,0.3)]`
- Text: `text-foreground font-medium`
- Pointed tail: CSS triangle (`:after` pseudo-element) pointing down-left toward the helmet icon
- Layout: Helmet icon (left, 48px) + speech bubble (right, flex-1)
- Positioning: Fixed bottom-6, horizontally centered, max-width matches app content (`max-w-lg`)

## Dystopian Lexical Rewrite — Complete Text Glossary

### Guiding Principles
- **Tone**: Authoritarian, procedural, cold efficiency. The Law is absolute.
- **Vocabulary**: Use legal/judicial terms from the Dredd universe — "citoyen" (citizen), "infraction" (violation), "secteur" (sector), "archives judiciaires" (judicial archives), "Mega-City One", "Hall de Justice" (Hall of Justice), "sentence" (sentence), "Code Penal" (Penal Code).
- **Style**: Imperative, clipped sentences. No pleasantries. The system addresses you as "citoyen".

### Page-Level Text

| File | Current Text | New Dystopian Text |
|------|-------------|-------------------|
| `layout.tsx` | `"Dredd — Mega-City One"` | `"Dredd — Tribunal de Mega-City One"` |
| `layout.tsx` | `"La Loi de Mega-City One. Soumettez vos affaires au Jugement Majoritaire..."` | `"Systeme judiciaire de Mega-City One. Soumettez vos litiges au Jugement Majoritaire — la mention mediane fait loi."` |
| `page.tsx` | `"Dredd"` | `"Dredd"` (keep) |
| `page.tsx` | `"Bienvenue a Mega-City One, citoyen..."` | `"Citoyen. Vous etes dans le Tribunal de Mega-City One. Soumettez un litige au Jugement Majoritaire. Chaque Juge rend son verdict pour chaque accuse — la mention mediane fait loi."` |
| `not-found.tsx` | `"Secteur introuvable"` | `"Secteur non repertorie"` |
| `not-found.tsx` | `"Ce secteur de Mega-City One n'existe pas dans nos registres."` | `"Ce secteur n'existe pas dans les archives de Mega-City One. Verifiez vos coordonnees, citoyen."` |
| `not-found.tsx` | `"Retour au Hall de Justice"` | `"Retour au Tribunal"` |

### Poll Page States (`poll-page-client.tsx`)

| Current Text | New Dystopian Text |
|-------------|-------------------|
| `"Votre verdict a ete enregistre dans les archives de Mega-City One."` | `"Verdict enregistre dans les archives judiciaires. Votre deposition est irrevocable, citoyen."` |
| `"Consulter le verdict"` | `"Acceder au verdict"` |
| `"Le verdict sera rendu quand le Juge en Chef cloturera le proces."` | `"Deliberation en cours. Le Juge en Chef prononcera la sentence."` |
| `"Ce proces est clos. La Loi a parle."` | `"Audience terminee. La Loi a statue. Aucune deposition supplementaire ne sera acceptee."` |

### Results Page (`results/page.tsx`, `results-page-client.tsx`)

| Current Text | New Dystopian Text |
|-------------|-------------------|
| `"Verdict en deliberation"` | `"Deliberation en cours"` |
| `"Le verdict sera rendu quand le Juge en Chef cloturera le proces."` | `"En attente de la sentence du Juge en Chef. Patience, citoyen."` |
| `"Retour au proces"` | `"Retour a l'audience"` |
| `"Aucun verdict enregistre"` | `"Aucune deposition enregistree"` |
| `"${n} verdict(s)"` | `"${n} deposition(s)"` |
| `"Ouvrir un nouveau proces"` | `"Ouvrir un nouveau dossier"` |

### Admin Page (`admin/[token]/page.tsx`, `admin-panel.tsx`)

| Current Text | New Dystopian Text |
|-------------|-------------------|
| `"Acces refuse"` | `"Acces non autorise"` |
| `"Identification invalide. Seuls les Juges en Chef sont autorises."` | `"Identification invalide. Zone restreinte — acces reserve aux Juges en Chef."` |
| `"Retour au proces"` | `"Retour a l'audience"` |
| `"Salle de controle — Juge en Chef"` | `"Poste de commandement — Juge en Chef"` |
| `"Statut du proces"` | `"Statut de l'audience"` |
| `"Clos"` | `"Cloture"` |
| `"En cours"` | `"En session"` |
| `"Verdicts"` | `"Depositions"` |
| `"scanner"` | `"scanner"` (keep — fits the dystopian tech feel) |
| `"Cloture..."` | `"Cloture en cours..."` |
| `"Confirmer le verdict final"` | `"Confirmer la sentence finale"` |
| `"Cloturer le proces"` | `"Cloturer l'audience"` |
| `"Cette sentence est irreversible. Le verdict sera rendu public dans tout Mega-City One."` | `"Sentence irreversible. Le verdict sera diffuse dans tous les secteurs de Mega-City One."` |
| `"Annuler"` | `"Annuler"` (keep) |
| `"Consulter le verdict"` | `"Acceder au verdict"` |

### Poll Form (`poll-form.tsx`)

| Current Text | New Dystopian Text |
|-------------|-------------------|
| `"Proces ouvert !"` | `"Dossier enregistre."` |
| `"Lien du Juge en Chef"` | `"Acces Juge en Chef"` |
| `"Conservez ce lien — il vous permettra de rendre le verdict final."` | `"Conservez ces coordonnees — elles autorisent le verdict final."` |
| `"Copier"` | `"Copier"` (keep) |
| `"Lien copie !"` | (replaced by Dredd: `"Coordonnees securisees."`) |
| `"Affaire a juger"` | `"Objet du litige"` |
| `"Quel mutant merite la grace ?"` | `"Quel suspect merite l'acquittement ?"` |
| `"Accuses"` | `"Suspects"` |
| `"Accuse ${i + 1}"` | `"Suspect ${i + 1}"` |
| `"+ Ajouter un accuse"` | `"+ Ajouter un suspect"` |
| `"Enregistrement..."` | `"Enregistrement du dossier..."` |
| `"Ouvrir le proces"` | `"Ouvrir l'audience"` |

### Vote Form (`vote-form.tsx`)

| Current Text | New Dystopian Text |
|-------------|-------------------|
| `"Rendez votre verdict pour chaque accuse"` | `"Prononcez votre verdict pour chaque suspect"` |
| `"Identifiant de Juge"` | `"Matricule de Juge"` |
| `"Badge No ou nom de Juge"` | `"Numero de badge ou matricule"` |
| `"Transmission..."` | `"Transmission en cours..."` |
| `"Rendre le verdict"` | `"Transmettre le verdict"` |

### Share Link (`share-link.tsx`)

| Current Text | New Dystopian Text |
|-------------|-------------------|
| `"Transmission inter-secteurs"` | `"Transmission inter-secteurs"` (keep — already perfect) |
| `"Copier"` | `"Copier"` (keep) |
| `"Lien copie !"` | (replaced by Dredd: `"Coordonnees transmises."`) |

### Grade Labels (`lib/grades.ts`)

| Current Label | New Dystopian Label |
|--------------|-------------------|
| `"Exemplaire"` | `"Exemplaire"` (keep) |
| `"Honorable"` | `"Honorable"` (keep) |
| `"Acceptable"` | `"Acceptable"` (keep) |
| `"Tolerable"` | `"Tolerable"` (keep) |
| `"Suspect"` | `"Suspect"` (keep) |
| `"Coupable"` | `"Coupable"` (keep) |
| `"Condamne"` | `"Condamne"` (keep) |

> Grade labels are already fully dystopian. No changes needed.

### Validation Messages (`lib/schemas.ts`)

| Current Message | New Dystopian Message |
|----------------|----------------------|
| `"La question est requise"` | `"Objet du litige requis, citoyen"` |
| `"La question ne doit pas depasser 200 caracteres"` | `"Limite de 200 caracteres pour l'objet du litige"` |
| `"L'option ne peut pas etre vide"` | `"Identification du suspect requise"` |
| `"L'option ne doit pas depasser 80 caracteres"` | `"Limite de 80 caracteres par suspect"` |
| `"Il faut au moins 2 options"` | `"Minimum 2 suspects requis pour ouvrir une audience"` |
| `"20 options maximum"` | `"Capacite maximale : 20 suspects par audience"` |
| `"Les options doivent etre uniques"` | `"Doublon detecte — chaque suspect doit etre unique"` |
| `"Votre nom est requis"` | `"Matricule de Juge requis"` |
| `"Le nom ne doit pas depasser 100 caracteres"` | `"Limite de 100 caracteres pour le matricule"` |

### Server Error Messages (`lib/actions.ts`, `lib/store.ts`)

| Current Message | New Dystopian Message |
|----------------|----------------------|
| `"Sondage introuvable"` | `"Dossier introuvable dans les archives"` |
| `"Veuillez noter toutes les options"` | `"Verdict requis pour chaque suspect"` |
| `"Note invalide pour \"${candidate}\""` | `"Mention invalide pour \"${candidate}\""` |
| `"Note fournie pour une option inconnue"` | `"Mention pour un suspect non repertorie"` |
| `"Le nombre maximum de sondages a ete atteint"` | `"Capacite maximale du Tribunal atteinte"` |
| `"Ce sondage a atteint le nombre maximum de votes"` | `"Nombre maximal de depositions atteint pour ce dossier"` |
| `"Ce vote est ferme"` | `"Audience cloturee — aucune deposition acceptee"` |
| `"Vous avez deja vote"` | `"Deposition deja enregistree sous ce matricule"` |
| `"Lien administrateur invalide"` | `"Identification Juge en Chef invalide"` |
| `"Ce vote est deja ferme"` | `"Audience deja cloturee"` |

### Dredd Speech Bubble Messages (NEW — for slide-in feedback)

| Trigger | Variant | Dredd Says |
|---------|---------|------------|
| Form validation (summary) | error | `"Infractions detectees dans votre deposition, citoyen."` |
| Duplicate vote (server) | error | `"Deposition deja enregistree. Tentative de fraude notee, citoyen."` |
| Vote on closed poll (server) | error | `"Audience cloturee. La Loi a deja statue."` |
| Max votes reached (server) | error | `"Capacite du tribunal atteinte. Aucune deposition supplementaire."` |
| Max polls reached (server) | error | `"Archives judiciaires saturees. Revenez plus tard, citoyen."` |
| Poll not found (server) | error | `"Dossier introuvable. Verifiez vos references."` |
| Admin close error | error | `"Erreur de procedure. Cloture impossible."` |
| Invalid grade (server) | error | `"Mention non conforme au Code Penal."` |
| Copy link success | success | `"Coordonnees securisees."` |
| Copy share link success | success | `"Transmission inter-secteurs validee."` |
| Poll created success | success | `"Dossier enregistre. L'audience est ouverte."` |

## Implementation Phases

### Phase 1: Foundation — DreddFeedback Component + Context

**Files to create:**
- `src/lib/dredd-feedback-context.tsx`
- `src/components/ui/dredd-feedback.tsx`
- `src/components/ui/dredd-full-page.tsx`

**Files to modify:**
- `src/app/layout.tsx` — add provider
- `src/app/globals.css` — add neon glow utilities, speech bubble styles

**Acceptance criteria:**
- [ ] `DreddFeedback` renders with slide-in animation from bottom
- [ ] Dark HUD speech bubble with neon glow borders
- [ ] Helmet icon (left) + message bubble (right) layout
- [ ] Auto-dismiss after 5s (errors) / 3s (success)
- [ ] Click to dismiss
- [ ] `role="alert"` + `aria-live="assertive"`
- [ ] `prefers-reduced-motion` support
- [ ] `DreddFullPage` renders as persistent page content with character + speech bubble
- [ ] Context provider allows any child component to trigger Dredd via `useDreddFeedback()`

### Phase 2: Replace All Toast Usage

**Files to modify:**
- `src/components/vote-form.tsx` — replace Toast with `useDreddFeedback()`
- `src/components/poll-form.tsx` — replace Toast with `useDreddFeedback()`
- `src/components/admin-panel.tsx` — replace Toast with `useDreddFeedback()`
- `src/components/share-link.tsx` — replace Toast with `useDreddFeedback()`

**Files to delete:**
- `src/components/ui/toast.tsx`

**Acceptance criteria:**
- [ ] All 4 Toast instances replaced with Dredd context calls
- [ ] Toast component deleted
- [ ] Error messages display in Dredd speech bubble
- [ ] Success messages display in Dredd speech bubble (lighter variant)

### Phase 3: Replace Full-Page Error States

**Files to modify:**
- `src/app/not-found.tsx` — use `DreddFullPage`
- `src/app/poll/[id]/admin/[token]/page.tsx` — access denied → `DreddFullPage`
- `src/app/poll/[id]/results/page.tsx` — results not ready → `DreddFullPage`
- `src/app/poll/[id]/poll-page-client.tsx` — closed poll / already voted → `DreddFullPage`

**Acceptance criteria:**
- [ ] All full-page error/info states use `DreddFullPage`
- [ ] Each includes appropriate action button
- [ ] Server Component boundaries preserved (wrap `DreddFullPage` as client island)

### Phase 4: Dystopian Lexical Rewrite

**Files to modify (ALL user-facing strings):**
- `src/app/layout.tsx` — metadata
- `src/app/page.tsx` — homepage text
- `src/app/not-found.tsx` — error text
- `src/app/poll/[id]/poll-page-client.tsx` — poll states text
- `src/app/poll/[id]/results/page.tsx` — results text
- `src/app/poll/[id]/results/results-page-client.tsx` — results text
- `src/app/poll/[id]/admin/[token]/page.tsx` — admin text
- `src/components/poll-form.tsx` — form labels, placeholders, messages
- `src/components/vote-form.tsx` — form labels, placeholders, messages
- `src/components/admin-panel.tsx` — admin labels, messages
- `src/components/share-link.tsx` — link label
- `src/components/results-chart.tsx` — tooltip template
- `src/lib/schemas.ts` — all Zod validation messages
- `src/lib/actions.ts` — server action error messages
- `src/lib/store.ts` — store error messages

**Acceptance criteria:**
- [ ] Every user-facing string matches the glossary above
- [ ] Consistent tone: authoritarian, procedural, addresses user as "citoyen"
- [ ] No leftover generic French strings

### Phase 5: Restyle Inline Validation Errors

**Files to modify:**
- `src/components/ui/input.tsx` — neon glow border on error, dystopian text styling
- `src/app/globals.css` — add `.input-error-glow` utility

**Acceptance criteria:**
- [ ] Error border has subtle neon red glow
- [ ] Error text uses dystopian wording (from glossary)
- [ ] Per-field spatial context preserved

### Phase 6: Update E2E Tests

**Files to modify:**
- `e2e/error-states.spec.ts` — update all text selectors to match new dystopian strings
- `e2e/helpers.ts` — update grade label references
- `e2e/admin.spec.ts` — update text selectors
- `e2e/create-poll.spec.ts` — update text selectors
- `e2e/golden-path.spec.ts` — update text selectors
- `e2e/results.spec.ts` — update text selectors
- `e2e/vote.spec.ts` — update text selectors

**Acceptance criteria:**
- [ ] All E2E tests pass with new dystopian text
- [ ] Fix pre-existing bug: `helpers.ts` line 50 uses `"Passable"` but rendered label is `"Suspect"`

### Phase 7: Update CLAUDE.md

**Files to modify:**
- `CLAUDE.md` — add lexical field convention

**Addition:**
```markdown
### Lexical Field

All user-facing text follows a **Sci-Fi / MegaCity One / Judge Dredd / dystopian** lexical field:
- **Tone**: Authoritarian, procedural, cold efficiency. The Law is absolute.
- **Vocabulary**: "citoyen", "infraction", "secteur", "audience" (not "proces"), "suspect" (not "accuse"), "deposition" (not "vote"), "matricule" (not "nom"), "dossier" (not "sondage"), "Juge en Chef", "Tribunal", "archives judiciaires", "Code Penal"
- **Style**: Imperative, clipped sentences. No pleasantries. Address the user as "citoyen".
- Dredd feedback messages should be concise — one sentence max.
```

## Acceptance Criteria

### Functional Requirements
- [ ] Dredd slides in from bottom on all error states (server errors, business rule violations)
- [ ] Dredd slides in from bottom on success states (copy link, poll created) with lighter treatment
- [ ] Form validation fires both inline errors AND Dredd summary slide-in
- [ ] Full-page states (404, access denied, results not ready, poll closed) render as persistent Dredd page
- [ ] All user-facing text uses dystopian lexical field
- [ ] Toast component fully replaced and deleted

### Non-Functional Requirements
- [ ] Slide-in uses `DreddHelmetIcon` (not full 574-line SVG) for performance
- [ ] `prefers-reduced-motion` supported
- [ ] `role="alert"` + `aria-live="assertive"` on transient feedback
- [ ] Server Component boundaries preserved — `DreddFullPage` used as client island where needed
- [ ] All E2E tests pass with updated text selectors

## Dependencies & Risks

- **E2E test fragility**: All tests match on text strings that will change. Must update in lockstep.
- **Pre-existing E2E bug**: `helpers.ts` uses `"Passable"` but the grade label is `"Suspect"`. Fix during Phase 6.
- **Layout.tsx boundary**: Adding a client context provider in the root layout means wrapping children in a client boundary. Keep the provider minimal to avoid converting the entire tree to client components.
- **Motion bundle**: Using `motion/react` for the slide-in is justified (AnimatePresence for exit animation). Per institutional learnings, keep it limited to this one new component.
- **react-aria dependency**: Add `react-aria` (specifically `@react-aria/interactions`) for accessible press handling (`usePress`) on the dismiss interaction. Provides better touch/keyboard/pointer support than raw `onClick`.

## References

### Internal References
- JudgeDredd SVG: `src/app/icons/dredd/judge.tsx`
- DreddHelmetIcon: `src/components/ui/dredd-helmet-icon.tsx`
- Current Toast: `src/components/ui/toast.tsx` (to be deleted)
- Input error styling: `src/components/ui/input.tsx`
- Animation patterns: `src/app/globals.css` (fade-in-up, scale-in)
- Grade definitions: `src/lib/grades.ts`
- Validation schemas: `src/lib/schemas.ts`
- Server actions: `src/lib/actions.ts`
- Store errors: `src/lib/store.ts`

### Institutional Learnings
- `docs/solutions/performance-issues/vercel-react-best-practices-audit-next16.md` — CSS animations over motion/react for simple transitions
- `docs/solutions/code-quality/full-app-review-security-testing-cleanup.md` — discriminated union props, component patterns
