import { defineConfig } from "@playwright/test";

const PORT = 3100;

/**
 * Visual snapshots of the key screens (npm run test:visual). Needs a production build first
 * (`npm run build`); `npm run check` does that. Update the baselines with `npm run test:visual:update`.
 */
export default defineConfig({
  testDir: "./e2e",
  snapshotPathTemplate: "{testDir}/__screenshots__/{arg}-{projectName}{ext}",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  expect: {
    toHaveScreenshot: { animations: "disabled", caret: "hide", maxDiffPixelRatio: 0.02 },
  },
  use: {
    baseURL: `http://localhost:${PORT}`,
    colorScheme: "light",
    reducedMotion: "reduce",
    timezoneId: "Asia/Dhaka",
  },
  projects: [
    { name: "mobile-360", use: { viewport: { width: 360, height: 780 }, deviceScaleFactor: 1 } },
    { name: "desktop-1280", use: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 } },
  ],
  webServer: {
    command: `npm run start -- -p ${PORT}`,
    url: `http://localhost:${PORT}/en`,
    reuseExistingServer: true,
    env: { SESSION_SECRET: "visual-snapshots-only-secret-0123456789abcdef" },
    timeout: 120_000,
  },
});
