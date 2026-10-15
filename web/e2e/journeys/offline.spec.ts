import { expect, test } from "@playwright/test";
import { hydrated } from "../support";

test.describe("Offline", () => {
  test("a district kept offline opens without a network", async ({ page, context }) => {
    await page.goto("/en/district/sylhet");
    await hydrated(page);
    // Wait for the service worker to take control of the page.
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    if (!(await page.evaluate(() => Boolean(navigator.serviceWorker.controller)))) {
      await page.reload();
      await hydrated(page);
    }

    await page.getByRole("button", { name: "Keep offline" }).click();
    await expect(page.getByRole("button", { name: "Saved for offline" })).toBeVisible({
      timeout: 30_000,
    });
    const title = await page.getByRole("heading", { level: 1 }).innerText();

    await context.setOffline(true);
    try {
      await page.reload();
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
      // A page that was never opened shows the offline page instead of a browser error.
      await page.goto("/en/district/rangpur").catch(() => {});
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("You are offline");
    } finally {
      await context.setOffline(false);
    }
  });

  test("My Bangladesh works offline and logged out", async ({ page, context }) => {
    await page.goto("/en/my-bangladesh");
    await hydrated(page);
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    // A second visit with the worker in control stores the page for offline use.
    await page.reload();
    await hydrated(page);

    await context.setOffline(true);
    try {
      await page.reload();
      await hydrated(page);
      const district = page.locator('[role="button"][data-slug="rangpur"]').first();
      await district.click();
      await expect(district).toHaveAttribute("aria-pressed", "true");
      await page.reload();
      await expect(page.locator('[role="button"][data-slug="rangpur"]').first()).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    } finally {
      await context.setOffline(false);
    }
  });
});
