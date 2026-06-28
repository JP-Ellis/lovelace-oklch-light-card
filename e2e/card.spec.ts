import { expect, test } from "@playwright/test";

// The fixture exposes a small harness on `globalThis.__oklch` for mounting the
// card with a mock Home Assistant object and recording service calls.
interface ServiceCall {
  domain: string;
  service: string;
  data: Record<string, unknown>;
}

declare global {
  interface Window {
    __oklch: {
      serviceCalls: ServiceCall[];
      mount: (
        config?: Record<string, unknown>,
        hassOverrides?: Record<string, unknown>,
      ) => Promise<boolean>;
    };
  }
}

const FIXTURE = "/e2e/fixture/index.html";

async function mount(
  page: import("@playwright/test").Page,
  config?: Record<string, unknown>,
  hassOverrides?: Record<string, unknown>,
): Promise<void> {
  await page.goto(FIXTURE);
  await page.evaluate(([c, h]) => window.__oklch.mount(c, h), [
    config,
    hassOverrides,
  ] as const);
  await expect(page.locator("oklch-light-card")).toBeVisible();
}

test.describe("oklch-light-card — rendering", () => {
  test("renders an ha-card", async ({ page }) => {
    await mount(page);
    await expect(page.locator("ha-card")).toBeVisible();
  });

  test("header shows the entity's friendly name", async ({ page }) => {
    await mount(page);
    await expect(page.locator(".header span").first()).toHaveText(
      "Living Room Lamp",
    );
  });

  test("header name can be overridden by config", async ({ page }) => {
    await mount(page, {
      type: "oklch-light-card",
      entity: "light.example",
      name: "Reading Lamp",
    });
    await expect(page.locator(".header span").first()).toHaveText(
      "Reading Lamp",
    );
  });

  test("renders the picker with an L slider and a plane canvas", async ({
    page,
  }) => {
    await mount(page);
    await expect(page.locator("oklch-picker")).toBeVisible();
    await expect(page.locator("#l-slider")).toBeVisible();
    await expect(page.locator("#plane")).toBeVisible();
  });

  test("renders the L/C/H meta readout", async ({ page }) => {
    await mount(page);
    const meta = page.locator(".meta");
    await expect(meta).toContainText("L ");
    await expect(meta).toContainText("C ");
    await expect(meta).toContainText("H ");
  });

  test("shows a not-found message when the entity is missing", async ({
    page,
  }) => {
    await mount(page, { type: "oklch-light-card", entity: "light.missing" });
    await expect(page.locator(".off")).toContainText("Entity not found");
    await expect(page.locator("oklch-picker")).toHaveCount(0);
  });
});

test.describe("oklch-light-card — interaction", () => {
  test("moving the lightness slider calls light.turn_on with an rgb color", async ({
    page,
  }) => {
    // debounce_ms: 0 so the service call flushes promptly after the input.
    await mount(page, {
      type: "oklch-light-card",
      entity: "light.example",
      debounce_ms: 0,
    });

    await page.locator("#l-slider").evaluate((el) => {
      const input = el as HTMLInputElement;
      input.value = "0.5";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });

    await expect
      .poll(() => page.evaluate(() => window.__oklch.serviceCalls.length))
      .toBeGreaterThan(0);

    const calls = await page.evaluate(() => window.__oklch.serviceCalls);
    const call = calls.at(-1)!;
    expect(call.domain).toBe("light");
    expect(call.service).toBe("turn_on");
    expect(call.data["entity_id"]).toBe("light.example");
    const rgb = call.data["rgb_color"] as number[];
    expect(rgb).toHaveLength(3);
    for (const channel of rgb) {
      expect(channel).toBeGreaterThanOrEqual(0);
      expect(channel).toBeLessThanOrEqual(255);
    }
  });

  test("does not turn on an off light when power_on is false", async ({
    page,
  }) => {
    await mount(
      page,
      {
        type: "oklch-light-card",
        entity: "light.example",
        debounce_ms: 0,
        power_on: false,
      },
      {
        states: {
          "light.example": {
            entity_id: "light.example",
            state: "off",
            attributes: { friendly_name: "Living Room Lamp" },
          },
        },
      },
    );

    await page.locator("#l-slider").evaluate((el) => {
      const input = el as HTMLInputElement;
      input.value = "0.5";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });

    // Give the (zero) debounce a chance to flush, then assert no call was made.
    await page.waitForTimeout(100);
    const count = await page.evaluate(() => window.__oklch.serviceCalls.length);
    expect(count).toBe(0);
  });
});

test.describe("oklch-light-card — layout", () => {
  test("the picker plane keeps a 2:1 aspect ratio", async ({ page }) => {
    await mount(page);
    const ratio = await page.locator("#wrap").evaluate((el) => {
      const r = el.getBoundingClientRect();
      return r.width / r.height;
    });
    expect(ratio).toBeGreaterThan(1.9);
    expect(ratio).toBeLessThan(2.1);
  });

  test("has no horizontal overflow at a narrow viewport", async ({ page }) => {
    await page.setViewportSize({ width: 380, height: 800 });
    await mount(page);
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflows).toBe(false);
  });
});
