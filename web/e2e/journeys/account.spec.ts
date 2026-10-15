import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { hydrated, signIn, uniqueEmail } from "../support";

/** District ids (data/districts.json). */
const RANGAMATI = 24;
const KHULNA = 39;

/** The account's visited district ids, as the server has them. */
async function serverIds(page: Page): Promise<number[]> {
  const res = await page.request.get("/api/me/visited");
  return res.ok() ? ((await res.json()) as { ids: number[] }).ids : [];
}

test.describe("Accounts", () => {
  test("sign up, sign in on another device, and the map syncs both ways", async ({ browser }) => {
    const email = uniqueEmail();
    const password = "a-long-e2e-password";

    // Device A: tick a district while logged out, then create an account.
    const a = await browser.newContext();
    const pageA = await a.newPage();
    await pageA.goto("/en/my-bangladesh");
    await hydrated(pageA);
    const rangamati = pageA.locator('[role="button"][data-slug="rangamati"]').first();
    await rangamati.click();
    await expect(rangamati).toHaveAttribute("aria-pressed", "true");

    await pageA.goto("/en/register");
    await hydrated(pageA);
    await pageA.getByLabel("Name").fill("E2E Traveller");
    await pageA.getByLabel("Email").fill(email);
    await pageA.getByLabel("Password").fill(password);
    await pageA.getByRole("button", { name: "Create account" }).click();
    await pageA.waitForURL((url) => !url.pathname.endsWith("/register"));

    // The logged-out tick was merged into the account.
    await expect.poll(() => serverIds(pageA)).toEqual([RANGAMATI]);

    // Device B: a fresh browser signs in and sees the same map.
    const b = await browser.newContext();
    const pageB = await b.newPage();
    await signIn(pageB, email, password);
    await pageB.goto("/en/my-bangladesh");
    await hydrated(pageB);
    await expect(pageB.locator('[role="button"][data-slug="rangamati"]').first()).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    // A tick on device B reaches device A.
    const khulna = pageB.locator('[role="button"][data-slug="khulna"]').first();
    await khulna.click();
    await expect(khulna).toHaveAttribute("aria-pressed", "true");
    // The debounced (~400 ms) sync reaches the server.
    await expect.poll(() => serverIds(pageB)).toEqual([RANGAMATI, KHULNA]);

    await pageA.goto("/en/my-bangladesh");
    await hydrated(pageA);
    await expect(pageA.locator('[role="button"][data-slug="khulna"]').first()).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(pageA.locator('[role="button"][data-slug="rangamati"]').first()).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    // Signed in: the header shows the profile, and the profile page opens.
    await pageA.goto("/en/profile");
    await expect(pageA.getByRole("heading", { level: 1 })).toContainText("E2E Traveller");

    await a.close();
    await b.close();
  });
});
