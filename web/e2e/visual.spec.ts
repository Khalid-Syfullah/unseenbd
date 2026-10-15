import { expect, test, type Page } from "@playwright/test";

/*
 * Visual snapshots for the key screens at 360 and 1280 px (the two projects in
 * playwright.config.ts). Bengali is the default locale; English is covered for home and explore.
 * Sections that depend on today's date (this month's places, the trending season) are hidden before the shot so baselines do not drift.
 */

const HIDE = `
  [data-visual-hide], #months, #trending, #unseen, video { visibility: hidden !important; }
  *, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }
`;

/** Tall enough to show the first screens of every page without ballooning the image files. */
const SHOT_HEIGHT = 1800;

async function settle(page: Page) {
  const { width } = page.viewportSize()!;
  await page.setViewportSize({ width, height: SHOT_HEIGHT });
  await page.addStyleTag({ content: HIDE });
  await page.evaluate(() => document.fonts.ready);
  // Lazy images: scroll through the page once so they load, then return to the top.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 40));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForLoadState("networkidle");
}

const PAGES: { name: string; path: string; before?: (page: Page) => Promise<void> }[] = [
  { name: "home", path: "/" },
  { name: "explore", path: "/explore" },
  { name: "place", path: "/place/nilgiri-hill" },
  {
    name: "planner-sample",
    path: "/en/plan",
    before: async (page) => {
      await page
        .getByRole("button", { name: /Sample: Dhaka/ })
        .first()
        .click();
      await page.getByRole("heading", { level: 2 }).first().waitFor();
    },
  },
  { name: "my-bangladesh", path: "/my-bangladesh" },
  { name: "play", path: "/play" },
  { name: "gallery", path: "/gallery" },
  { name: "home-en", path: "/en" },
  { name: "explore-en", path: "/en/explore" },
];

for (const { name, path, before } of PAGES) {
  test(`snapshot: ${name}`, async ({ page }) => {
    await page.goto(path);
    if (before) await before(page);
    await settle(page);
    await expect(page).toHaveScreenshot(`${name}.png`);
  });
}

test("dark theme: home", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await settle(page);
  await expect(page).toHaveScreenshot("home-dark.png");
});
