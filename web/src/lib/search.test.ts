import { describe, expect, it } from "vitest";
import { fold, prepareQuery, scoreAny, scoreText, skeleton } from "./search";

describe("fold", () => {
  it("ignores case, accents and punctuation", () => {
    expect(fold("  Cox’s  Bazar ")).toBe("coxs bazar");
    expect(fold("Café ÉCLAIR")).toBe("cafe eclair");
  });
  it("keeps Bengali text", () => {
    expect(fold("সাজেক ভ্যালি")).toBe("সাজেক ভ্যালি");
  });
});

describe("skeleton", () => {
  it.each([
    ["sajek", "সাজেক"],
    ["Cox's Bazar", "কক্সবাজার"],
    ["Bandarban", "বান্দরবান"],
    ["Rangamati", "রাঙামাটি"],
    ["Khagrachhari", "খাগড়াছড়ি"],
    ["Sylhet", "সিলেট"],
    ["Lakshmipur", "লক্ষ্মীপুর"],
    ["Dhaka", "ঢাকা"],
  ])("gives %s and %s the same skeleton", (latin, bengali) => {
    expect(skeleton(latin)).toBe(skeleton(bengali));
  });
  it("is empty for text without letters", () => {
    expect(skeleton("123 !?")).toBe("");
  });
});

describe("scoreText", () => {
  it("ranks exact above prefix above contains above transliteration", () => {
    const q = prepareQuery("sajek");
    expect(scoreText(q, "Sajek")).toBe(4);
    expect(scoreText(q, "Sajek Valley")).toBe(3);
    expect(scoreText(q, "Upper Sajek")).toBe(3);
    expect(scoreText(q, "Besajeko")).toBe(2);
    expect(scoreText(q, "সাজেক ভ্যালি")).toBe(1);
    expect(scoreText(q, "Nilgiri")).toBe(0);
  });
  it("finds Latin names from a Bengali query", () => {
    expect(scoreText(prepareQuery("সাজেক"), "Sajek Valley")).toBe(1);
    expect(scoreText(prepareQuery("সাজেক"), "সাজেক ভ্যালি")).toBe(3);
  });
  it("does not match inside names for two-letter skeletons", () => {
    expect(scoreText(prepareQuery("dhaka"), "Dhaka")).toBe(4);
    expect(scoreText(prepareQuery("ঢাকা"), "Dhaka")).toBe(1);
    expect(scoreText(prepareQuery("ঢাকা"), "Sandakphu")).toBe(0);
  });
  it("is empty for an empty query", () => {
    expect(scoreText(prepareQuery("  "), "Sajek")).toBe(0);
  });
  it("can skip transliteration", () => {
    expect(scoreText(prepareQuery("sajek"), "সাজেক", false)).toBe(0);
  });
});

describe("scoreAny", () => {
  it("takes the best score and ignores empty texts", () => {
    const q = prepareQuery("sajek");
    expect(scoreAny(q, [null, "", "সাজেক", "Sajek"])).toBe(4);
    expect(scoreAny(q, [undefined])).toBe(0);
  });
});
