import { expect, test } from "@playwright/test";
import { clipboardText, hydrated, withoutShareSheet } from "../support";

test.describe("My Bangladesh", () => {
  test("tick districts, share a link, make a short link and open it", async ({ page }) => {
    await withoutShareSheet(page);
    await page.goto("/en/my-bangladesh");
    await hydrated(page);

    // Tick two districts on the map.
    for (const slug of ["sylhet", "bandarban"]) {
      const district = page.locator(`[role="button"][data-slug="${slug}"]`).first();
      await district.click();
      await expect(district).toHaveAttribute("aria-pressed", "true");
    }
    await expect(page.getByText("2 / 64").or(page.getByText("2/64")).first()).toBeVisible();

    // Logged out, the ticks live in this browser and survive a reload.
    await page.reload();
    await hydrated(page);
    await expect(page.locator('[role="button"][data-slug="sylhet"]').first()).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    // Share link: carries the districts and the name.
    await page.getByLabel("Your name (optional)").fill("Rahim");
    const share = page.locator("#share");
    await share.getByRole("button", { name: "Copy link" }).click();
    const link = await clipboardText(page);
    expect(link).toContain("/en/");
    expect(link).toMatch(/Rahim/);

    // Short link: stored on the server, copied, and shown in a box.
    await share.getByRole("button", { name: "Short link" }).click();
    const box = share.getByRole("textbox", { name: "Short link" });
    await expect(box).toHaveValue(/\/en\/s\/[\w-]+$/);
    const short = await box.inputValue();
    expect(await clipboardText(page)).toBe(short);

    // Opening the short link shows the shared map with both districts.
    const visitor = await page.context().browser()!.newPage();
    await visitor.goto(short);
    await expect(visitor).not.toHaveURL(/\/s\//);
    await expect(visitor.getByText("Rahim").first()).toBeVisible();
    await expect(visitor.getByText("Sylhet").first()).toBeVisible();
    await expect(visitor.getByText("Bandarban").first()).toBeVisible();
    await visitor.close();
  });
});
