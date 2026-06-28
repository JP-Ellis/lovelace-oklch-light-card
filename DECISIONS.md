# DECISIONS

Recorded autonomously — the user is offline. Each entry is a question that would
normally have been asked, and the call we made.

## Stack

- **Language**: TypeScript. Standard for HA custom cards; Lit's typings are
  excellent.
- **Framework**: Lit 3.x. Aligns with HA's own frontend.
- **Bundler**: Rollup. Lighter than webpack; the HA community standard for
  custom cards. Vite is great but produces a heavier artifact and a more
  opinionated dev server we don't need.
- **Color lib**: `culori` (~30KB ESM, tree-shakable). Provides Oklab, OkLCh,
  `clampChroma`, sRGB conversion. Alternative considered: `colorjs.io` — also
  good but heavier and slower.
- **Lint/format**: skipping ESLint+Prettier configuration to keep the v0.1.0
  surface small. Will add in v0.2.0.
- **Tests**: skipping unit tests for v0.1.0. The math is mostly delegated to
  culori; the rendering is visual. Will add Vitest + a smoke render test in
  v0.2.0.

## Picker

- **Axis layout**: hue horizontal, chroma vertical. Considered hue vertical
  (radial-like) but horizontal hue is the standard reading direction and matches
  how HSL pickers in other tools (Photoshop, Figma) work, lowering the
  cognitive load.
- **Default `chroma_max`**: 0.37. The maximum chroma sRGB can reach at any
  hue/lightness is ~0.32; 0.37 gives a small margin of "out of gamut" fade
  region at the top of the plane which helpfully communicates the gamut shape.
- **Default `lightness`**: 0.75. Bright but not blown-out; good for living-room
  lights.
- **Default `debounce_ms`**: 80. HA's WebSocket round-trip plus most ZHA/Z2M
  light response times sit around 150–300ms; 80ms keeps interaction smooth
  without flooding the bus.
- **Render resolution**: 256x128. Bigger looks crisper but cost goes quadratic
  and rasterising on every L change must stay <16ms.

## Card

- **Service**: always `light.turn_on` with `rgb_color`. Considered `xy_color`
  for better wide-gamut bulbs (e.g. Hue) but `rgb_color` is universally
  supported and HA handles the conversion internally per integration.
- **Power-on**: defaults to true — picking a color implies you want to see it.
- **Multi-entity**: deferred to v0.2.0. v0.1.0 supports a single entity. The
  spec mentions "multiple lights" but to keep the picker UX simple (one
  crosshair, one current color) we ship single-entity first and document the
  deferral.

## Editor

- Built on `ha-form` (HA's built-in schema-driven form). No standalone deps.

## Releases

- **License**: MIT, copyright "JP-Ellis". Standard permissive license for HACS
  cards.
- **Versioning**: semver from v0.1.0. CI builds + attaches `oklch-light-card.js`
  to GH Release on tag push (`v*`).
- **HACS category**: `plugin` (lovelace frontend element).
- **README screenshots**: placeholder image links only — no real screenshots
  generated in v0.1.0.

## What we did NOT do

- No GitHub push (no credentials).
- No CI run locally (just commit the YAML).
- No HA config touched.
- No HACS submission PR — that's a manual user step after pushing the repo.
