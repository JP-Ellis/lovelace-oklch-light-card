declare module 'culori' {
  export type Mode = 'rgb' | 'oklch' | 'oklab' | string;

  export interface ColorBase {
    mode: Mode;
    alpha?: number;
  }
  export interface Rgb extends ColorBase {
    mode: 'rgb';
    r: number;
    g: number;
    b: number;
  }
  export interface Oklch extends ColorBase {
    mode: 'oklch';
    l: number;
    c: number;
    h: number;
  }
  export type Color = Rgb | Oklch | ColorBase;

  export function converter<M extends string>(
    mode: M,
  ): (c: Color | string | undefined) => any;

  export function clampChroma(
    color: Color,
    mode?: string,
    target?: string,
  ): Color;

  export function inGamut(target?: string): (c: Color) => boolean;
  export function formatHex(c: Color | string | undefined): string | undefined;
}
