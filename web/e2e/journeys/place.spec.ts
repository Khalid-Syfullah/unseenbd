import { expect, test } from "@playwright/test";
import { clipboardText, hydrated, withoutShareSheet } from "../support";

test.describe("Place page", () => {
  test("want to go, share, add to trending and write a tip", async ({ page }) => {
    await withoutShareSheet(page);
    await page.goto("/en/place/nilgiri-hill");
    await hydrated(page);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Nilgiri");

    // Want to go → on the bucket list (kept in this browser).
    const want = page.getByRole("button", { name: "Want to go" });
    await want.click();
    const onList = page.getByRole("button", { name: "On your list" });
    await expect(onList).toHaveAttribute("aria-pressed", "true");
    await page.goto("/en/bucket-list");
    await hydrated(page);
    await page.goto("/en/place/nilgiri-hill");
    await hydrated(page);
    await expect(page.getByRole("button", { name: "On your list" })).toBeVisible();

    // Share falls back to copying the page link.
    await page.getByRole("button", { name: "Share", exact: true }).first().click();
    await expect(page.getByText("Link copied")).toBeVisible();
    expect(await clipboardText(page)).toMatch(/\/en\/place\/nilgiri-hill$/);

    // Add to trending: the count goes up by one and the dialog explains the rule.
    const trend = page.getByRole("button", { name: /^Add to trending · \d+$/ });
    const before = Number((await trend.innerText()).match(/(\d+)\s*$/)![1]);
    await trend.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("One vote per person per place each season.");
    await expect(dialog.getByRole("status")).toContainText("You voted for");
    await dialog.getByRole("button", { name: "Close" }).click();
    await expect(
      page
        .getByRole("button", { name: `Trending · ${before + 1}` })
        .or(page.getByRole("button", { name: new RegExp(`· ${before + 1}$`) })),
    ).toHaveAttribute("aria-pressed", "true");

    // Write an experience or warning: a private note to the editors.
    await page.getByRole("button", { name: "Write an experience or warning" }).click();
    const tip = page.getByRole("dialog");
    await expect(tip).toBeVisible();
    await tip
      .getByRole("textbox")
      .first()
      .fill("The steps to the viewpoint are slippery after rain; good shoes help.");
    await tip.getByRole("button", { name: /^Send/ }).click();
    await expect(page.getByText(/thank/i).first()).toBeVisible();
  });
});
