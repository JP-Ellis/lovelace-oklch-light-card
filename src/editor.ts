import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { HomeAssistant, OklchCardConfig } from './types.js';
import { DEFAULTS } from './types.js';

const SCHEMA = [
  {
    name: 'entity',
    selector: { entity: { domain: 'light' } },
  },
  { name: 'name', selector: { text: {} } },
  {
    name: 'lightness',
    selector: { number: { min: 0, max: 1, step: 0.01, mode: 'slider' } },
  },
  {
    name: 'chroma_max',
    selector: { number: { min: 0.1, max: 0.5, step: 0.01, mode: 'slider' } },
  },
  {
    name: 'debounce_ms',
    selector: { number: { min: 0, max: 500, step: 10, mode: 'box' } },
  },
  { name: 'power_on', selector: { boolean: {} } },
];

@customElement('oklch-light-card-editor')
export class OklchLightCardEditor extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @state() private _config?: OklchCardConfig;

  static styles = css`
    :host {
      display: block;
    }
  `;

  setConfig(config: OklchCardConfig): void {
    this._config = config;
  }

  private _valueChanged(ev: CustomEvent): void {
    const value = ev.detail.value as OklchCardConfig;
    this.dispatchEvent(
      new CustomEvent('config-changed', {
        detail: { config: value },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _computeLabel = (s: { name: string }): string => {
    switch (s.name) {
      case 'entity':
        return 'Entity (required)';
      case 'name':
        return 'Name';
      case 'lightness':
        return 'Default lightness (L)';
      case 'chroma_max':
        return 'Max chroma';
      case 'debounce_ms':
        return 'Debounce (ms)';
      case 'power_on':
        return 'Turn light on when picking';
      default:
        return s.name;
    }
  };

  protected render() {
    if (!this.hass || !this._config) return html``;
    const data = {
      ...DEFAULTS,
      ...this._config,
    };
    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${SCHEMA}
        .computeLabel=${this._computeLabel}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'oklch-light-card-editor': OklchLightCardEditor;
  }
}
