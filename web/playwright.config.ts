import { defineConfig } from "@playwright/test";
import { E2E_ADMIN } from "./e2e/constants";

const PORT = 3100;

/** Throwaway database and media folder for the test server (recreated on every run). */
const E2E_DIR = ".e2e";

/**
 * Two kinds of Playwright test, both against a production build (`npm run build` first;
 * `npm run check` does that) served by `npm start` on port 3100:
 *
 *  - `e2e` project (`npm run test:e2e`): the main user journeys in `e2e/journeys/`.
 *  - `mobile-360` / `desktop-1280` (`npm run test:visual`): visual snapshots of the key screens
 *    (`e2e/visual.spec.ts`). Update the baselines with `npm run test:visual:update`.
 *
 * `npx playwright test` runs all of them. The server gets a fresh SQLite file and media folder in
 * `.e2e/` (migrated and seeded from ../data, plus one admin), so runs never touch
 * `data/unseenbd.sqlite` and always start from the same state.
 */
export default defineConfig({
  testDir: "./e2e",
  snapshotPathTemplate: "{testDir}/__screenshots__/{arg}-{projectName}{ext}",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  timeout: 60_000,
  expect: {
    timeout: 10_000,
    toHaveScreenshot: { animations: "disabled", caret: "hide", maxDiffPixelRatio: 0.02 },
  },
  use: {
    baseURL: `http://localhost:${PORT}`,
    colorScheme: "light",
    reducedMotion: "reduce",
    timezoneId: "Asia/Dhaka",
  },
  projects: [
    {
      name: "e2e",
      testMatch: "journeys/**/*.spec.ts",
      use: {
        viewport: { width: 1280, height: 900 },
        permissions: ["clipboard-read", "clipboard-write"],
      },
    },
    {
      name: "mobile-360",
      testMatch: "visual.spec.ts",
      use: { viewport: { width: 360, height: 780 }, deviceScaleFactor: 1 },
    },
    {
      name: "desktop-1280",
      testMatch: "visual.spec.ts",
      use: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 },
    },
  ],
  webServer: {
    command: [
      `rm -rf ${E2E_DIR}`,
      `mkdir -p ${E2E_DIR}`,
      "npm run --silent db:seed",
      "npm run --silent admin:create",
      "npm start",
    ].join(" && "),
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: false,
    stdout: "ignore",
    stderr: "pipe",
    env: {
      PORT: String(PORT),
      DATABASE_PATH: `${E2E_DIR}/unseenbd.sqlite`,
      MEDIA_DIR: `${E2E_DIR}/media`,
      SESSION_SECRET: "e2e-tests-only-session-secret-0123456789abcdef",
      COOKIE_SECURE: "0",
      LOG_LEVEL: "warn",
      ADMIN_EMAIL: E2E_ADMIN.email,
      ADMIN_PASSWORD: E2E_ADMIN.password,
      ADMIN_NAME: E2E_ADMIN.name,
    },
    timeout: 120_000,
  },
});
