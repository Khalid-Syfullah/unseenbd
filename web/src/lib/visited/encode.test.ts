import { describe, expect, it } from "vitest";
import {
  challengePath,
  cleanName,
  decodeCountries,
  decodeDistrictIds,
  encodeCountries,
  encodeDistrictIds,
  myBangladeshSharePath,
  parseDistrictShare,
  parseWorldShare,
  worldSharePath,
} from "./encode";
import { levelIndex, nextLevel } from "./levels";

const ALL = Array.from({ length: 64 }, (_, i) => i + 1);

describe("district id encoding", () => {
  it("round-trips any set of districts", () => {
    for (const ids of [[1], [64], [1, 19, 28], ALL, [8, 9, 16, 17, 32, 33, 63]]) {
      expect(decodeDistrictIds(encodeDistrictIds(ids))).toEqual(ids);
    }
  });

  it("is compact: all 64 districts fit in 11 characters", () => {
    expect(encodeDistrictIds(ALL)).toBe("__________8");
    expect(encodeDistrictIds([1])).toBe("AQ");
    expect(encodeDistrictIds([])).toBe("");
  });

  it("drops duplicates and unknown ids when encoding", () => {
    expect(decodeDistrictIds(encodeDistrictIds([3, 3, 0, 65, 1.5]))).toEqual([3]);
  });

  it("decodes anything malformed to nothing", () => {
    for (const bad of [null, undefined, "", "!!", "A", "AAAAAAAAAAAAAAAA", "a b"]) {
      expect(decodeDistrictIds(bad)).toEqual([]);
    }
  });
});

describe("country encoding", () => {
  it("joins sorted ISO2 codes and splits them again", () => {
    expect(encodeCountries(["NP", "BD", "IN", "BD", "n-cyprus"])).toBe("BDINNP");
    expect(decodeCountries("BDINNP")).toEqual(["BD", "IN", "NP"]);
    expect(decodeCountries("bdin")).toEqual(["BD", "IN"]);
    expect(decodeCountries("BDX")).toEqual([]);
    expect(decodeCountries("BDZZ", new Set(["BD"]))).toEqual(["BD"]);
  });
});

describe("names", () => {
  it("cleans the display name", () => {
    expect(cleanName("  Rahim   Uddin ")).toBe("Rahim Uddin");
    expect(cleanName("<b>Rahim</b>")).toBe("bRahim/b");
    expect(cleanName("a\u0000b\nc")).toBe("ab c");
    expect(cleanName("রহিম")).toBe("রহিম");
    expect([...cleanName("x".repeat(80))]).toHaveLength(40);
    expect(cleanName(42)).toBe("");
  });
});

describe("share links", () => {
  it("builds and parses the My Bangladesh link", () => {
    const path = myBangladeshSharePath("en", [1, 19, 28], "Rahim");
    expect(path).toBe(`/en/my-bangladesh?v=${encodeDistrictIds([1, 19, 28])}&n=Rahim`);
    const query = new URLSearchParams(path.split("?")[1]);
    expect(parseDistrictShare(query)).toEqual({ ids: [1, 19, 28], name: "Rahim" });
    expect(myBangladeshSharePath("bn", [1])).toBe("/my-bangladesh?v=AQ");
    expect(parseDistrictShare({})).toBeNull();
  });

  it("builds the challenge link", () => {
    const path = challengePath("bn", [2, 3], "রহিম");
    const query = new URLSearchParams(path.split("?")[1]);
    expect(path.startsWith("/challenge?c=")).toBe(true);
    expect(parseDistrictShare(query, "c")).toEqual({ ids: [2, 3], name: "রহিম" });
  });

  it("builds and parses the world link", () => {
    const path = worldSharePath("en", { BD: "visited", NP: "wish", IN: "visited" }, "Mitu");
    expect(path).toBe("/en/world?v=BDIN&w=NP&n=Mitu");
    const query = new URLSearchParams(path.split("?")[1]);
    expect(parseWorldShare(query)).toEqual({ visited: ["BD", "IN"], wish: ["NP"], name: "Mitu" });
    expect(parseWorldShare({ v: "BD", w: "BD" })).toEqual({ visited: ["BD"], wish: [], name: "" });
    expect(parseWorldShare({})).toBeNull();
  });
});

describe("levels", () => {
  const levels = [10, 25, 40, 50, 64].map((min) => ({ min }));

  it("finds the level reached and the next one", () => {
    expect(levelIndex(0, levels)).toBe(-1);
    expect(levelIndex(9, levels)).toBe(-1);
    expect(levelIndex(10, levels)).toBe(0);
    expect(levelIndex(49, levels)).toBe(2);
    expect(levelIndex(64, levels)).toBe(4);
    expect(nextLevel(13, levels)).toEqual({ min: 25 });
    expect(nextLevel(64, levels)).toBeNull();
  });
});
