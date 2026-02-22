---
title: "fix: QR code not recognized by iPhone camera"
type: fix
status: completed
date: 2026-02-22
---

# fix: QR code not recognized by iPhone camera

iPhone cameras do not detect the QR code at all. The radial gradient fades outer dots to low-contrast purple (#7b00ff, ~3:1 ratio) against the dark background (#08080c), preventing the camera from locating finder patterns.

## Acceptance Criteria

- [x] iPhone camera reliably detects and scans the QR code
- [x] QR code retains cyberpunk neon-on-dark aesthetic
- [x] Existing component architecture unchanged (single useEffect, dynamic import, SSR guards)

## Changes

Single file: `src/components/qr-code-display.tsx` — modify the `qrOptions` object:

```typescript
const qrOptions = {
  width: 256,
  height: 256,
  type: "svg" as const,
  margin: 16,                              // ADD: proper quiet zone (~4 modules)
  dotsOptions: {
    type: "rounded" as const,              // CHANGE: "dots" → "rounded" (better module fill)
    color: "#00f0ff",                      // CHANGE: gradient → flat neon cyan (16:1 contrast)
  },
  backgroundOptions: { color: "#08080c" }, // KEEP: dark background
  cornersSquareOptions: {
    type: "extra-rounded" as const,        // KEEP
    color: "#00f0ff",                      // KEEP: high contrast
  },
  cornersDotOptions: { color: "#ff2d7b" }, // KEEP: high contrast
  qrOptions: {
    errorCorrectionLevel: "H" as const,    // CHANGE: "M" → "H" (30% error recovery)
  },
};
```

**What changed and why:**

| Property | Before | After | Why |
|----------|--------|-------|-----|
| `margin` | (none) | `16` | ISO 18004 recommends 4-module quiet zone for reliable detection |
| `dotsOptions.type` | `"dots"` (circles) | `"rounded"` (rounded squares) | Better module fill area, easier for camera to distinguish modules |
| `dotsOptions.gradient` | Radial cyan→purple | Flat `#00f0ff` | Purple endpoint had ~3:1 contrast — below detection threshold |
| `errorCorrectionLevel` | `"M"` (15%) | `"H"` (30%) | More redundancy compensates for any remaining edge-case scan issues |

## Verification

1. Start dev server, navigate to any poll page with QR code visible
2. Open iPhone camera and point at screen
3. QR code link indicator should appear within 1-2 seconds
4. Tap to confirm it navigates to the correct poll URL

## References

- Brainstorm: `docs/brainstorms/2026-02-22-qr-code-scannability-brainstorm.md`
- Component: `src/components/qr-code-display.tsx`
- Learnings: `docs/solutions/logic-errors/react-hooks-and-state-machine-violations.md` (confirmed current useEffect pattern is correct)
