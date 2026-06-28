# SPEC — OkLCh Light Card v0.1.0

## Why OkLCh

OkLCh is a perceptually uniform polar form of Oklab. Equal steps in L feel like
equal steps in perceived lightness; equal steps in H feel like equal hue rotation;
chroma is bounded but interpretable. This makes it much nicer for a 2D color
picker than HSV/HSL, where the perceived brightness and hue uniformity wobble
badly across the wheel.

## Picker UX

- **Plane**: 2D canvas, horizontal axis = hue (0..360, full wrap), vertical axis =
  chroma (0 at bottom, `chroma_max` at top). Lightness is held constant for the
  whole plane and controlled by a slider.
- **L slider**: range 0..1, default 0.75. Above the plane (full-width).
- **Crosshair**: small ring marker at the current (H, C) point. Re-stroked
  whenever the light's state changes.
- **Interaction**: pointerdown/pointermove on the plane updates the picked
  (L, C, H). The value is debounced (default 80ms) before calling
  `light.turn_on`. Pointer leaves capture on pointerup.
- **Gamut handling**: every plane pixel is mapped to OkLCh then to sRGB. If the
  point falls outside the sRGB gamut, we render the in-gamut clamped color
  (`culori.clampChroma`) at reduced saturation/opacity so the user can see the
  outer boundary visually fading. The actual emitted color is always the
  clamped, in-gamut sRGB triple.
- **Performance**: plane is rasterised at a reduced resolution (~256x128) and
  scaled up via CSS. Re-rasterised only when L changes (debounced ~30ms) or
  when the canvas resizes. Crosshair is a separate overlay div so it can move
  without re-painting.

## Color pipeline

1. Read `light.<entity>` state. If `rgb_color` attribute present → convert sRGB
   to OkLCh via `culori`. Else if `hs_color` or `color_temp_kelvin` → convert
   appropriately (fall back via culori). Initial L from config if state is off
   and no last color is known.
2. On pick: build `{ mode: 'oklch', l, c, h }`, run `clampChroma` to in-gamut
   sRGB, extract `[r,g,b]` as 0..255 integers.
3. Service call: `light.turn_on` with `entity_id` and `rgb_color: [r,g,b]`. If
   `power_on` is false, omit the call when the light is off.

## Config schema (JSON Schema-ish)

```yaml
type: custom:oklch-light-card
entity: light.foo          # required
name: "Living Room"        # optional, default friendly_name
lightness: 0.75            # optional, 0..1
chroma_max: 0.37           # optional, > 0
debounce_ms: 80            # optional, integer 0..1000
power_on: true             # optional
```

Validation happens in `setConfig` — throws on missing entity or wrong domain.

## Visual editor

`ha-form` schema, in order:

1. `entity` (selector: entity, domain `light`)
2. `name` (text)
3. `lightness` (number slider 0..1 step 0.01)
4. `chroma_max` (number 0.1..0.5 step 0.01)
5. `debounce_ms` (number 0..500 step 10)
6. `power_on` (boolean)

## Behaviour matrix

| State change                             | Reaction                                                              |
| ---------------------------------------- | --------------------------------------------------------------------- |
| Light turns on externally with new color | Crosshair moves to new color, L slider snaps to its L                 |
| Light turns off                          | Crosshair stays at last-known position, plane dimmed slightly via CSS |
| User drags plane                         | Debounced service call; crosshair follows pointer immediately         |
| L slider moves                           | Plane re-rasterises; crosshair stays at same (H,C)                    |
| Card resized                             | Plane re-rasterises to new size                                       |

## Out of scope (v0.1.0)

- Color temperature picker / Kelvin mode
- Brightness slider separate from L (we use L as both perceptual lightness and
  rough brightness proxy; HA brightness comes from rgb magnitude)
- Touch a11y beyond keyboard tab order to L slider
- I18n
- Saved palettes / favourites
