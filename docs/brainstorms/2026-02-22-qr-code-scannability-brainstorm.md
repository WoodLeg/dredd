# QR Code Scannability Fix

**Date:** 2026-02-22
**Status:** Ready for planning

## What We're Building

Fix the QR code (flashcode) so iPhone cameras reliably detect and scan it. The current cyberpunk-styled QR code with radial gradient and circular dots is not recognized by iPhone cameras at all.

## Why This Approach

**Root cause:** The radial gradient fades outer dots to purple (#7b00ff) against a near-black background (#08080c), yielding ~3:1 contrast — well below the threshold iPhone's QR detector needs. Combined with circular dot shapes (reduced fill) and no explicit quiet zone, the camera can't even locate the finder patterns.

**Chosen approach:** Replace the gradient with a flat high-contrast neon cyan (#00f0ff) for all dots. This preserves the cyberpunk aesthetic while maximizing scannability.

## Key Decisions

1. **Flat neon cyan (#00f0ff) for all dots** — no gradient. ~16:1 contrast against dark background.
2. **Scannability over style** — function first, visual flair secondary.
3. **Keep dark background** (#08080c) — inverted QR (light-on-dark) is fine with proper contrast.
4. **Keep existing finder pattern colors** — cyan squares, magenta inner dots. Both high-contrast.

## Changes Required

In `src/components/qr-code-display.tsx`:

- **dotsOptions**: Replace radial gradient with flat `color: "#00f0ff"`
- **dotsOptions.type**: Consider switching from `"dots"` (circles) to `"rounded"` (rounded squares) for better module fill
- **qrOptions.errorCorrectionLevel**: Bump from `"M"` to `"H"` (30% error recovery)
- **Add margin**: Set explicit `margin: 16` (or ~4 modules) for proper quiet zone
- **Keep**: background, cornersSquareOptions, cornersDotOptions unchanged (already high-contrast)

## Rejected Approaches

- **Linear gradient (cyan → magenta)**: Still introduces contrast variation across the code. Unnecessary risk.
- **Standard black-on-white + neon frame**: Bulletproof but loses the dark-theme integration entirely.
