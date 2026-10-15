import { describe, expect, it } from "vitest";
import { fixManifest, MANIFEST_ICON_BASE } from "./sync-assets.mjs";

describe("sync-assets", () => {
  it("points manifest icons at the synced brand folder", () => {
    const out = fixManifest({
      name: "Unseen BD",
      icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
    });
    expect(MANIFEST_ICON_BASE).toBe("/brand/");
    expect(out.icons[0]).toEqual({ src: "/brand/icon-192.png", sizes: "192x192" });
    expect(out.name).toBe("Unseen BD");
  });
});
