import process from "node:process";
import { defineConfig, devices } from "@playwright/test";

const IS_CI: boolean = Boolean(process.env["CI"]);
const PORT = 8080;
const BASE_URL = `http://localhost:${PORT}/`;
const FIXTURE_URL = `${BASE_URL}e2e/fixture/index.html`;

const browsers = [
  { name: "chromium", use: devices["Desktop Chrome"] },
  { name: "firefox", use: devices["Desktop Firefox"] },
  { name: "webkit", use: devices["Desktop Safari"] },
];

// CI installs Chromium only; run the full matrix locally.
const selected = IS_CI
  ? browsers.filter((b) => b.name === "chromium")
  : browsers;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: IS_CI,
  retries: IS_CI ? 2 : 0,
  workers: IS_CI ? 1 : "100%",
  reporter: IS_CI ? "github" : "html",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: selected.map(({ name, use }) => ({ name, use })),
  webServer: {
    command: `aubr http-server . -p ${PORT} -s -c-1`,
    url: FIXTURE_URL,
    reuseExistingServer: !IS_CI,
    timeout: 60_000,
  },
});
