// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import geo from "@assets/maps/bangladesh.json";
import { describe, expect, it } from "vitest";
import { getMyBangladeshLevels } from "@/server/data";
import { DISTRICT_SLUGS, districtIdOf, districtSlugOf, TOTAL_DISTRICTS } from "./districts";
import { LEVEL_BADGES } from "./levels";

const dataDistricts = JSON.parse(
  readFileSync(resolve(process.cwd(), "../data/districts.json"), "utf8"),
) as { id: number; slug: string }[];

describe("district id table", () => {
  it("matches data/districts.json and the map", () => {
    expect(TOTAL_DISTRICTS).toBe(64);
    for (const d of dataDistricts) {
      expect(districtSlugOf(d.id)).toBe(d.slug);
      expect(districtIdOf(d.slug)).toBe(d.id);
    }
    for (const d of geo.districts) expect(DISTRICT_SLUGS[d.id - 1]).toBe(d.slug);
  });
});

describe("levels from reference.json", () => {
  it("reads the five levels with their badges, in both languages", async () => {
    const en = await getMyBangladeshLevels("en");
    expect(en.map((l) => l.min)).toEqual([10, 25, 40, 50, 64]);
    expect(en[0]!.title).toBe("Bangladesh Explorer");
    expect(en.map((l) => l.badge)).toEqual([...LEVEL_BADGES]);
    const bn = await getMyBangladeshLevels("bn");
    expect(bn[4]!.title).toBe("বাংলাদেশ লিজেন্ড");
  });

  it("has a badge file for every level", () => {
    for (const badge of LEVEL_BADGES) {
      expect(() => readFileSync(resolve(process.cwd(), `../assets${badge}`))).not.toThrow();
    }
  });
});
