/// <reference types="vitest" />

import path from "node:path"
import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"

/**
 * Vitest configuration for the Bakaloo dashboard.
 *
 * - `environment: "jsdom"` so React Testing Library can mount components.
 * - `globals: true` exposes `describe` / `it` / `expect` without imports.
 * - `setupFiles` registers `@testing-library/jest-dom` matchers.
 * - The `@/*` alias mirrors `tsconfig.json` (`paths: { "@/*": ["./src/*"] }`).
 *   We resolve it via `resolve.alias` rather than `vite-tsconfig-paths` to
 *   avoid the ESM-only loader when vitest loads the config via require.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    css: false,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // Playwright lives under `tests/` — keep it out of the unit run.
    exclude: ["node_modules", "dist", ".next", "tests", "test-results"],
  },
})
