import { css, html, LitElement, type PropertyValues } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import { type Oklch, oklchToRgb255, oklchToRgb255Fast } from "./color.js";

const RASTER_W = 256;
const RASTER_H = 128;

/**
 * Internal picker component: an L slider above a 2D hue×chroma plane with a
 * crosshair. Fires `picker-change` (live, on pointer move) and the parent is
 * expected to debounce service calls.
 */
@customElement("oklch-picker")
export class OklchPicker extends LitElement {
  /** Current OkLCh value. Two-way: parent updates this when state changes. */
  @property({ attribute: false }) value: Oklch = { l: 0.75, c: 0.1, h: 0 };

  /** Maximum chroma displayed on the plane. */
  @property({ type: Number }) chromaMax = 0.37;

  /** Whether the bound light is "on" — controls plane dim state. */
  @property({ type: Boolean }) lightOn = true;

  @state() private _dragging = false;

  @query("#plane") private readonly _plane!: HTMLCanvasElement;
  @query("#wrap") private readonly _wrap!: HTMLDivElement;

  private _lastRenderedL = -1;
  private _lastRenderedCmax = -1;
  private _resizeObs?: ResizeObserver;

  static styles = css`
    :host {
      display: block;
      font-family: var(--primary-font-family, sans-serif);
      color: var(--primary-text-color, #222);
    }
    .row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 10px;
    }
    .row label {
      font-size: 0.85em;
      opacity: 0.8;
      min-width: 70px;
    }
    .row input[type='range'] {
      flex: 1;
      accent-color: var(--primary-color, #03a9f4);
    }
    .row .val {
      font-variant-numeric: tabular-nums;
      font-size: 0.8em;
      opacity: 0.7;
      min-width: 36px;
      text-align: right;
    }
    #wrap {
      position: relative;
      width: 100%;
      aspect-ratio: 2 / 1;
      border-radius: 8px;
      overflow: hidden;
      touch-action: none;
      cursor: crosshair;
      background: #111;
      user-select: none;
    }
    #plane {
      width: 100%;
      height: 100%;
      display: block;
      image-rendering: pixelated;
      transition: opacity 0.2s ease;
    }
    :host([data-off]) #plane {
      opacity: 0.45;
    }
    #crosshair {
      position: absolute;
      width: 18px;
      height: 18px;
      border: 2px solid #fff;
      border-radius: 50%;
      box-shadow: 0 0 0 1px #000, 0 1px 4px rgba(0, 0, 0, 0.5);
      transform: translate(-50%, -50%);
      pointer-events: none;
      transition: background-color 0.05s linear;
    }
    .swatch {
      display: inline-block;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      border: 1px solid var(--divider-color, #888);
      vertical-align: middle;
    }
  `;

  protected firstUpdated(_changed: PropertyValues): void {
    this._rasterise();
    this._resizeObs = new ResizeObserver(() => this._rasterise(true));
    this._resizeObs.observe(this._wrap);
  }

  protected updated(changed: PropertyValues): void {
    if (
      (changed.has("value") || changed.has("chromaMax")) &&
      (this.value.l !== this._lastRenderedL ||
        this.chromaMax !== this._lastRenderedCmax)
    ) {
      this._rasterise();
    }
    this.toggleAttribute("data-off", !this.lightOn);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._resizeObs?.disconnect();
  }

  private _rasterise(force = false): void {
    if (!this._plane) {
      return;
    }
    const { l } = this.value;
    if (
      !force &&
      l === this._lastRenderedL &&
      this.chromaMax === this._lastRenderedCmax
    ) {
      return;
    }
    this._lastRenderedL = l;
    this._lastRenderedCmax = this.chromaMax;

    this._plane.width = RASTER_W;
    this._plane.height = RASTER_H;
    const ctx = this._plane.getContext("2d");
    if (!ctx) {
      return;
    }
    const img = ctx.createImageData(RASTER_W, RASTER_H);
    const { data } = img;
    for (let y = 0; y < RASTER_H; y += 1) {
      // y=0 top → high chroma; y=H-1 bottom → 0 chroma
      const c = ((RASTER_H - 1 - y) / (RASTER_H - 1)) * this.chromaMax;
      for (let x = 0; x < RASTER_W; x += 1) {
        const h = (x / RASTER_W) * 360;
        const { r, g, b, inGamut } = oklchToRgb255Fast({ l, c, h });
        const i = (y * RASTER_W + x) * 4;
        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
        // Fade out-of-gamut points so the user sees where sRGB stops.
        data[i + 3] = inGamut ? 255 : 110;
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  private _onL(e: Event): void {
    const v = Number.parseFloat((e.target as HTMLInputElement).value);
    this.value = { ...this.value, l: v };
    this._emit();
  }

  private _onPointerDown(e: PointerEvent): void {
    this._dragging = true;
    (e.target as Element).setPointerCapture(e.pointerId);
    this._updateFromPointer(e);
  }

  private _onPointerMove(e: PointerEvent): void {
    // biome-ignore lint/suspicious/noUnnecessaryConditions: _dragging is reactive state toggled by the pointerdown/up handlers at runtime
    if (!this._dragging) {
      return;
    }
    this._updateFromPointer(e);
  }

  private _onPointerUp(e: PointerEvent): void {
    this._dragging = false;
    try {
      (e.target as Element).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  }

  private _updateFromPointer(e: PointerEvent): void {
    const rect = this._wrap.getBoundingClientRect();
    const x = clamp(e.clientX - rect.left, 0, rect.width);
    const y = clamp(e.clientY - rect.top, 0, rect.height);
    const h = (x / rect.width) * 360;
    const c = (1 - y / rect.height) * this.chromaMax;
    this.value = { ...this.value, c, h };
    this._emit();
  }

  private _emit(): void {
    this.dispatchEvent(
      new CustomEvent("picker-change", {
        detail: { value: { ...this.value } },
        bubbles: true,
        composed: true,
      }),
    );
  }

  protected render() {
    const { l, c, h } = this.value;
    const xPct = (h / 360) * 100;
    const yPct = (1 - c / this.chromaMax) * 100;
    const swatchBg = `rgb(${rgbVals(this.value)})`;
    return html`
      <div class="row">
        <label for="l-slider">Lightness</label>
        <input
          id="l-slider"
          type="range"
          min="0"
          max="1"
          step="0.01"
          .value=${String(l)}
          @input=${this._onL}
        />
        <span class="val">${l.toFixed(2)}</span>
      </div>
      <div
        id="wrap"
        @pointerdown=${this._onPointerDown}
        @pointermove=${this._onPointerMove}
        @pointerup=${this._onPointerUp}
        @pointercancel=${this._onPointerUp}
      >
        <canvas id="plane"></canvas>
        <div
          id="crosshair"
          style=${`left:${xPct}%;top:${yPct}%;background:${swatchBg};`}
        ></div>
      </div>
    `;
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(Math.max(v, lo), hi);
}

function rgbVals(p: Oklch): string {
  const { r, g, b } = oklchToRgb255(p);
  return `${r},${g},${b}`;
}

declare global {
  interface HTMLElementTagNameMap {
    "oklch-picker": OklchPicker;
  }
}
