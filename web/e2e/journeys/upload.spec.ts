import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { E2E_ADMIN } from "../constants";
import { hydrated, signIn } from "../support";

const FIXTURE = join(process.cwd(), "e2e/fixtures/photo-with-gps.jpg");
const MEDIA_DIR = join(process.cwd(), ".e2e/media");
/** Strings that only exist in the fixture's EXIF block (camera make, description). */
const EXIF_MARKERS = ["E2E-CAMERA-MAKE", "E2E-CAMERA-MODEL", "E2E-SECRET-CAPTION"];

function filesUnder(dir: string): string[] {
  let out: string[] = [];
  let names: string[] = [];
  try {
    names = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of names) {
    const path = join(dir, name);
    out = statSync(path).isDirectory() ? out.concat(filesUnder(path)) : out.concat(path);
  }
  return out;
}

test.describe("Photo upload", () => {
  test("EXIF and GPS never leave the browser; the photo is public only after approval", async ({
    page,
    browser,
  }) => {
    // The fixture really carries EXIF + GPS.
    const original = readFileSync(FIXTURE);
    expect(original.includes(Buffer.from("Exif\0\0"))).toBe(true);
    for (const marker of EXIF_MARKERS) expect(original.includes(Buffer.from(marker))).toBe(true);

    // Keep a copy of every file the page uploads, to inspect what left the browser.
    await page.addInitScript(() => {
      const w = window as unknown as { __sent: string[] };
      w.__sent = [];
      const original = window.fetch;
      window.fetch = async (input, init) => {
        if (init?.body instanceof FormData) {
          for (const value of init.body.values()) {
            if (value instanceof Blob) {
              const bytes = new Uint8Array(await value.arrayBuffer());
              let text = "";
              for (const b of bytes) text += String.fromCharCode(b);
              w.__sent.push(btoa(text));
            }
          }
        }
        return original(input, init);
      };
    });
    await page.goto("/en/upload");
    await hydrated(page);
    await expect(page.getByText(/You can send 2 more uploads today\./)).toBeVisible();

    await page.locator('input[type="file"]').setInputFiles(FIXTURE);
    await expect(page.getByText(/^Ready · [\d,]+ × [\d,]+ px/)).toBeVisible();
    await page.getByLabel("Your name").fill("E2E Traveller");
    await page.getByLabel("District").selectOption("sylhet");
    const caption = `Tea garden morning ${Date.now()}`;
    await page.getByLabel(/Area or caption/).fill(caption);
    await page.getByLabel(/I took these photos/).check();

    await page.getByRole("button", { name: "Send 1 photo for review" }).click();
    await expect(page.getByRole("heading", { name: "Thank you!" })).toBeVisible();

    // Every file the browser sent (captured by the fetch wrapper below): re-encoded, no EXIF.
    const sent = await page.evaluate(() => (window as unknown as { __sent: string[] }).__sent);
    expect(sent.length).toBeGreaterThanOrEqual(2); // the photo and its thumbnail
    for (const base64 of sent) {
      const bytes = Buffer.from(base64, "base64");
      expect(bytes.length).toBeGreaterThan(500);
      expect(bytes.includes(Buffer.from("Exif"))).toBe(false);
      for (const marker of EXIF_MARKERS) expect(bytes.includes(Buffer.from(marker))).toBe(false);
    }
    await expect(page.getByText(/You can send 1 more upload today\./)).toBeVisible();

    // Stored files carry no metadata either.
    const stored = filesUnder(MEDIA_DIR);
    expect(stored.length).toBeGreaterThanOrEqual(2); // the photo and its thumbnail
    for (const file of stored) {
      const bytes = readFileSync(file);
      expect(bytes.includes(Buffer.from("Exif"))).toBe(false);
      for (const marker of EXIF_MARKERS) expect(bytes.includes(Buffer.from(marker))).toBe(false);
    }

    // Pending: not in the public gallery or API.
    const pending = await page.request.get(`/api/photos?q=${encodeURIComponent(caption)}`);
    expect(pending.ok()).toBe(true);
    expect(JSON.stringify(await pending.json())).not.toContain(caption);

    // A moderator approves it.
    const adminContext = await browser.newContext();
    const admin = await adminContext.newPage();
    await signIn(admin, E2E_ADMIN.email, E2E_ADMIN.password);
    await admin.goto("/en/admin");
    await hydrated(admin);
    const item = admin.getByRole("listitem").filter({ hasText: caption });
    await expect(item).toBeVisible();
    await item.getByRole("button", { name: "Approve" }).click();
    await expect(admin.getByRole("listitem").filter({ hasText: caption })).toHaveCount(0);

    // Now it is public.
    const approved = await page.request.get(`/api/photos?q=${encodeURIComponent(caption)}`);
    expect(JSON.stringify(await approved.json())).toContain(caption);
    await page.goto(`/en/gallery?q=${encodeURIComponent(caption)}`);
    await expect(page.getByText("1 photo")).toBeVisible();

    // Clean up, so later tests (the gallery snapshot) see the seeded state: delete it again.
    const { items } = (await approved.json()) as { items: { id: number }[] };
    const me = (await (await admin.request.get("/api/me")).json()) as { csrfToken: string };
    const removed = await admin.request.post("/api/admin/photos", {
      data: { ids: items.map((p) => p.id), action: "delete" },
      headers: { "X-CSRF-Token": me.csrfToken },
    });
    expect(removed.ok()).toBe(true);
    expect(filesUnder(MEDIA_DIR)).toHaveLength(0);
    await adminContext.close();
  });
});
