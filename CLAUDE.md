# Dredd — Jugement Majoritaire Voting App

## Package Manager

Use **pnpm** (not npm/npx) for all commands:

```bash
pnpm dev          # Start dev server
pnpm build        # Production build (also runs TypeScript checks)
pnpm lint         # ESLint
pnpm start        # Start production server
```

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v4
- **Animation**: Motion (motion/react)
- **IDs**: nanoid

## Project Structure

```
src/
  app/              # Next.js App Router pages
    poll/[id]/      # Poll pages (vote, results, admin)
  components/       # React components (poll-form, vote-form, admin-panel, etc.)
    ui/             # Reusable UI primitives (Button, Input, DreddFeedback, DreddFullPage)
  lib/              # Shared logic (types, store, utils, grades, majority-judgment)
e2e/                # Playwright E2E tests
```

## Architecture

- **In-memory store** (`src/lib/store.ts`) — no database, state lives in server memory
- **Path alias**: `@/*` maps to `./src/*`
- **French UI** — all user-facing text is in French, using a **dystopian / Judge Dredd / Mega-City One lexical field** (see Lexical Conventions below)
- **GitHub** — remote at `origin` (GitHub), feature branches + PRs

## Testing

- **Unit tests**: Vitest (`pnpm test`) — covers `src/lib/` modules
- **E2E tests**: Playwright (`pnpm test:e2e`) — covers full user flows
- **Manual testing**: Use the Playwright MCP tools to interactively test and record browser flows. Start the dev server (`pnpm dev`), then use `browser_navigate`, `browser_snapshot`, `browser_click`, `browser_fill_form`, `browser_take_screenshot`, etc. This is useful for writing E2E tests — record interactions via MCP, then translate to Playwright test scripts.

## Playwright

The dev server runs on port **3999** (`http://localhost:3999`) to avoid conflicts with other services. When using Playwright (MCP tools or E2E tests), try to connect to the existing server first before starting your own. Only run `pnpm dev` if no server is available.

## Skills

- Always load the `vercel-react-best-practices` when working on this application

## Parallel Work

- For any non-trivial task requiring parallel work or multiple agents, **create a team** using `TeamCreate` and spawn teammates via the `Task` tool with `team_name`
- Use the team task list (`TaskCreate`, `TaskList`, `TaskUpdate`) to coordinate work across agents
- Assign each teammate a clear, scoped unit of work with explicit acceptance criteria
- Shut down teammates gracefully with `SendMessage` type `shutdown_request` when done

## Conventions

### Next.js 16 / React

- **Server Components first** — default to Server Components; only add `"use client"` when you need hooks, event handlers, or browser APIs
- **Push client boundaries down** — keep `"use client"` on the smallest leaf component possible, not at the page level
- **Server Actions for mutations** (`src/lib/actions.ts`) — no API routes for form submissions
- **Data fetching in Server Components** — call store functions directly in `page.tsx`, pass serializable props to client components
- **`params` is a Promise** in Next.js 16 — always `await params` in page components
- **Avoid `useEffect` for data that the server already has** — prefer server-side data passing over client-side fetching

### Lexical Conventions (Dystopian / Judge Dredd)

All user-facing text must follow a Sci-Fi / Mega-City One / Judge Dredd dystopian vocabulary. Key term mappings:

| Concept | Term used |
|---------|-----------|
| Poll / survey | Dossier, audience, litige |
| Vote | Verdict, déposition |
| Voter | Juge, citoyen |
| Candidate / option | Suspect |
| Admin | Juge en Chef |
| Share link | Transmission inter-secteurs |
| Close poll | Clôturer l'audience |
| Results | Verdict, sentence |
| Submit | Transmettre le verdict |
| Copy | Coordonnées sécurisées |
| Grade labels | Exemplaire, Honorable, Acceptable, Tolérable, Suspect, Coupable, Condamné |

**Feedback system**: Use `DreddFeedback` (transient slide-in with JudgeDredd character) for errors and success notifications. Use `DreddFullPage` (full-page with JudgeDredd character) for blocking states (404, access denied, closed poll). Never use generic toasts.

### General

- Functional components with hooks
- `const` over `let`
- Use `next/link` `<Link>` for internal navigation (not `<a href>`)
- Reuse existing UI components from `src/components/ui/`
