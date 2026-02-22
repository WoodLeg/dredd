---
title: "Upstash Redis double-deserialization causes SyntaxError and silent boolean bugs"
category: runtime-errors
tags:
  - upstash
  - redis
  - json-parsing
  - type-mismatch
  - silent-bug
  - rest-api
severity: critical
affected_files:
  - src/lib/store.ts
  - src/lib/__tests__/store.test.ts
date: 2026-02-22
---

# Upstash Redis Double-Deserialization

## Symptom

```
SyntaxError: Unexpected non-whitespace character after JSON at position 1 (line 1 column 2)
    at JSON.parse (<anonymous>)
    at assemblePollMeta (store.ts)
```

Poll creation crashes immediately. Additionally, `isClosed` checks silently always evaluate to `false` (boolean `true === "true"` is always false), meaning polls can never appear closed.

## Root Cause

`@upstash/redis` uses a REST/HTTP transport. The client auto-deserializes all JSON values on read:

```
Write: hset(key, { candidates: JSON.stringify(["A","B"]), isClosed: "false" })
       → Redis stores strings: candidates='["A","B"]'  isClosed='false'

Read:  hgetall(key)
       → Upstash client JSON.parses each value internally
       → Returns: { candidates: ["A","B"], isClosed: false }  (native types!)
```

The store code then called `JSON.parse()` / `Number()` / string comparison on already-parsed values:

| Field | Stored as | Upstash returns | Code did | Result |
|-------|-----------|-----------------|----------|--------|
| `candidates` | `'["A","B"]'` | `["A","B"]` (array) | `JSON.parse(array)` | **SyntaxError crash** |
| `isClosed` | `'false'` | `false` (boolean) | `=== "true"` | **Always false** (silent) |
| `createdAt` | `'1708610722000'` | `1708610722000` (number) | `Number(number)` | Works (no-op) |
| votes | `'{"voterId":...}'` | `{voterId:...}` (object) | `JSON.parse(object)` | **SyntaxError crash** |
| cachedResults | `'{"pollId":...}'` | `{pollId:...}` (object) | `JSON.parse(object)` | **SyntaxError crash** |

## Fix

Type the read interface to match what Upstash actually returns (deserialized types), and remove all redundant parsing.

**Before:**

```typescript
interface PollHash {
  candidates: string;   // wrong: expecting JSON string
  createdAt: string;    // wrong: expecting numeric string
  isClosed: string;     // wrong: expecting "true"/"false"
}

function assemblePollMeta(id: string, meta: PollHash): PollMeta {
  return {
    candidates: JSON.parse(meta.candidates) as string[],  // double parse
    createdAt: Number(meta.createdAt),                     // unnecessary
    isClosed: meta.isClosed === "true",                    // boolean vs string
  };
}

function assemblePoll(id: string, meta: PollHash, votes: string[]): Poll {
  return {
    ...assemblePollMeta(id, meta),
    votes: votes.map((v) => JSON.parse(v) as Vote),       // double parse
  };
}
```

**After:**

```typescript
interface PollHash {
  candidates: string[];  // auto-deserialized array
  createdAt: number;     // auto-deserialized number
  isClosed: boolean;     // auto-deserialized boolean
}

function assemblePollMeta(id: string, meta: PollHash): PollMeta {
  return {
    candidates: meta.candidates,  // direct pass-through
    createdAt: meta.createdAt,
    isClosed: meta.isClosed,
  };
}

function assemblePoll(id: string, meta: PollHash, votes: Vote[]): Poll {
  return {
    ...assemblePollMeta(id, meta),
    votes,  // already Vote[], no parsing needed
  };
}
```

All read functions updated similarly: `getVotesForPoll` uses `lrange<Vote>`, `getCachedResults` uses `get<PollResults>`, `getPoll` types pipeline results as `Vote[]` instead of `string[]`.

## Test Mock Pattern

The in-memory Redis mock must simulate Upstash's auto-deserialization to catch this class of bug:

```typescript
function autoDeserialize(v: string): unknown {
  try { return JSON.parse(v); } catch { return v; }
}

function deserializeHash(hash: Record<string, string>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(hash)) out[k] = autoDeserialize(v);
  return out;
}
```

Applied to `hgetall`, `lrange`, and `get` in both standalone and pipeline mocks.

## Prevention Rules

1. **Never `JSON.parse()` after an `@upstash/redis` read** — `hgetall`, `lrange`, `get` all return auto-deserialized values
2. **Type read interfaces to match deserialized output** — use `string[]`, `number`, `boolean`, not `string` for everything
3. **Write with serialization, read without** — `hset` needs `JSON.stringify`/`String()`, reads don't need `JSON.parse`/`Number()`
4. **Test mocks must simulate auto-deserialization** — without this, tests pass but production crashes

## REST vs TCP Redis Clients

This is a common migration trap. TCP clients (ioredis, node-redis) return raw strings; you must `JSON.parse()` yourself. REST clients (Upstash, Vercel KV) auto-deserialize. Teams migrating from TCP to REST often carry the `JSON.parse()` habit, causing double-deserialization.

| Aspect | TCP (ioredis) | REST (Upstash) |
|--------|---------------|----------------|
| Read values | Raw strings | Auto-deserialized |
| Common trap | Forgetting to parse | Double-parsing |
| Types | Everything is `string` | Match actual JS types |

## Related

- `docs/plans/2026-02-22-feat-vercel-deployment-plan.md` — Redis key schema and store migration plan
- `docs/brainstorms/2026-02-22-vercel-deployment-brainstorm.md` — Design decision to use JSON.stringify for serialization
