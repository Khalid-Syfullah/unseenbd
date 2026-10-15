import { expect, test } from "@playwright/test";
import { hydrated } from "../support";

test.describe("Explore", () => {
  test("filters are mirrored in the URL and the map sets the district", async ({ page }) => {
    await page.goto("/en/explore");
    await hydrated(page);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Places to visit in Bangladesh",
    );
    await expect(page.getByText("257 results")).toBeVisible();

    // District select → ?district=
    await page.getByLabel("District", { exact: true }).selectOption("bandarban");
    await expect(page).toHaveURL(/[?&]district=bandarban/);
    await expect(page.getByText(/^\d+ results?/)).not.toHaveText("257 results");

    // Type select adds ?kind= and keeps the district.
    await page.getByLabel("Type", { exact: true }).selectOption("waterfall");
    await expect(page).toHaveURL(/district=bandarban/);
    await expect(page).toHaveURL(/kind=waterfall/);
    const cards = page.locator("section[aria-labelledby='explore-results'] article");
    await expect(cards.first()).toBeVisible();
    for (const text of await cards.allInnerTexts()) expect(text).toMatch(/Bandarban/);

    // Month and "only lesser-known".
    await page.getByLabel("Month", { exact: true }).selectOption("11");
    await expect(page).toHaveURL(/month=11/);
    await page.getByRole("switch", { name: "Only lesser-known" }).click();
    await expect(page).toHaveURL(/unseen=1/);

    // A reload keeps every filter.
    await page.reload();
    await expect(page.getByLabel("District", { exact: true })).toHaveValue("bandarban");
    await expect(page.getByLabel("Type", { exact: true })).toHaveValue("waterfall");
    await expect(page.getByLabel("Month", { exact: true })).toHaveValue("11");
    await expect(page.getByRole("switch", { name: "Only lesser-known" })).toHaveAttribute(
      "aria-checked",
      "true",
    );

    // Clear, then pick a district on the map.
    await page.getByRole("link", { name: "Clear filters" }).first().click();
    await expect(page).toHaveURL(/\/en\/explore$/);
    await hydrated(page);
    const sylhet = page.locator('[role="button"][data-slug="sylhet"]');
    await sylhet.click();
    await expect(page).toHaveURL(/district=sylhet/);
    await expect(page.getByLabel("District", { exact: true })).toHaveValue("sylhet");
    await expect(page.locator('[role="button"][data-slug="sylhet"]')).toHaveAttribute(
      "aria-current",
      "true",
    );
    // Tapping it again clears the filter.
    await page.locator('[role="button"][data-slug="sylhet"]').click();
    await expect(page).not.toHaveURL(/district=/);
  });
});
