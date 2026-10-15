import { describe, expect, it } from "vitest";
import { ellipsize, fitFontSize, graphemes, wrapLines } from "./text";

/** 10 px per user-perceived character. */
const measure = (s: string) => graphemes(s).length * 10;

describe("wrapLines", () => {
  it("breaks at spaces and keeps every line within the width", () => {
    const lines = wrapLines("Tea gardens and the longest beach in the world", 120, 5, measure);
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) expect(measure(line)).toBeLessThanOrEqual(120);
    expect(lines.join(" ")).toBe("Tea gardens and the longest beach in the world");
  });

  it("stops at the line limit and ends with an ellipsis", () => {
    const lines = wrapLines("one two three four five six seven eight", 90, 2, measure);
    expect(lines).toHaveLength(2);
    expect(lines[1]!.endsWith("…")).toBe(true);
    expect(measure(lines[1]!)).toBeLessThanOrEqual(90);
  });

  it("cuts a word longer than a line", () => {
    const lines = wrapLines("Chapainawabganj", 60, 3, measure);
    for (const line of lines) expect(measure(line)).toBeLessThanOrEqual(60);
    expect(lines.join("").replace("…", "").length).toBeGreaterThan(6);
  });

  it("never splits a Bengali conjunct", () => {
    const text = "লক্ষ্মীপুর কক্সবাজার";
    const lines = wrapLines(text, 40, 4, measure);
    const clusters = new Set(graphemes(text));
    for (const line of lines) {
      for (const g of graphemes(line.replace("…", ""))) expect(clusters.has(g)).toBe(true);
    }
  });

  it("returns nothing for blank text or no lines", () => {
    expect(wrapLines("   ", 100, 2, measure)).toEqual([]);
    expect(wrapLines("Dhaka", 100, 0, measure)).toEqual([]);
  });
});

describe("ellipsize and fitFontSize", () => {
  it("keeps text that fits and cuts text that does not", () => {
    expect(ellipsize("Sylhet", 100, measure)).toBe("Sylhet");
    const cut = ellipsize("Bangladesh Traveller", 100, measure);
    expect(cut.endsWith("…")).toBe(true);
    expect(measure(cut)).toBeLessThanOrEqual(100);
  });

  it("shrinks the font until the text fits, never below the minimum", () => {
    const at = (t: string, size: number) => t.length * size * 0.5;
    expect(fitFontSize("My Bangladesh", 1000, 60, 30, at)).toBe(60);
    const s = fitFontSize("My Bangladesh", 300, 60, 30, at);
    expect(at("My Bangladesh", s)).toBeLessThanOrEqual(300);
    expect(fitFontSize("My Bangladesh", 10, 60, 30, at)).toBe(30);
  });
});
