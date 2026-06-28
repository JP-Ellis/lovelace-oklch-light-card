# OkLCh Light Card

A perceptually-uniform color picker card for Home Assistant lights.

Most Lovelace color pickers use HSV or HSL, where equal pixel steps produce
visually uneven hue and lightness changes. This card uses **OkLCh** — a polar
form of the perceptually uniform Oklab color space — so dragging across the
plane _feels_ even, and out-of-gamut regions are visually faded so you can see
what the bulb actually can and can't reproduce.

![placeholder screenshot](https://via.placeholder.com/640x320?text=OkLCh+Light+Card)

## Features

- 2D **chroma × hue** picker plane at a configurable lightness.
- Separate lightness slider.
- Out-of-gamut points are faded; emitted color is always in-gamut sRGB
  (via `culori`'s `clampChroma`).
- Reactive: external state changes update the crosshair.
- Visual editor (drag into your dashboard, configure with the UI).
- Debounced service calls — smooth dragging without flooding the WebSocket.

## Install (HACS — custom repository)

1. In HACS, go to **Frontend → ⋮ → Custom repositories**.
2. Add `https://github.com/JP-Ellis/lovelace-oklch-light-card` as a
   **Lovelace** repository.
3. Install **OkLCh Light Card** and restart the frontend (HACS will prompt you).
4. Add the card to your dashboard via **Add Card → Custom: OkLCh Light Card**.

## Install (manual)

1. Download `oklch-light-card.js` from the latest
   [release](https://github.com/JP-Ellis/lovelace-oklch-light-card/releases).
2. Copy it to `<config>/www/community/lovelace-oklch-light-card/`.
3. Add a Lovelace resource:

   ```yaml
   url: /local/community/lovelace-oklch-light-card/oklch-light-card.js
   type: module
   ```

4. Reload the page.

## Usage

Minimal:

```yaml
type: custom:oklch-light-card
entity: light.living_room
```

Full options:

```yaml
type: custom:oklch-light-card
entity: light.living_room
name: Living room
lightness: 0.75       # initial L for the plane, 0..1
chroma_max: 0.37      # plane vertical extent
debounce_ms: 80       # interval between service calls during a drag
power_on: true        # also turn the light on when picking a color
```

| Option        | Type    | Default | Notes                                                  |
| ------------- | ------- | ------- | ------------------------------------------------------ |
| `entity`      | string  | —       | Required. Must be a `light.*` entity.                  |
| `name`        | string  | (auto)  | Falls back to the entity's `friendly_name`.            |
| `lightness`   | number  | `0.75`  | 0..1; default plane lightness.                         |
| `chroma_max`  | number  | `0.37`  | Plane vertical extent in OkLCh chroma.                 |
| `debounce_ms` | integer | `80`    | Service-call debounce while dragging.                  |
| `power_on`    | boolean | `true`  | If false, dragging does nothing when the light is off. |

## Development

```bash
npm install
npm run build   # → dist/oklch-light-card.js
```

## Why OkLCh?

OkLCh is built on Oklab (Björn Ottosson, 2020). It’s perceptually uniform —
equal steps in L feel like equal lightness steps, equal steps in H feel like
equal hue rotations. Compared to HSL/HSV, the difference is most visible around
yellows and cyans, where HSL pickers feel “lumpy.”

## License

MIT — see [LICENSE](./LICENSE).
