/**
 * Playwright configuration for the Bakaloo dashboard E2E suite.
 *
 * Scope:
 *   - `testDir: ./e2e` keeps Playwright specs separate from the vitest unit
 *     and property tests living under `src/**\/*.{test,spec}.{ts,tsx}`. The
 *     vitest config already excludes `tests/` and only includes `src/**`,
 *     so the two runners never collide.
 *   - `baseURL` points at the Next.js dev server bound by `npm run dev`
 *     (`next dev -p 3002`). Tests use relative paths (e.g. `await
 *     page.goto("/login")`) and Playwright resolves them against this URL.
 *   - `webServer.command: "npm run dev"` boots the dashboard before the
 *     suite runs. `reuseExistingServer: !process.env.CI` lets local
 *     iterations attach to a server you already have running, while CI
 *     always boots a fresh one.
 *   - `webServer.env` injects `NEXT_PUBLIC_API_URL` and
 *     `NEXT_PUBLIC_SOCKET_URL` so axios + socket.io clients have a
 *     deterministic base regardless of the developer's `.env.local`
 *     (Playwright tests intercept those URLs via `page.route`).
 *   - `projects` lists `chromium` only — keeps the suite lean for an
 *     initial pass; adding `firefox` / `webkit` later is a one-line edit.
 *
 * Browser binaries: `@playwright/test` does not download browsers
 * automatically. Run `npx playwright install chromium` once locally before
 * `npm run e2e` (CI image typically has them preinstalled).
 *
 * Requirements: 1.3, 1.4, 1.5, 2.4 (covered by the auth spec authored
 * alongside this config in task 15.2).
 */

import { defineConfig, devices } from "@playwright/test"

const PORT = 3002
const BASE_URL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: "./e2e",
  // Mirror the dashboard's existing test-results directory so reports/screens
  // land in the same place vitest already writes to (it stays gitignored).
  outputDir: "./test-results/playwright",
  // Long enough for cold Next.js dev compiles, short enough that hangs fail
  // the suite quickly. Individual tests can override via `test.setTimeout()`.
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: true,
  // Fail the build on `test.only` left in by mistake — common pitfall when
  // committing a focused debugging run.
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // CI runs single-worker so dev-server bootstrapping + parallel spec runs
  // don't fight over CPU on the constrained 2-core target environment.
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: BASE_URL,
    headless: true,
    // Capture artifacts on failure only — keeps disk usage bounded for the
    // full regression suite once additional specs are added (15.3+).
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
    env: {
      // Pin the API + socket bases so `lib/api.ts` and `SocketProvider`
      // emit URLs the test fixtures can intercept deterministically.
      // The actual backend at `:3000` is NOT booted by the suite — every
      // outbound call is mocked via `page.route` in each spec.
      NEXT_PUBLIC_API_URL: "http://localhost:3000/api/v1",
      NEXT_PUBLIC_SOCKET_URL: "http://localhost:3000",
    },
  },
})
