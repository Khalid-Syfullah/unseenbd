import { expect, test } from "@playwright/test";
import { hydrated } from "../support";

test.describe("Games", () => {
  test("play a full round of the ten-question sprint", async ({ page }) => {
    await page.goto("/en/play?game=ten_question_run");
    await hydrated(page);
    const panel = page.getByRole("tabpanel");
    await expect(panel.getByText(/Round 1\/20/)).toBeVisible();

    for (let round = 1; round <= 20; round++) {
      const question = panel.getByText(/^Which division is .+ in\?$/);
      await expect(question).toBeVisible();
      const options = panel
        .getByRole("group")
        .filter({ has: page.locator("button") })
        .first();
      await options.locator("button").first().click();
      await expect(panel.getByText(/^(Correct!|Not quite\. The answer is .+\.)$/)).toBeVisible();
      await panel
        .getByRole("button", { name: round === 20 ? "See your score" : "Next question" })
        .click();
    }

    await expect(panel.getByText("Your score")).toBeVisible();
    await expect(panel.getByText(/\d+ \/ 20/).first()).toBeVisible();

    // The personal record is kept in this browser.
    const stored = await page.evaluate(() => JSON.stringify(localStorage));
    expect(stored).toMatch(/ten_question_run/);
  });
});
