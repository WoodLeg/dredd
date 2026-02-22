---
title: "feat: Connected User Identity Badge"
type: feat
status: completed
date: 2026-02-22
---

# feat: Connected User Identity Badge

## Overview

Add a floating identity badge (fixed top-right corner) that shows the authenticated user's Google avatar and display name. Clicking expands a dropdown with full info and a sign-out action. Currently there is **zero UI** indicating whether the user is connected — no header, no avatar, no sign-out mechanism anywhere in the app.

## Problem Statement

Users authenticate via Google OAuth but have no visual confirmation of their identity. There is also no way to sign out or switch accounts. This creates confusion ("am I logged in?") and a dead-end if the user needs to change identity.

## Proposed Solution

A `UserBadge` client component rendered in the root layout, floating in the top-right corner on every page. It uses `authClient.useSession()` from Better Auth's React client for reactive session state — no prop drilling needed.

### Behavior

| State | Display |
|-------|---------|
| Authenticated | Avatar + truncated name, clickable |
| Loading (session resolving) | Skeleton shimmer (small pill) |
| Unauthenticated | Nothing — component renders `null` |
| On `/login` page | Hidden (redundant) |

### Expanded dropdown (on click)

- Full display name
- Email (truncated if long)
- "Déconnexion" button → `authClient.signOut()` → redirect to `/login`
- Click outside or Escape → closes

### Dystopian lexicon

| Element | Text |
|---------|------|
| Tooltip / aria-label | "Identité du Juge" |
| Sign-out button | "Quitter le Tribunal" |
| Name prefix (optional subtle label) | "Juge" |

## Technical Approach

### New file: `src/components/user-badge.tsx` (client component)

```
"use client"
- authClient.useSession() for reactive session
- useState for dropdown open/close
- usePathname() to hide on /login
- useRef + useEffect for click-outside detection
- motion.div for dropdown enter/exit animation (AnimatePresence)
- next/image for Google avatar (or <img> with referrerPolicy="no-referrer")
- authClient.signOut() + router.push("/login") for sign-out
```

**Key considerations:**
- Google avatar URLs (`lh3.googleusercontent.com`) need `referrerPolicy="no-referrer"` to avoid 403s
- Add `lh3.googleusercontent.com` to `next.config.ts` `images.remotePatterns` if using `next/image`
- Avatar fallback: first letter of name in a styled circle if `user.image` is null

### Modified file: `src/app/layout.tsx`

Add `<UserBadge />` inside `<DreddFeedbackProvider>`, sibling to `{children}`. Since it's a client component that self-manages its session state, no server-side changes needed in the layout.

```tsx
<DreddFeedbackProvider>
  <UserBadge />
  {children}
</DreddFeedbackProvider>
```

### Modified file: `next.config.ts`

Add Google profile image domain to `images.remotePatterns` (if using `next/image`).

### Styling

- Fixed `top-4 right-4` (or `top-3 right-3` on mobile), `z-50`
- HUD aesthetic: `bg-surface/90 backdrop-blur-sm`, `border border-neon-cyan/20`
- `hud-clip` class for angular clip-path
- Avatar: 32px circle, `ring-1 ring-neon-cyan/40`
- Name: `font-heading text-xs uppercase tracking-wider text-neon-cyan`
- Dropdown: `hud-card` style, Motion spring animation (slide down + fade)
- Sign-out button: `text-neon-magenta hover:text-neon-magenta/80` for destructive action color
- Mobile: same position, touch-friendly tap target (min 44px), dropdown may shift left to stay in viewport

## Edge Cases

| Scenario | Handling |
|----------|----------|
| Session expires while browsing | `useSession()` returns null → badge disappears. Existing auth-expired flows in server actions already handle this. |
| Login page | Hide badge via `usePathname() === "/login"` check |
| Long display name | Truncate with `max-w-[120px] truncate` on the collapsed badge |
| No avatar from Google | Fallback: circular badge with first letter of `user.name`, styled with `bg-neon-cyan/20 text-neon-cyan` |
| Mobile viewport | Badge stays top-right, dropdown expands left to avoid overflow. `right-0` anchor on dropdown. |
| Rapid click toggle | Let state toggle naturally — no debounce needed for a boolean toggle |
| SSR flash | `useSession()` may return `isPending: true` initially → show skeleton, then resolve. No layout shift since it's fixed-position. |

## Acceptance Criteria

- [x] Authenticated users see their Google avatar + name in top-right corner on all pages
- [x] Badge is hidden on the `/login` page
- [x] Clicking the badge opens a dropdown with full name, email, and sign-out
- [x] Sign-out clears the session and redirects to `/login`
- [x] Click outside or Escape closes the dropdown
- [x] Loading state shows a subtle skeleton (no layout shift)
- [x] Unauthenticated users see nothing (no empty badge, no flash)
- [x] Avatar fallback works when Google doesn't provide an image
- [x] Badge doesn't overlap page content on mobile
- [x] Animations use Motion, consistent with rest of app
- [x] All text follows dystopian lexical conventions
- [x] `z-index` doesn't conflict with `DreddFeedback` toasts or `GradeDrawer`

## References

- Auth client: `src/lib/auth-client.ts` — `createAuthClient` from `better-auth/react`
- Auth server config: `src/lib/auth.ts` — session shape, cookie cache config
- Feedback system: `src/lib/dredd-feedback-context.tsx` — z-index reference for layering
- UI components: `src/components/ui/button.tsx`, `src/components/ui/dredd-feedback.tsx` — Motion animation patterns
- Design tokens: `src/app/globals.css` — neon-cyan, surface, hud-card, hud-clip classes
- Lexical conventions: `CLAUDE.md` — dystopian vocabulary table
