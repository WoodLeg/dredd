# Vercel Deployment — Brainstorm

**Date:** 2026-02-22
**Status:** Draft

## What We're Building

Production deployment of the Dredd voting app on Vercel, replacing the in-memory store with Vercel KV (Redis) for persistence across serverless invocations, adding OpenTelemetry observability via `@vercel/otel`, and configuring environment variables for auth and OAuth.

## Why This Approach

- **Vercel KV (Redis)** is the closest match to the current `Map`-based store API — `get`/`set`/`delete` map almost 1:1, minimizing refactor scope
- **Stateless better-auth** means no database adapter needed for auth — just environment variables
- **`@vercel/otel`** provides zero-config OpenTelemetry integration on Vercel's infrastructure with automatic trace collection
- **Default *.vercel.app domain** avoids DNS configuration for initial deployment; custom domain can be added later

## Key Decisions

1. **Store: Vercel KV via dashboard provisioning** — Auto-injects `KV_REST_API_URL` and `KV_REST_API_TOKEN` env vars. Use `@vercel/kv` SDK. Refactor `src/lib/store.ts` to use Redis-backed operations while keeping the same function signatures.

2. **Auth: Stateless better-auth** — No database needed. Environment variables only: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.

3. **Observability: `@vercel/otel`** — Add the package and configure instrumentation. Automatic tracing for Server Components, Server Actions, and API routes.

4. **Domain: *.vercel.app initially** — Set `NEXT_PUBLIC_APP_URL` and `BETTER_AUTH_URL` to the Vercel-assigned URL. Update Google OAuth authorized redirect URIs in Google Cloud Console.

5. **No `vercel.json` needed** — Next.js defaults work. Security headers already configured in `next.config.ts`.

## Scope

### In Scope

- Refactor `src/lib/store.ts` from in-memory `Map` to Vercel KV (Redis)
- Add `@vercel/kv` and `@vercel/otel` dependencies
- Create OpenTelemetry instrumentation config
- Document required Vercel environment variables
- Update `NEXT_PUBLIC_APP_URL` handling for production
- Update Google OAuth redirect URIs documentation

### Out of Scope

- Custom domain setup (later)
- CI/CD pipeline (Vercel handles git-push deploys)
- Database migrations (KV is schemaless)
- Performance optimization (address post-deployment)

## Environment Variables (Vercel Dashboard)

| Variable | Source |
|----------|--------|
| `KV_REST_API_URL` | Auto-injected by Vercel KV integration |
| `KV_REST_API_TOKEN` | Auto-injected by Vercel KV integration |
| `BETTER_AUTH_SECRET` | Generate new production secret |
| `BETTER_AUTH_URL` | `https://<project>.vercel.app` |
| `GOOGLE_CLIENT_ID` | Same as dev or new production credentials |
| `GOOGLE_CLIENT_SECRET` | Same as dev or new production credentials |
| `NEXT_PUBLIC_APP_URL` | `https://<project>.vercel.app` |

## Risks

- **Cold start latency**: Serverless functions + Redis round-trip adds latency vs in-memory. Acceptable for a voting app.
- **KV data model**: Current store uses nested objects (`Poll` with `votes` array). Redis stores strings — need to serialize/deserialize. `JSON.stringify`/`JSON.parse` is sufficient.
- **Google OAuth redirect**: Must add production URL to Google Cloud Console authorized redirect URIs before auth works.
