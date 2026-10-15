import type { Page } from "@playwright/test";

/**
 * Helpers shared by the journeys. Tests use the English pages (`/en/…`) so labels are stable;
 * the language journey covers Bengali.
 */

/**
 * Removes `navigator.share`, so "Share" takes its copy-link fallback (headless browsers differ
 * in whether they have a share sheet).
 */
export async function withoutShareSheet(page: Page) {
  await page.addInitScript(() => {
    try {
      Object.defineProperty(Navigator.prototype, "share", { value: undefined, configurable: true });
    } catch {
      // already gone
    }
  });
}

/** What the page last copied. */
export async function clipboardText(page: Page): Promise<string> {
  return page.evaluate(() => navigator.clipboard.readText());
}

/** A fresh address per call, so reruns never collide. */
export function uniqueEmail(prefix = "traveller"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}@e2e.test`;
}

/**
 * Waits until React has hydrated the page (the header's theme switch carries React's internal
 * props) and the first data requests are done. Not `networkidle` alone: Next.js keeps some
 * background prefetches open for up to 30 s.
 */
export async function hydrated(page: Page) {
  await page.waitForLoadState("load");
  await page.waitForFunction(() => {
    const el = document.querySelector('header [role="switch"]');
    return Boolean(el) && Object.keys(el!).some((k) => k.startsWith("__reactFiber"));
  });
  await page.waitForLoadState("networkidle", { timeout: 2_000 }).catch(() => {});
}

/** Signs in through the form on /en/login. */
export async function signIn(page: Page, email: string, password: string) {
  await page.goto("/en/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL((url) => !url.pathname.endsWith("/login"));
}
