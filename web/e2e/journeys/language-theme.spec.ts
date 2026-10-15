import { expect, test } from "@playwright/test";
import { hydrated } from "../support";

test.describe("Language and theme", () => {
  test("switch from Bengali to English and back", async ({ page }) => {
    await page.goto("/explore");
    await hydrated(page);
    await expect(page.locator("html")).toHaveAttribute("lang", "bn");

    await page.locator("header select").first().selectOption("en");
    await expect(page).toHaveURL(/\/en\/explore$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Places to visit in Bangladesh",
    );
    await hydrated(page);

    await page.locator("header select").first().selectOption("bn");
    await expect(page).toHaveURL(/\/explore$/);
    await expect(page).not.toHaveURL(/\/en\//);
    await expect(page.locator("html")).toHaveAttribute("lang", "bn");

    // hreflang alternates are on the page.
    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute(
      "href",
      /\/en\/explore$/,
    );
  });

  test("dark theme is applied and remembered", async ({ page }) => {
    await page.goto("/en");
    await hydrated(page);
    const html = page.locator("html");
    await expect(html).toHaveAttribute("data-theme", "light");

    const toggle = page.getByRole("switch", { name: "Dark theme" }).first();
    await toggle.click();
    await expect(html).toHaveAttribute("data-theme", "dark");
    await expect(toggle).toHaveAttribute("aria-checked", "true");

    // Kept in a cookie: applied before first paint on the next page.
    await page.goto("/en/explore");
    await expect(html).toHaveAttribute("data-theme", "dark");
    const cookies = await page.context().cookies();
    expect(cookies.find((c) => c.name === "theme")?.value).toBe("dark");

    await page.getByRole("switch", { name: "Dark theme" }).first().click();
    await expect(html).toHaveAttribute("data-theme", "light");
  });
});
