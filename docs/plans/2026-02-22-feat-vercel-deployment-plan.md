---
title: "feat: Vercel Deployment with Upstash Redis and OpenTelemetry"
type: feat
status: active
date: 2026-02-22
brainstorm: docs/brainstorms/2026-02-22-vercel-deployment-brainstorm.md
---

# feat: Vercel Deployment with Upstash Redis and OpenTelemetry

## Overview

Deploy the Dredd voting app to Vercel by replacing the in-memory store with Upstash Redis, configuring better-auth with a persistent adapter, adding OpenTelemetry instrumentation, and making all store operations async-safe for serverless execution.

## Problem Statement

The app uses an in-memory `Map` on `globalThis` for all poll/vote data. On Vercel's serverless functions, each invocation gets a fresh module scope — data written by one invocation is invisible to the next. Additionally, better-auth has no database adapter configured, meaning user accounts and sessions won't persist across cold starts.

## Proposed Solution

1. Replace `@vercel/kv` (deprecated Dec 2024) with **`@upstash/redis`** via the Vercel Marketplace integration
2. Redesign the store with a **decomposed Redis key schema** and **Lua scripts** for atomic operations
3. Add better-auth **Upstash Redis adapter** (same instance, `auth:` key prefix)
4. Add **`@vercel/otel`** for observability
5. Migrate all store callers to **async** interfaces
6. Add **`error.tsx` boundaries** for Redis failure handling

## Technical Approach

### Redis Key Schema

```
poll:{id}              → Hash: { question, candidates (JSON), ownerId, ownerDisplayName, createdAt, isClosed, closedAt }
poll:{id}:votes        → List of JSON-encoded Vote objects
poll:{id}:voters       → Set of voterIds (for O(1) duplicate check)
poll:{id}:results      → String: JSON-encoded PollResults (cached, invalidated on vote)
owner:{userId}:polls   → Sorted Set: pollId scored by createdAt (secondary index for dashboard)
```

**Why decomposed**: The current Poll object embeds a `votes: Vote[]` array that grows to 500 entries. Storing everything as a single JSON blob means every `getPoll()` fetches all votes — even when only metadata is needed (admin page, results page header). Decomposed keys let us fetch only what's needed and use Redis-native data structures for atomicity.

### Atomicity Strategy

**`addVote` — Lua script** (atomic check-and-insert):
```lua
-- Keys: poll:{id} (hash), poll:{id}:voters (set), poll:{id}:votes (list), poll:{id}:results (string)
-- Args: voterId, voteJSON, maxVotes
local isClosed = redis.call('HGET', KEYS[1], 'isClosed')
if isClosed == 'true' then return {0, 'closed'} end
local voteCount = redis.call('LLEN', KEYS[3])
if tonumber(voteCount) >= tonumber(ARGV[3]) then return {0, 'capacity'} end
local added = redis.call('SADD', KEYS[2], ARGV[1])
if added == 0 then return {0, 'duplicate_vote'} end
redis.call('RPUSH', KEYS[3], ARGV[2])
redis.call('DEL', KEYS[4])  -- invalidate cached results
return {1, 'ok'}
```

**`closePoll` — Lua script** (atomic ownership check + state mutation):
```lua
-- Keys: poll:{id} (hash)
-- Args: userId
local ownerId = redis.call('HGET', KEYS[1], 'ownerId')
if not ownerId then return {0, 'not_found'} end
if ownerId ~= ARGV[1] then return {0, 'forbidden'} end
local isClosed = redis.call('HGET', KEYS[1], 'isClosed')
if isClosed == 'true' then return {0, 'already_closed'} end
redis.call('HSET', KEYS[1], 'isClosed', 'true', 'closedAt', ARGV[2])
return {1, 'ok'}
```

**`setCachedResults` — Redis NX** (write-once):
```ts
await redis.set(`poll:${id}:results`, results, { nx: true })
```

### better-auth Adapter

Use the same Upstash Redis instance with a key prefix. better-auth's Redis adapter stores sessions and users under `auth:` prefixed keys. Since sessions are JWE cookie-cached (stateless reads), Redis is only hit for:
- User creation (OAuth first sign-in)
- User lookup (OAuth subsequent sign-ins)
- Session creation/deletion

This is a low-frequency operation — no performance concern.

### OpenTelemetry Setup

Minimal instrumentation with `@vercel/otel`. Auto-traces HTTP requests, Server Actions, and API routes. Custom spans only for result computation (CPU-bound, worth monitoring).

### Environment Variables

| Variable | Environment | Source |
|----------|-------------|--------|
| `UPSTASH_REDIS_REST_URL` | All | Auto-injected by Upstash integration |
| `UPSTASH_REDIS_REST_TOKEN` | All | Auto-injected by Upstash integration |
| `BETTER_AUTH_SECRET` | Production | New generated secret |
| `BETTER_AUTH_URL` | Production | `https://<project>.vercel.app` |
| `BETTER_AUTH_URL` | Preview | Unset (falls back to `VERCEL_URL`) |
| `GOOGLE_CLIENT_ID` | All | Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | All | Google Cloud Console |
| `NEXT_PUBLIC_APP_URL` | Production | `https://<project>.vercel.app` |
| `NEXT_PUBLIC_APP_URL` | Preview | Unset (falls back to `VERCEL_URL`) |

### Google OAuth Strategy

- Register production domain only in Google Cloud Console redirect URIs
- Preview deployments: Google OAuth will fail (expected) — use email/password test auth via `ENABLE_TEST_AUTH=true` on preview environment
- Add `trustedOrigins` to better-auth config for dynamic Vercel URLs

---

## Implementation Phases

### Phase 1: Foundation (no behavior change)

Add dependencies, create the Redis client module, add error boundaries, and set up OpenTelemetry instrumentation. The app continues to work with the in-memory store.

**Tasks:**
- [x] `pnpm add @upstash/redis @vercel/otel @opentelemetry/sdk-logs @opentelemetry/api-logs @opentelemetry/instrumentation`
- [x] Create `src/lib/redis.ts` — singleton `Redis.fromEnv()` client
- [x] Create `src/instrumentation.ts` — `registerOTel({ serviceName: 'dredd' })`
- [x] Create `src/app/error.tsx` — DreddFullPage error boundary ("Tribunal indisponible")
- [x] Create `src/app/poll/[id]/error.tsx` — segment-level error boundary
- [x] Add `trustedOrigins` to `src/lib/auth.ts`:
  ```ts
  trustedOrigins: [
    'http://localhost:3999',
    ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
    ...(process.env.NEXT_PUBLIC_APP_URL ? [process.env.NEXT_PUBLIC_APP_URL] : []),
  ]
  ```
- [x] Update `src/lib/auth.ts` `baseURL` to fall back through `BETTER_AUTH_URL` → `https://${VERCEL_URL}` → `localhost:3999`

**Files created:**
- `src/lib/redis.ts`
- `src/instrumentation.ts`
- `src/app/error.tsx`
- `src/app/poll/[id]/error.tsx`

**Files modified:**
- `package.json` (new deps)
- `src/lib/auth.ts` (trustedOrigins, dynamic baseURL)

**Exit criteria:** `pnpm build` succeeds. App still works with in-memory store. No runtime changes.

---

### Phase 2: Store Migration (core change)

Replace the in-memory `Map` implementation with Upstash Redis. All store functions become async. Callers are updated.

**Tasks:**
- [x] Rewrite `src/lib/store.ts`:
  - All functions become `async` returning `Promise<T>`
  - `createPoll` → `HSET poll:{id}` + `SADD owner:{ownerId}:polls`
  - `getPoll` → `HGETALL poll:{id}` + `LRANGE poll:{id}:votes 0 -1` (assemble Poll object)
  - `addVote` → Lua script (atomic dedup + insert + cache invalidation)
  - `closePoll` → Lua script (atomic ownership check + state mutation)
  - `setCachedResults` → `SET poll:{id}:results NX`
  - `getPollsByOwner` → `ZREVRANGE owner:{ownerId}:polls 0 -1` + batch `HGETALL`
  - `validateOwner` → `HGET poll:{id} ownerId`
  - `_resetForTesting` → either noop or mock-based
- [x] Create helper: `assemblePoll(meta, votes): Poll` — reconstructs Poll object from Redis data
- [x] Create helper: `serializeVote(vote): string` / `deserializeVote(raw): Vote`
- [x] Update `src/lib/actions.ts` — `await` all store calls
- [x] Update `src/app/poll/[id]/page.tsx` — async `getCachedPoll`, `await` in component and `generateMetadata`
- [x] Update `src/app/poll/[id]/results/page.tsx` — async store calls, `await setCachedResults`
- [x] Update `src/app/poll/[id]/admin/page.tsx` — async store calls
- [x] Update `src/app/dashboard/page.tsx` — async `getPollsByOwner`, `Promise.all` for cached results
- [x] Update `src/app/api/test/seed/route.ts` — `await` all store calls
- [x] Add `getPollMeta(id): Promise<PollMeta | undefined>` — lightweight fetch without votes (for admin page, results header)

**Files modified:**
- `src/lib/store.ts` (full rewrite)
- `src/lib/actions.ts` (await store calls)
- `src/app/poll/[id]/page.tsx`
- `src/app/poll/[id]/results/page.tsx`
- `src/app/poll/[id]/admin/page.tsx`
- `src/app/dashboard/page.tsx`
- `src/app/api/test/seed/route.ts`

**Files created:**
- `src/lib/redis-scripts.ts` (Lua scripts as string constants)

**Exit criteria:** All pages render correctly with data stored in Redis. `pnpm build` succeeds. Manual smoke test via Playwright MCP confirms create/vote/results/close/dashboard flows work.

---

### Phase 3: Auth Adapter

Configure better-auth with a persistent adapter for the Upstash Redis instance.

**Tasks:**
- [x] Research better-auth Redis adapter availability (check if `better-auth` supports `@upstash/redis` natively or needs a custom adapter)
- [x] If native adapter exists: configure in `src/lib/auth.ts` with shared Redis client and `auth:` key prefix
- [x] If no native adapter: evaluate alternatives (Drizzle + Turso, or custom adapter wrapping `@upstash/redis`)
- [ ] Test OAuth flow: sign in → create poll → sign out → sign in again → see existing polls on dashboard
- [ ] Verify JWE cookie cache still works (stateless session reads don't require adapter call)

**Files modified:**
- `src/lib/auth.ts` (add database adapter config)
- `package.json` (adapter dependency if needed)

**Exit criteria:** Google OAuth sign-in creates a persistent user. Signing out and back in recovers the same user identity. Dashboard shows previously created polls.

---

### Phase 4: Test Suite Update

Update unit tests for async store and add integration tests.

**Tasks:**
- [x] Rewrite `src/lib/__tests__/store.test.ts` for async API:
  - Mock `@upstash/redis` with `vi.mock` (unit tests should not hit real Redis)
  - All assertions use `await`
  - Test Lua script logic via mock responses
- [x] Update `src/lib/__tests__/actions.test.ts` for async store calls
- [ ] Verify E2E tests (`pnpm test:e2e`) pass against dev server with local Redis or Upstash dev instance
- [x] Add `.env.test` entries for Upstash test instance (or document mock strategy)

**Files modified:**
- `src/lib/__tests__/store.test.ts` (full rewrite)
- `src/lib/__tests__/actions.test.ts` (await updates)
- `.env.test` (Redis test config)

**Exit criteria:** `pnpm test` passes. `pnpm test:e2e` passes.

---

### Phase 5: Deploy and Verify

Configure Vercel project and deploy.

**Tasks:**
- [ ] Provision Upstash Redis via Vercel Marketplace → link to project
- [ ] Set environment variables in Vercel dashboard (see table above)
- [ ] Generate new `BETTER_AUTH_SECRET` for production
- [ ] Add production domain to Google Cloud Console OAuth redirect URIs: `https://<project>.vercel.app/api/auth/callback/google`
- [ ] Push to main → Vercel auto-deploys
- [ ] Smoke test on production:
  - [ ] Google OAuth sign-in works
  - [ ] Create poll
  - [ ] Share link, vote from different browser/incognito
  - [ ] View results
  - [ ] Close poll
  - [ ] Dashboard shows all polls
- [ ] Verify OpenTelemetry traces appear in Vercel dashboard (connect an observability provider if needed)
- [ ] Set preview environment: `ENABLE_TEST_AUTH=true` for preview deployments

**Exit criteria:** All 7 user flows work on production Vercel URL. No 500 errors. Auth persists across page reloads.

---

## Acceptance Criteria

### Functional Requirements

- [ ] All poll data persists across serverless invocations (create, vote, close, results)
- [ ] Google OAuth sign-in works on production domain
- [ ] Dashboard shows all polls owned by the signed-in user
- [ ] Duplicate vote prevention works under concurrent requests
- [ ] Poll closure is atomic (no votes accepted after close)
- [ ] Cached results are invalidated when new votes are added
- [ ] Error boundaries show DreddFullPage UI on Redis/server failures
- [ ] Preview deployments work with test auth (Google OAuth not required)

### Non-Functional Requirements

- [ ] Cold start + Redis round-trip < 3s for poll page
- [ ] Dashboard with 50 polls loads < 5s
- [ ] `pnpm build` succeeds with no TypeScript errors
- [ ] All unit tests pass (`pnpm test`)
- [ ] All E2E tests pass (`pnpm test:e2e`)

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Upstash Redis downtime | All store operations fail | `error.tsx` boundaries show DreddFullPage. Server Actions return `service_unavailable` error code |
| Lua script bugs | Data corruption (duplicate votes, lost data) | Thorough unit tests with mocked Redis. Manual QA of race-prone flows |
| better-auth adapter incompatibility | Auth broken on production | Research adapter availability in Phase 3 before committing. Fallback: Drizzle + Turso |
| Google OAuth redirect mismatch | 400 on OAuth callback | Add redirect URI before first deploy. Document in deployment checklist |
| Async migration breaks call sites | Build failure | TypeScript will catch all missed `await`s. Phase 2 is a single atomic change |

---

## References

### Internal

- Brainstorm: `docs/brainstorms/2026-02-22-vercel-deployment-brainstorm.md`
- Store implementation: `src/lib/store.ts`
- Auth config: `src/lib/auth.ts`
- Server Actions: `src/lib/actions.ts`
- Types: `src/lib/types.ts`
- Majority judgment: `src/lib/majority-judgment.ts`
- Learnings — hydration-safe URLs: `docs/solutions/runtime-errors/next-hydration-mismatch-typeof-window-useState.md`
- Learnings — app review: `docs/solutions/code-quality/full-app-review-security-testing-cleanup.md`

### External

- [Upstash Redis SDK](https://upstash.com/docs/redis/sdks/ts/getstarted)
- [Upstash on Vercel Marketplace](https://vercel.com/marketplace/upstash)
- [Next.js OpenTelemetry](https://nextjs.org/docs/app/guides/open-telemetry)
- [`@vercel/otel` setup](https://vercel.com/docs/observability/otel-overview)
- [better-auth trusted origins](https://www.better-auth.com/docs/authentication/vercel)
- [Vercel environment variables](https://vercel.com/docs/environment-variables)
- [Upstash pricing](https://upstash.com/pricing) — Free tier: 500K commands/month, 256 MB
