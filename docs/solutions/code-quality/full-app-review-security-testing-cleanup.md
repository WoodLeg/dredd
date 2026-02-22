---
title: "Comprehensive app review: cleanup, code quality, security hardening, and test coverage"
date: 2026-02-17
category: code-quality
severity: medium
component:
  - src/components/ui/button.tsx
  - src/components/poll-page-client.tsx
  - src/components/admin-panel.tsx
  - src/app/not-found.tsx
  - src/app/poll/[id]/results/page.tsx
  - src/app/poll/[id]/admin/[token]/page.tsx
  - next.config.ts
  - src/lib/store.ts
  - src/lib/actions.ts
  - src/lib/schemas.ts
  - src/lib/majority-judgment.ts
  - vitest.config.ts
tags:
  - code-review
  - cleanup
  - csp
  - content-security-policy
  - security-hardening
  - vitest
  - unit-tests
  - discriminated-union
  - button-component
  - page-layout
  - frame-ancestors
  - unsafe-eval
  - next-js-16
  - majority-judgment
status: resolved
resolution_type: refactor
time_to_resolve: ~4 hours
framework: Next.js 16
language: TypeScript
---

# Full App Review: Code Quality, Security, Testing, and Cleanup

## Summary

A four-phase comprehensive review of the Dredd Jugement Majoritaire voting app covering: stale artifact cleanup, code quality improvements (polymorphic Button, PageLayout consistency), CSP security hardening, and establishing a Vitest unit test suite with 65 tests. A subsequent code review pass refined the Button component to use discriminated union types and fixed a conditional assertion anti-pattern in tests.

---

## Solutions

### 1. Polymorphic Button with Discriminated Union Types

**Problem**: Hardcoded button-styled `<Link>` elements duplicated styling across the codebase (3 instances in `poll-page-client.tsx` and `admin-panel.tsx`). An initial fix added an optional `href` prop to the `Button` component, but code review revealed it silently dropped props — `onClick`, `disabled`, and `type` were ignored when `href` was set, with no compile-time warning.

**Root Cause**: A single flat props interface with all properties optional cannot express the constraint that certain props are mutually exclusive. TypeScript's structural typing allows callers to pass `onClick` alongside `href` without any error, leading to dead code that appears functional but is silently discarded at runtime.

**Solution**: Discriminated union types that make impossible prop combinations a compile-time error:

```tsx
type ButtonBase = {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
  children: ReactNode;
};

type ButtonAsButton = ButtonBase & {
  href?: never;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
};

type ButtonAsLink = ButtonBase & {
  href: string;
  disabled?: never;
  type?: never;
  onClick?: never;
};

type ButtonProps = ButtonAsButton | ButtonAsLink;

export function Button(props: ButtonProps) {
  const classes = /* shared class computation */;

  if (props.href) {
    return <Link href={props.href} className={classes}>{props.children}</Link>;
  }

  return (
    <motion.button
      type={props.type}
      disabled={props.disabled}
      onClick={props.onClick}
      className={classes}
    >
      {props.children}
    </motion.button>
  );
}
```

**Key Insight**: Make invalid states unrepresentable at the type level. If a component can be a button or a link but not both, the type system should enforce that — not runtime logic that silently swallows incompatible props.

---

### 2. CSP Hardening

**Problem**: The Content Security Policy had `unsafe-eval` in `script-src`, was missing `frame-ancestors`, and had a permissive `img-src` directive using the `https:` wildcard.

**Root Cause**: The initial CSP was written permissively to avoid breaking functionality during development and was never tightened. `unsafe-eval` was likely added to suppress errors from a dev tool. The missing `frame-ancestors` left the app vulnerable to clickjacking.

**Solution**: Removed `unsafe-eval` from `script-src`, added `frame-ancestors 'none'`, and restricted `img-src` to `'self' data:` only:

```ts
// next.config.ts
{
  key: "Content-Security-Policy",
  value: "default-src 'self'; frame-ancestors 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self';"
}
```

**Note**: `unsafe-inline` is kept because Next.js requires it for inline scripts/styles. Verified via Playwright browser testing — no CSP violations on any page.

---

### 3. Vitest Setup with Path Aliases

**Problem**: Zero test coverage across all library modules. The codebase uses the `@/*` path alias which Vitest does not resolve by default.

**Root Cause**: Vitest uses Vite's module resolution, which does not automatically read `tsconfig.json` path aliases.

**Solution**: Added Vitest with the `vite-tsconfig-paths` plugin:

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: { environment: "node" },
});
```

65 tests across 4 files covering: `store.ts` (20 tests), `actions.ts` (13 tests), `schemas.ts` (14 tests), `majority-judgment.ts` (9 tests).

---

### 4. Test Isolation with `_resetForTesting()`

**Problem**: The in-memory store uses a module-level `Map` that persists across test cases, causing test pollution.

**Root Cause**: Module-level state is a singleton for the lifetime of the process. Vitest runs tests in the same process, so the `Map` accumulates state across tests.

**Solution**: Export a reset function with underscore prefix convention:

```ts
// src/lib/store.ts
export function _resetForTesting(): void {
  polls.clear();
}
```

Called in `beforeEach` of store and actions tests. No `NODE_ENV` guard — the underscore prefix convention is sufficient and avoids unnecessary complexity.

---

### 5. Conditional Assertion Anti-Pattern Fix

**Problem**: Tests used `if (result.success) { expect(result.data...) }` which silently passes with zero assertions when the condition is false.

**Root Cause**: TypeScript's type narrowing inside `if` blocks is convenient for application code but dangerous in tests — it makes assertions conditional.

**Solution**: Assert the condition first, then use throw for type narrowing:

```ts
// BEFORE — silent pass when result.success is false
if (result.success) {
  expect(result.data.id).toBeDefined();
}

// AFTER — fails explicitly, with proper type narrowing
expect(result.success).toBe(true);
if (!result.success) throw new Error("Expected success");
expect(result.data.id).toBeDefined();
```

---

### 6. PageLayout Consistency for Error Pages

**Problem**: Error pages (`not-found.tsx`, results-not-ready, invalid admin token) were not wrapped in `<PageLayout>`, causing inconsistent centering.

**Solution**: Wrapped all error views in `<PageLayout>`. Verified visually via Playwright screenshots — all error pages now center content consistently.

---

## Prevention Strategies

| # | Problem | Core Principle | Review Checklist |
|---|---------|---------------|-----------------|
| 1 | Hardcoded button-styled links | Make invalid states unrepresentable at the type level | Are any `<Link>` elements styled to look like existing UI components? Do polymorphic components use discriminated unions? |
| 2 | Permissive CSP | Restrictive by default, permissive only with justification | Does any CSP change introduce `unsafe-eval`, wildcards, or missing directives? |
| 3 | No test coverage | Library code and tests ship together | Does this PR add/modify `src/lib/` code? Are there corresponding tests? |
| 4 | Conditional assertions | Every test path must assert unconditionally | Are any `expect()` calls nested inside `if`/`switch`? |
| 5 | Inconsistent layout | Encode required structure into reusable components | Do all page-level components render inside `PageLayout`? |
| 6 | Stale artifacts | The repo is a living system, not an archive | If a feature is abandoned, are all related artifacts removed? |

---

## Verification

- All 65 unit tests pass (`pnpm test`)
- Production build succeeds (`pnpm build`)
- 9 browser flows verified with Playwright MCP — no CSP violations
- Pre-existing issue noted: ShareLink hydration mismatch (server renders relative path, client renders full URL with `window.location.origin`) — not caused by these changes

---

## Related Documentation

- [Full App Review Brainstorm](../../brainstorms/2026-02-17-full-app-review-brainstorm.md) — originated all changes
- [Full App Review Plan](../../plans/2026-02-17-refactor-full-app-review-and-improvements-plan.md) — detailed execution plan
- [Vercel React Best Practices Audit](../performance-issues/vercel-react-best-practices-audit-next16.md) — created the PageLayout component extended here
- [localStorage Redirect Fix](../logic-errors/localstorage-redirect-blocks-voters.md) — related poll page conditional rendering
- [Server Actions + Zod Plan](../../plans/2026-02-16-refactor-server-actions-rhf-zod-plan.md) — defined `ActionResult<T>` union type pattern
- [Poll Closing Plan](../../plans/2026-02-16-feat-poll-closing-with-admin-link-plan.md) — created admin panel with hardcoded links replaced here
