# Shipped — v0.1.0

## What's in the box
- `src/picker.ts` — Lit 2D chroma×hue picker with L slider, crosshair, gamut
  fading, debounced `picker-change` events.
- `src/card.ts` — `OklchLightCard` Lit element. Reads light state, drives the
  picker, debounces `light.turn_on(rgb_color=...)`.
- `src/editor.ts` — `OklchLightCardEditor` via `ha-form`, full schema.
- `src/color.ts` — culori wrappers: `oklchToRgb255` (clamped, for emit) and
  `oklchToRgb255Fast` (channel-clamp, for plane raster — ~10× faster).
- `src/types.ts`, `src/culori.d.ts`, `src/index.ts` — types, ambient module
  decl, custom-card registration.
- HACS metadata (`hacs.json`, `info.md`), MIT `LICENSE`, `README.md`,
  `CHANGELOG.md`, `.github/workflows/release.yml`.
- `dist/oklch-light-card.js` (68 KB minified, committed for HACS).

## Build status
`npm run build` → 68 KB ES bundle, clean except an unavoidable circular-dep
warning from culori's own modules (harmless).

## Decisions actually made (full list in DECISIONS.md)
- TypeScript + Lit 3 + Rollup + culori.
- Single entity for v0.1.0 (multi-entity deferred).
- Always emit `rgb_color` (not `xy_color`) — universal.
- Defaults: `lightness=0.75`, `chroma_max=0.37`, `debounce_ms=80`,
  `power_on=true`.
- No ESLint/Prettier/tests in v0.1.0 (kept surface small).
- Plane rasterised at 256×128 and CSS-upscaled.
- Plane uses channel-clamped fast conversion; emitted color uses
  `clampChroma` for true gamut clamping.
- Skip external state sync mid-drag to avoid yanking the crosshair.

## Deferred to v0.2.0+
- Multi-entity support (drive several lights from one card).
- Color temperature (Kelvin) mode for white-only or CCT lights.
- Independent brightness slider (currently L is a brightness proxy via rgb
  magnitude).
- Saved palettes / favourites.
- Real screenshots in README.
- Unit tests (Vitest) + lint pipeline + visual smoke test.
- Full keyboard / screen-reader a11y on the picker plane.
- A dedicated out-of-gamut warning indicator (currently only visual fade).

## Known limitations
- "Fast" plane raster checks gamut by channel-clamp; the fade boundary is
  visually correct but the exact sRGB gamut shape is approximate. The emitted
  color is always truly in-gamut.
- No tests — colour-math regressions could slip in. culori is pinned.
- HACS distribution still requires a manual user push to GitHub and a release
  tag (CI does the rest).

## Tag
`v0.1.0`.

## Subagent count
0 — the work was small enough that direct execution was faster than the
coordination overhead of dispatching subagents.
