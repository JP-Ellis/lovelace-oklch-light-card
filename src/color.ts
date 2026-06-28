// Color glue around culori. Centralises OkLCh ↔ sRGB conversions, clamping, and
// gamut tests so the picker and the card stay decoupled from culori specifics.
import { clampChroma, converter, formatHex, inGamut } from "culori";

const toRgb = converter("rgb");
const toOklch = converter("oklch");
const inSrgb = inGamut("rgb");

export interface Oklch {
  l: number;
  c: number;
  h: number;
}

export interface Rgb255 {
  r: number;
  g: number;
  b: number;
}

/**
 * Convert an OkLCh point to sRGB integers [0..255], clamping CHROMA so the
 * result is in-gamut. Use this for the actual color emitted to HA (one call
 * per pick — culori's clampChroma is a binary search, so not free).
 */
export function oklchToRgb255(p: Oklch): Rgb255 {
  const oklchObj = { mode: "oklch" as const, l: p.l, c: p.c, h: p.h };
  const clamped = clampChroma(oklchObj, "oklch", "rgb");
  const rgb = toRgb(clamped) || { r: 0, g: 0, b: 0 };
  return {
    r: Math.round(clamp01(rgb.r) * 255),
    g: Math.round(clamp01(rgb.g) * 255),
    b: Math.round(clamp01(rgb.b) * 255),
  };
}

/**
 * Cheap variant for bulk plane rendering. Returns the raw oklch→rgb conversion,
 * channel-clamped to [0..255], and an `inGamut` flag based on whether any
 * channel needed clamping. ~10x faster than oklchToRgb255 because it skips the
 * binary search.
 */
export function oklchToRgb255Fast(p: Oklch): Rgb255 & { inGamut: boolean } {
  const rgb = toRgb({ mode: "oklch", l: p.l, c: p.c, h: p.h }) || {
    r: 0,
    g: 0,
    b: 0,
  };
  const { r, g, b } = rgb;
  const withinGamut = r >= 0 && r <= 1 && g >= 0 && g <= 1 && b >= 0 && b <= 1;
  return {
    r: Math.round(clamp01(r) * 255),
    g: Math.round(clamp01(g) * 255),
    b: Math.round(clamp01(b) * 255),
    inGamut: withinGamut,
  };
}

/** Whether the OkLCh point fits inside sRGB without clamping. */
export function isInSrgb(p: Oklch): boolean {
  return inSrgb({ mode: "oklch", l: p.l, c: p.c, h: p.h });
}

/** Convert sRGB integers [0..255] to OkLCh. */
export function rgb255ToOklch(r: number, g: number, b: number): Oklch {
  const lch = toOklch({ mode: "rgb", r: r / 255, g: g / 255, b: b / 255 });
  return {
    l: lch?.l ?? 0,
    c: lch?.c ?? 0,
    h: lch?.h ?? 0,
  };
}

/** CSS hex for a given OkLCh (after clamping). */
export function oklchToHex(p: Oklch): string {
  const clamped = clampChroma(
    { mode: "oklch", l: p.l, c: p.c, h: p.h },
    "oklch",
    "rgb",
  );
  return formatHex(clamped) ?? "#000000";
}

function clamp01(v: number): number {
  if (Number.isNaN(v)) {
    return 0;
  }
  return Math.min(Math.max(v, 0), 1);
}
