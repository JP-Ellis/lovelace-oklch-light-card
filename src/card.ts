import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import "./picker.js";
import { type Oklch, oklchToRgb255, rgb255ToOklch } from "./color.js";
import { DEFAULTS, type HomeAssistant, type OklchCardConfig } from "./types.js";

// Rough height hint (in ~50px rows) Lovelace uses to lay the card out.
const CARD_SIZE = 5;
// Fractional digits shown for the chroma readout in the meta line.
const CHROMA_DIGITS = 3;

@customElement("oklch-light-card")
export class OklchLightCard extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @state() private _config?: OklchCardConfig;
  @state() private _value: Oklch = { l: DEFAULTS.lightness, c: 0.1, h: 0 };

  private _lastEntityVersion = "";
  private _pendingTimer: number | undefined;
  private _pendingValue?: Oklch;

  static styles = css`
    :host {
      display: block;
    }
    ha-card {
      padding: 16px;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
      font-weight: 500;
    }
    .swatch {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 1px solid var(--divider-color, #888);
    }
    .meta {
      margin-top: 10px;
      font-size: 0.78em;
      opacity: 0.7;
      display: flex;
      justify-content: space-between;
      font-variant-numeric: tabular-nums;
    }
    .off {
      font-size: 0.75em;
      color: var(--secondary-text-color, #888);
    }
  `;

  static getConfigElement() {
    return document.createElement("oklch-light-card-editor");
  }

  static getStubConfig(): Partial<OklchCardConfig> {
    return { entity: "light.example" };
  }

  setConfig(config: OklchCardConfig): void {
    if (!config.entity) {
      throw new Error("`entity` is required");
    }
    if (!config.entity.startsWith("light.")) {
      throw new Error("`entity` must be a light.* entity");
    }
    if (
      config.lightness !== undefined &&
      (config.lightness < 0 || config.lightness > 1)
    ) {
      throw new Error("`lightness` must be in [0, 1]");
    }
    if (config.chroma_max !== undefined && config.chroma_max <= 0) {
      throw new Error("`chroma_max` must be > 0");
    }
    this._config = config;
    this._value = {
      l: config.lightness ?? DEFAULTS.lightness,
      c: this._value.c,
      h: this._value.h,
    };
  }

  getCardSize(): number {
    return CARD_SIZE;
  }

  protected updated(): void {
    if (!(this._config && this.hass)) {
      return;
    }
    const ent = this.hass.states[this._config.entity];
    if (!ent) {
      return;
    }
    // Cheap change-detection by stringifying the relevant slice.
    const version = `${ent.state}|${JSON.stringify(ent.attributes.rgb_color)}|${
      ent.attributes.brightness ?? ""
    }`;
    if (version === this._lastEntityVersion) {
      return;
    }
    this._lastEntityVersion = version;

    // Don't yank the value out from under the user mid-drag/debounce.
    if (this._pendingTimer !== undefined) {
      return;
    }

    if (ent.attributes.rgb_color) {
      const [r, g, b] = ent.attributes.rgb_color;
      const lch = rgb255ToOklch(r, g, b);
      // Preserve user's L preference if the light is off-state-ish; otherwise
      // adopt the actual L.
      this._value = lch;
    }
  }

  private _onPick(e: CustomEvent<{ value: Oklch }>): void {
    const v = e.detail.value;
    this._value = v;
    this._pendingValue = v;
    if (this._pendingTimer !== undefined) {
      clearTimeout(this._pendingTimer);
    }
    const debounce = this._config?.debounce_ms ?? DEFAULTS.debounce_ms;
    this._pendingTimer = globalThis.setTimeout(() => this._flush(), debounce);
  }

  private _flush(): void {
    this._pendingTimer = undefined;
    if (!(this._pendingValue && this._config && this.hass)) {
      return;
    }
    const v = this._pendingValue;
    this._pendingValue = undefined;
    const { r, g, b } = oklchToRgb255(v);
    const ent = this.hass.states[this._config.entity];
    const isOff = !ent || ent.state === "off" || ent.state === "unavailable";
    const powerOn = this._config.power_on ?? DEFAULTS.power_on;
    if (isOff && !powerOn) {
      return;
    }
    // Fire-and-forget: the picker is live and the next pick will re-issue;
    // there is nothing to await on a single turn_on.
    // biome-ignore lint/complexity/noVoid: marks a deliberately-unawaited promise
    void this.hass.callService("light", "turn_on", {
      entity_id: this._config.entity,
      rgb_color: [r, g, b],
    });
  }

  protected render() {
    if (!(this._config && this.hass)) {
      return html``;
    }
    const ent = this.hass.states[this._config.entity];
    const friendly =
      this._config.name ?? ent?.attributes.friendly_name ?? this._config.entity;
    const chromaMax = this._config.chroma_max ?? DEFAULTS.chroma_max;
    const lightOn = ent?.state === "on";
    const { r, g, b } = oklchToRgb255(this._value);
    const swatch = `rgb(${r},${g},${b})`;
    if (!ent) {
      return html`
        <ha-card>
          <div class="header">
            <span>${friendly}</span>
          </div>
          <div class="off">Entity not found: ${this._config.entity}</div>
        </ha-card>
      `;
    }
    return html`
      <ha-card>
        <div class="header">
          <span>${friendly}</span>
          <span class="swatch" style="background:${swatch}"></span>
        </div>
        <oklch-picker
          .value=${this._value}
          .chromaMax=${chromaMax}
          .lightOn=${lightOn}
          @picker-change=${this._onPick}
        ></oklch-picker>
        <div class="meta">
          <span>L ${this._value.l.toFixed(2)}</span>
          <span>C ${this._value.c.toFixed(CHROMA_DIGITS)}</span>
          <span>H ${Math.round(this._value.h)}°</span>
          <span>${swatch}</span>
        </div>
      </ha-card>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "oklch-light-card": OklchLightCard;
  }
  // The Lovelace custom-card registry, exposed by Home Assistant on the global
  // object. Declared with `var` so it is reachable via `globalThis`; this is
  // the canonical idiom for augmenting the global scope.
  var customCards:
    | Array<{
        type: string;
        name: string;
        description?: string;
        preview?: boolean;
        documentationURL?: string;
      }>
    | undefined;
}
