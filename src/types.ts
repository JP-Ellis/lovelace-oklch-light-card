// Minimal Home Assistant frontend types — enough for a custom card.

export interface HassEntityState {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown> & {
    friendly_name?: string;
    rgb_color?: [number, number, number];
    hs_color?: [number, number];
    color_temp_kelvin?: number;
    brightness?: number;
    supported_color_modes?: string[];
  };
}

export interface HomeAssistant {
  states: Record<string, HassEntityState>;
  callService: (
    domain: string,
    service: string,
    data?: Record<string, unknown>,
  ) => Promise<unknown>;
}

export interface OklchCardConfig {
  type: string;
  entity: string;
  name?: string;
  lightness?: number;
  chroma_max?: number;
  debounce_ms?: number;
  power_on?: boolean;
}

export const DEFAULTS = {
  lightness: 0.75,
  chroma_max: 0.37,
  debounce_ms: 80,
  power_on: true,
} as const;
