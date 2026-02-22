---
title: "React Hooks, State Machine, and Error Forwarding Violations"
category: logic-errors
date: 2026-02-21
severity: P1-P2
tags:
  - react-hooks
  - useeffect-race-conditions
  - state-machine
  - discriminated-unions
  - error-handling
  - animatepresence
  - oauth
  - code-review
modules:
  - src/app/login/login-client.tsx
  - src/components/qr-code-display.tsx
  - src/components/vote-form.tsx
  - src/lib/store.ts
  - src/lib/actions.ts
symptoms:
  - showDredd fires twice in StrictMode
  - QR code doubles or disappears on fast remount
  - All vote failures show "duplicate_vote" regardless of cause
  - Wrong drawer opens after exit animation
  - Login button stuck disabled after OAuth failure
root_causes:
  - Side effect called during render instead of useEffect
  - Two useEffect hooks sharing mutable ref with independent cleanup
  - Hardcoded error code instead of forwarding typed store result
  - Stale pendingCandidate not cleared when directly opening drawer
  - Missing try/catch on async OAuth call
---

# React Hooks, State Machine, and Error Forwarding Violations

Multi-agent code review of the `feat/auth-sharing-mobile` branch found 6 issues (4 P1, 2 P2) spanning React effect purity, shared ref management, typed error propagation, and AnimatePresence state machines.

## Fix 1: Render-time Side Effect (P1)

**File:** `src/app/login/login-client.tsx`

**Symptom:** `showDredd()` notification fires twice in StrictMode, fires on every re-render.

**Root Cause:** `showDredd()` called directly in the component render body instead of inside a `useEffect`. React re-executes the render function on every state change, and StrictMode double-invokes it to surface exactly this class of bug.

**Solution:**

```tsx
// BEFORE (broken) - side effect during render
if (error === "access_denied") {
  showDredd({ message: "Authentification refusée par le citoyen.", variant: "error" });
}

// AFTER (fixed) - side effect in useEffect
useEffect(() => {
  if (error === "access_denied") {
    showDredd({ message: "Authentification refusée par le citoyen.", variant: "error" });
  }
}, [error, showDredd]);
```

**Why:** Effects only run when dependencies change, not on every render. React can properly track the lifecycle.

## Fix 2: Split Effects Race Condition (P1)

**File:** `src/components/qr-code-display.tsx`

**Symptom:** QR code could double-render or disappear on fast remount (StrictMode, hot reload).

**Root Cause:** Two `useEffect` hooks managed the same `qrRef` mutable ref with independent cleanup lifecycles. On unmount, one effect could null the ref while the other's dynamic import was still resolving.

**Solution:** Collapse into single effect with combined cleanup:

```tsx
useEffect(() => {
  const node = containerRef.current;
  if (!node) return;

  let cancelled = false;

  import("qr-code-styling").then(({ default: QRCodeStyling }) => {
    if (cancelled) return;
    if (!qrRef.current) {
      qrRef.current = new QRCodeStyling({ ...qrOptions, data: url });
      qrRef.current.append(node);
    } else {
      qrRef.current.update({ data: url });
    }
  });

  return () => {
    cancelled = true;
    node.innerHTML = "";
    qrRef.current = null;
  };
}, [url]);
```

**Why:** Single source of truth for ref lifecycle. The `cancelled` flag prevents the async import callback from running after unmount. No split cleanup race.

## Fix 3: Wrong Error Code Forwarding (P1)

**Files:** `src/lib/store.ts`, `src/lib/actions.ts`

**Symptom:** All `addVote` failures (not_found, capacity, closed, duplicate) returned `"duplicate_vote"` to the client.

**Root Cause:** `addVote` returned a generic `{ success: false; error: string }` without error codes. `actions.ts` hardcoded `"duplicate_vote"` for all failure types.

**Solution:** Typed discriminated union with forwarded codes:

```typescript
// store.ts
export type AddVoteError = "not_found" | "capacity" | "closed" | "duplicate_vote";
export type AddVoteResult =
  | { success: true }
  | { success: false; error: string; code: AddVoteError };

// Each failure path returns the correct code:
if (!poll) return { success: false, error: "...", code: "not_found" };
if (poll.isClosed) return { success: false, error: "...", code: "closed" };

// actions.ts - forward instead of hardcode:
return { success: false, code: storeResult.code, error: storeResult.error };
```

**Why:** TypeScript enforces all error paths are covered. Client receives the correct code for dispatching appropriate UI feedback.

## Fix 4: Drawer State Machine Gap (P2)

**File:** `src/components/vote-form.tsx`

**Symptom:** After rapid taps during drawer exit animation, the wrong drawer could open.

**Root Cause:** When `activeCandidate` is null (during exit animation) and user taps a candidate, the else branch sets `activeCandidate` directly. But a stale `pendingCandidate` from a previous interaction could overwrite it when `handleExitComplete` fires.

**Solution:** Clear stale pending state when directly opening:

```tsx
function handleSuspectTap(candidate: string) {
  if (activeCandidate) {
    setPendingCandidate(candidate);
    setActiveCandidate(null);
  } else {
    setPendingCandidate(null); // clear stale pending
    setActiveCandidate(candidate);
  }
}
```

**Why:** Explicitly clears conflicting state during transitions. The exit animation callback can't overwrite a directly-opened drawer.

## Fix 5: OAuth Loading State Stuck (P2)

**File:** `src/app/login/login-client.tsx`

**Symptom:** Google sign-in button permanently disabled if OAuth throws (popup blocked, network error, user cancels).

**Root Cause:** `handleGoogleSignIn` sets `isLoading = true` with no try/catch. If `signIn.social` rejects, `isLoading` is never reset.

**Solution:**

```tsx
async function handleGoogleSignIn() {
  setIsLoading(true);
  try {
    await authClient.signIn.social({ provider: "google", callbackURL: callbackUrl });
  } catch {
    showDredd({ message: "Connexion Google échouée", variant: "error" });
    setIsLoading(false);
  }
}
```

**Why:** Loading state resets on error, re-enabling the button. User gets feedback via the established DreddFeedback pattern.

## Prevention Strategies

### Code Review Checklist

- [ ] No imperative side effect calls in component render body (outside hooks/handlers)
- [ ] Each mutable ref is managed by one effect; if shared, consolidate or document ownership
- [ ] Error codes from store/service layer are forwarded, not hardcoded
- [ ] Animation state machines explicitly clear state in exit branches
- [ ] All async external service calls have try/catch with loading state reset

### Detection Patterns

| Issue | What to look for |
|-------|-----------------|
| Render-time side effects | Function calls (toast, modal, tracking) between component declaration and JSX return, not inside hooks |
| Split ref management | Multiple `useEffect` hooks reading/writing the same `useRef` with separate cleanups |
| Hardcoded error codes | Catch blocks that return a fixed error string regardless of the actual error type |
| State machine gaps | AnimatePresence with `onExitComplete` where related state (pending/queued) isn't cleared in all branches |
| Missing async error handling | `setIsLoading(true)` without a corresponding `catch` or `finally` that resets it |

### Applicable ESLint Rules

- `react-hooks/exhaustive-deps` — catches missing effect dependencies (partial coverage)
- `react-hooks/rules-of-hooks` — ensures hooks are called correctly (doesn't catch render-time side effects)
- No standard rule catches split ref management or state machine gaps — these require manual review

## Related Documentation

- [Next Hydration Mismatch with useState](../runtime-errors/next-hydration-mismatch-typeof-window-useState.md) — related useEffect timing patterns
- [localStorage Redirect Blocks Voters](../logic-errors/localstorage-redirect-blocks-voters.md) — state machine anti-pattern with router.replace
- [Full App Review: Security, Testing, Cleanup](../code-quality/full-app-review-security-testing-cleanup.md) — discriminated union patterns for ActionResult
- [Agent Browser Auth & React Controlled Inputs](../integration-issues/agent-browser-auth-react-controlled-inputs.md) — Better Auth session patterns
- [Vercel React Best Practices Audit](../performance-issues/vercel-react-best-practices-audit-next16.md) — useWatch subscriptions, stable effect deps

## Verification

All fixes verified:
- 55/55 unit tests pass (`pnpm test`)
- Production build compiles clean (`pnpm build`)
- No TypeScript errors
