import { expect, test } from "@playwright/test";
import { hydrated } from "../support";

/** The figures in MASTER_PROMPT §5.4 and §5.5. */
test.describe("Trip planner and trip cost", () => {
  test("the Dhaka → Cox's Bazar sample gives the exact acceptance figures", async ({ page }) => {
    await page.goto("/en/plan");
    await hydrated(page);
    await page.getByRole("button", { name: "Sample: Dhaka → Cox's Bazar" }).first().click();

    const summary = page.locator("section[aria-labelledby='plan-summary']");
    await expect(summary).toContainText("Days3");
    await expect(summary).toContainText("Total distance840 km");
    await expect(summary).toContainText("Total cost৳22,200");
    await expect(summary).toContainText("Per person৳11,100");

    // Day cards: the leg fare per person.
    await expect(page.getByText(/≈ 420 km · .* · ৳1,930 per person/).first()).toBeVisible();

    // Cost table.
    const table = page.getByRole("table").last();
    for (const [label, amount] of [
      ["Transport", "৳7,720"],
      ["Stay", "৳6,000"],
      ["Food", "৳5,400"],
      ["Local transport", "৳1,400"],
      ["Entry fees & misc", "৳1,650"],
    ]) {
      await expect(table.getByRole("row", { name: new RegExp(`^${label}`) })).toContainText(
        amount!,
      );
    }
    await expect(table).toContainText("৳22,200");
    await expect(table).toContainText("৳11,100");

    // The plan is in the URL, so a reload shows the same trip.
    await expect(page).toHaveURL(/from=/);
    await page.reload();
    await expect(page.locator("section[aria-labelledby='plan-summary']")).toContainText(
      "Total cost৳22,200",
    );
  });

  test("trip cost: Dhaka → Cox's Bazar, 2 people, 2 nights, mid, round trip = ৳25,200", async ({
    page,
  }) => {
    await page.goto("/en/trip-cost");
    await hydrated(page);
    const form = page.getByRole("form", { name: "Trip details" });
    await form.getByLabel("From").selectOption({ label: "Dhaka" });
    await form.getByLabel("To").selectOption({ label: "Cox's Bazar" });

    // The defaults are the acceptance case; nudge the stepper to check it is live.
    const travellers = form.getByRole("group", { name: "Travellers" });
    await expect(travellers.locator("output")).toHaveText("2");
    await form.getByRole("button", { name: "Increase: Travellers" }).click();
    await expect(travellers.locator("output")).toHaveText("3");
    await form.getByRole("button", { name: "Decrease: Travellers" }).click();
    await expect(form.getByRole("group", { name: "Nights" }).locator("output")).toHaveText("2");
    await expect(form.getByRole("radio", { name: /Moderate/ })).toBeChecked();
    await expect(form.getByRole("switch", { name: "Round trip" })).toHaveAttribute(
      "aria-checked",
      "true",
    );

    const result = page.locator("section[aria-labelledby='cost-result']");
    await expect(result).toContainText("৳25,200");
    await expect(result).toContainText("৳12,600");
    await expect(page).toHaveURL(/people=2&nights=2&level=mid&ret=1/);

    // One way costs less.
    await form.getByRole("switch", { name: "Round trip" }).click();
    await expect(result).not.toContainText("৳25,200");

    // "Add to trip plan" opens the planner with this trip filled in.
    await page.getByRole("link", { name: "Add to trip plan" }).click();
    await expect(page).toHaveURL(/\/en\/plan\?from=1&to=19&/);
    await expect(page.locator("section[aria-labelledby='plan-summary']")).toContainText(
      "Total distance840 km",
    );
  });
});
