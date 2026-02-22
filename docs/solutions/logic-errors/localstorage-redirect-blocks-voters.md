---
title: Auto-redirect based on localStorage blocks new voters on same browser
date: 2026-02-15
category: logic-errors
tags:
  - localStorage
  - redirect
  - voting-flow
  - conditional-render
  - Next.js
severity: high
component: app/poll/[id]/page.tsx
problem_type: Incorrect route navigation logic
symptoms:
  - Poll URL auto-redirects to results page after creator votes
  - Creator cannot test or share poll link from same browser
  - Same-device users blocked from voting
  - Vote form never renders on returning visits
root_cause_summary: Hard redirect via router.replace() on mount based on localStorage flag prevented page rendering entirely
---

# localStorage Redirect Blocks New Voters

## Problem Statement

In the Jugement Majoritaire voting app, after the poll creator voted, any subsequent visit to `/poll/[id]` from the same browser auto-redirected to `/poll/[id]/results`. This made it impossible for:
- The creator to share/test the link from the same browser
- Other users on a shared device to vote
- Anyone to see the vote form once `voted_${pollId}` existed in localStorage

## Root Cause

The poll page used `router.replace()` inside a `useEffect` to redirect based on localStorage:

```tsx
// BROKEN
useEffect(() => {
  const voted = localStorage.getItem(`voted_${params.id}`);
  if (voted) {
    router.replace(`/poll/${params.id}/results`); // Hard redirect - page inaccessible
    return; // Skipped fetching poll data entirely
  }
  // ... fetch poll data
}, [params.id, router]);
```

This treated localStorage as a page-level gatekeeper, blocking all access instead of providing informational UI.

## Working Solution

Replaced the hard redirect with state-based conditional rendering:

```tsx
// FIXED
const [alreadyVoted, setAlreadyVoted] = useState(false);

useEffect(() => {
  const voted = localStorage.getItem(`voted_${params.id}`);
  if (voted) setAlreadyVoted(true);

  // Always fetch poll data (needed for "already voted" view too)
  fetch(`/api/polls/${params.id}`)
    .then(res => res.json())
    .then(setPoll)
    // ...
}, [params.id]); // router removed from deps

// In render:
if (alreadyVoted) {
  return (
    // "Vous avez deja vote" message + "Voir les resultats" link + ShareLink
  );
}
return <VoteForm ... />;
```

**Key changes:**
1. Removed `router.replace()` — replaced with `setAlreadyVoted(true)`
2. Removed `router` from useEffect dependencies
3. Always fetches poll data (needed to display question in "already voted" view)
4. Shows share link on "already voted" view so creator can still share

## Prevention Strategies

### General Principle: Redirects vs Conditional Renders

| Scenario | Redirect | Conditional Render |
|----------|----------|-------------------|
| Server-verified auth gate | Yes (middleware) | No |
| Client-side storage state | **No** | **Yes** |
| User already voted | No | Yes |
| Payment verification | Yes (server) | No |

**Rule:** Never call `router.push()`/`router.replace()` based solely on localStorage. Client-side storage should affect UI rendering, not navigation.

### Code Anti-Pattern Red Flags

```tsx
// RED FLAG: Immediate redirect based on localStorage
useEffect(() => {
  if (localStorage.getItem('key')) {
    router.push('/other-page'); // User is trapped
  }
}, []);

// CORRECT: Conditional render with fallback
const [voted, setVoted] = useState(false);
if (voted) return <AlreadyVotedUI />;
return <VoteForm />;
```

### Test Cases

1. **Same-browser multi-voter:** Vote on poll, open same link in new tab — should show "already voted" state, not redirect
2. **Cross-browser:** Vote in Chrome, open in Firefox — should show vote form (separate localStorage)
3. **Cleared localStorage:** Vote, clear localStorage, revisit — should show vote form again

## Related References

- [Plan document](../../plans/2026-02-15-feat-jugement-majoritaire-voting-app-plan.md) — line 117 originally specified the redirect behavior
- [Brainstorm](../../brainstorms/2026-02-15-jugement-majoritaire-brainstorm.md) — user flow defined "see results if already voted"
