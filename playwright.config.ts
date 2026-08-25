import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E configuration for the SWEAT regression journey.
 *
 * Usage:
 *   npx playwright install chromium webkit   # one-time browser download
 *   E2E_TEST_EMAIL=... E2E_TEST_PASSWORD=... npm run test:e2e
 *
 * Specs self-skip when credentials are not provided, so a bare
 * `npm test` / CI run without an environment never fails on E2E.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-safari", use: { ...devices["iPhone 13"] } },
    { name: "tablet", use: { ...devices["iPad (gen 7)"] } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
