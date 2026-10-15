import { describe, expect, it } from "vitest";
import { formatMonthRange } from "./format";
import { MONTHS, parseMonth } from "./months";
import { inSeason, isYearRound, seasonLength, seasonMonths } from "./season";

const all = (from: number, to: number) =>
  MONTHS.filter((m) => inSeason(from, to, m.month)).map((m) => m.month);

describe("inSeason", () => {
  it("handles a season inside one year", () => {
    expect(all(6, 9)).toEqual([6, 7, 8, 9]);
    expect(inSeason(6, 9, 5)).toBe(false);
    expect(inSeason(6, 9, 10)).toBe(false);
  });

  it("includes both ends", () => {
    expect(inSeason(11, 3, 11)).toBe(true);
    expect(inSeason(11, 3, 3)).toBe(true);
    expect(inSeason(6, 9, 6)).toBe(true);
    expect(inSeason(6, 9, 9)).toBe(true);
  });

  it("wraps across the new year (11 → 3)", () => {
    expect(all(11, 3)).toEqual([1, 2, 3, 11, 12]);
    expect(inSeason(11, 3, 4)).toBe(false);
    expect(inSeason(11, 3, 10)).toBe(false);
  });

  it("wraps for long seasons (7 → 2) and short ones (12 → 1)", () => {
    expect(all(7, 2)).toEqual([1, 2, 7, 8, 9, 10, 11, 12]);
    expect(all(12, 1)).toEqual([1, 12]);
  });

  it("treats a single-month season as just that month", () => {
    expect(all(5, 5)).toEqual([5]);
    expect(all(12, 12)).toEqual([12]);
  });

  it("covers the whole year for 1 → 12 and for a season ending just before it starts", () => {
    expect(all(1, 12)).toHaveLength(12);
    expect(all(4, 3)).toHaveLength(12);
  });

  it("rejects months outside 1–12", () => {
    expect(() => inSeason(0, 3, 1)).toThrow(RangeError);
    expect(() => inSeason(11, 13, 1)).toThrow(RangeError);
    expect(() => inSeason(11, 3, 0)).toThrow(RangeError);
    expect(() => inSeason(11, 3, 2.5)).toThrow(RangeError);
  });
});

describe("season helpers", () => {
  it("lists season months in order from the start", () => {
    expect(seasonMonths(11, 2)).toEqual([11, 12, 1, 2]);
    expect(seasonMonths(3, 3)).toEqual([3]);
    expect(seasonLength(10, 3)).toBe(6);
    expect(seasonLength(1, 12)).toBe(12);
    expect(isYearRound(1, 12)).toBe(true);
    expect(isYearRound(11, 3)).toBe(false);
  });

  it("labels seasons in both languages", () => {
    expect(formatMonthRange(11, 3, "en")).toBe("Nov – Mar");
    expect(formatMonthRange(11, 3, "bn")).toBe("নভেম্বর – মার্চ");
    expect(formatMonthRange(10, 2, "bn")).toBe("অক্টোবর – ফেব্রুয়ারি");
  });

  it("parses month numbers and slugs", () => {
    expect(parseMonth(11)).toBe(11);
    expect(parseMonth("11")).toBe(11);
    expect(parseMonth("November")).toBe(11);
    expect(parseMonth("nov")).toBe(11);
    expect(parseMonth("13")).toBeNull();
    expect(parseMonth("0")).toBeNull();
    expect(parseMonth("smarch")).toBeNull();
    expect(parseMonth(undefined)).toBeNull();
  });
});
