import { describe, expect, it } from "vitest";
import {
  bengaliDayPart,
  formatDate,
  formatDistance,
  formatDuration,
  formatHoursRange,
  formatMinutes,
  formatMoney,
  formatMoneyRange,
  formatMonthRange,
  formatNumber,
  formatPercent,
  formatRange,
  formatStars,
  formatTime,
  formatTimeRange,
  localizeDigits,
  monthName,
  parseTime,
  starScore,
  toBengaliDigits,
  weekdayName,
} from "./format";

describe("numerals and numbers", () => {
  it("converts digits to Bengali", () => {
    expect(toBengaliDigits("0123456789")).toBe("০১২৩৪৫৬৭৮৯");
    expect(toBengaliDigits(2026)).toBe("২০২৬");
    expect(localizeDigits("7:05", "bn")).toBe("৭:০৫");
    expect(localizeDigits("7:05", "en")).toBe("7:05");
  });

  it("groups thousands (3-digit in English, South Asian in Bengali)", () => {
    expect(formatNumber(22200, "en")).toBe("22,200");
    expect(formatNumber(22200, "bn")).toBe("২২,২০০");
    expect(formatNumber(1930, "bn")).toBe("১,৯৩০");
    expect(formatNumber(100000, "en")).toBe("100,000");
    expect(formatNumber(100000, "bn")).toBe("১,০০,০০০");
    expect(formatNumber(12345678, "bn")).toBe("১,২৩,৪৫,৬৭৮");
    expect(formatNumber(999, "en")).toBe("999");
    expect(formatNumber(0, "bn")).toBe("০");
  });

  it("keeps up to one decimal by default and drops trailing zeros", () => {
    expect(formatNumber(10.5, "en")).toBe("10.5");
    expect(formatNumber(10.5, "bn")).toBe("১০.৫");
    expect(formatNumber(312.14, "en")).toBe("312.1");
    expect(formatNumber(4.0, "en")).toBe("4");
    expect(formatNumber(1234.567, "en", { maxDecimals: 2 })).toBe("1,234.57");
    expect(formatNumber(-1500, "en")).toBe("-1,500");
    expect(formatNumber(Number.NaN, "en")).toBe("");
  });

  it("treats interface-only locales as English", () => {
    expect(formatNumber(22200, "ja")).toBe("22,200");
    expect(formatMoney(22200, "fr")).toBe("৳22,200");
  });

  it("formats percentages", () => {
    expect(formatPercent(42, "en")).toBe("42%");
    expect(formatPercent(42, "bn")).toBe("৪২%");
  });
});

describe("money and ranges", () => {
  it("prefixes ৳ and rounds to whole taka", () => {
    expect(formatMoney(22200, "en")).toBe("৳22,200");
    expect(formatMoney(22200, "bn")).toBe("৳২২,২০০");
    expect(formatMoney(1930, "bn")).toBe("৳১,৯৩০");
    expect(formatMoney(776.4, "en")).toBe("৳776");
    expect(formatMoney(0, "bn")).toBe("৳০");
    expect(formatMoney(-500, "en")).toBe("-৳500");
  });

  it("writes ranges with an en dash and a single currency sign", () => {
    expect(formatMoneyRange(980, 1050, "en")).toBe("৳980–1,050");
    expect(formatMoneyRange(980, 1050, "bn")).toBe("৳৯৮০–১,০৫০");
    expect(formatMoneyRange(350, 350, "en")).toBe("৳350");
    expect(formatMoneyRange(null, 600, "en")).toBe("৳600");
    expect(formatMoneyRange(null, null, "en")).toBe("");
    expect(formatRange(7.5, 10, "en")).toBe("7.5–10");
    expect(formatRange(7.5, 10, "bn")).toBe("৭.৫–১০");
  });
});

describe("time", () => {
  it("parses 24-hour strings and minutes since midnight", () => {
    expect(parseTime("07:00")).toEqual({ hour: 7, minute: 0 });
    expect(parseTime("23:59")).toEqual({ hour: 23, minute: 59 });
    expect(parseTime(21 * 60 + 10)).toEqual({ hour: 21, minute: 10 });
    expect(parseTime("7 am")).toBeNull();
    expect(parseTime("25:00")).toBeNull();
  });

  it("formats English 12-hour times", () => {
    expect(formatTime("07:00", "en")).toBe("7:00 am");
    expect(formatTime("11:55", "en")).toBe("11:55 am");
    expect(formatTime("12:00", "en")).toBe("12:00 pm");
    expect(formatTime("00:30", "en")).toBe("12:30 am");
    expect(formatTime("21:10", "en")).toBe("9:10 pm");
  });

  it("formats Bengali times with the time-of-day word", () => {
    expect(formatTime("04:30", "bn")).toBe("ভোর ৪:৩০");
    expect(formatTime("07:00", "bn")).toBe("সকাল ৭:০০");
    expect(formatTime("12:15", "bn")).toBe("দুপুর ১২:১৫");
    expect(formatTime("15:40", "bn")).toBe("বিকাল ৩:৪০");
    expect(formatTime("18:30", "bn")).toBe("সন্ধ্যা ৬:৩০");
    expect(formatTime("21:10", "bn")).toBe("রাত ৯:১০");
    expect(formatTime("00:05", "bn")).toBe("রাত ১২:০৫");
  });

  it("covers every hour with the right Bengali word", () => {
    const words = Array.from({ length: 24 }, (_, h) => bengaliDayPart(h));
    expect(words.slice(0, 4)).toEqual(Array(4).fill("রাত"));
    expect(words.slice(4, 6)).toEqual(Array(2).fill("ভোর"));
    expect(words.slice(6, 12)).toEqual(Array(6).fill("সকাল"));
    expect(words.slice(12, 15)).toEqual(Array(3).fill("দুপুর"));
    expect(words.slice(15, 18)).toEqual(Array(3).fill("বিকাল"));
    expect(words.slice(18, 20)).toEqual(Array(2).fill("সন্ধ্যা"));
    expect(words.slice(20)).toEqual(Array(4).fill("রাত"));
  });

  it("formats departure–arrival pairs and tolerates gaps", () => {
    expect(formatTimeRange("07:00", "11:55", "en")).toBe("7:00 am – 11:55 am");
    expect(formatTimeRange("07:00", "11:55", "bn")).toBe("সকাল ৭:০০ – সকাল ১১:৫৫");
    expect(formatTimeRange(null, "11:55", "en")).toBe("11:55 am");
    expect(formatTime(null, "bn")).toBe("");
    expect(formatTime("20:15-21:15", "en")).toBe("20:15-21:15");
  });
});

describe("months and dates", () => {
  it("names months", () => {
    expect(monthName(11, "en")).toBe("November");
    expect(monthName(11, "en", { short: true })).toBe("Nov");
    expect(monthName(11, "bn")).toBe("নভেম্বর");
    expect(() => monthName(13, "en")).toThrow(RangeError);
  });

  it("formats seasons, wrapping across the year", () => {
    expect(formatMonthRange(11, 3, "en")).toBe("Nov – Mar");
    expect(formatMonthRange(11, 3, "bn")).toBe("নভেম্বর – মার্চ");
    expect(formatMonthRange(7, 2, "en", { short: false })).toBe("July – February");
    expect(formatMonthRange(6, 9, "en")).toBe("Jun – Sep");
    expect(formatMonthRange(12, 1, "en")).toBe("Dec – Jan");
    expect(formatMonthRange(5, 5, "bn")).toBe("মে");
    expect(formatMonthRange(1, 12, "en")).toBe("All year");
    expect(formatMonthRange(1, 12, "bn")).toBe("সারা বছর");
    expect(formatMonthRange(4, 3, "en")).toBe("All year");
  });

  it("formats dates", () => {
    expect(formatDate("2026-10-14", "bn")).toBe("১৪ অক্টোবর, ২০২৬");
    expect(formatDate("2026-10-14", "en")).toBe("14 October 2026");
    expect(formatDate("2026-10-08", "en")).toBe("8 October 2026");
    expect(formatDate(null, "en")).toBe("");
    expect(formatDate("soon", "en")).toBe("soon");
  });

  it("reads Date objects in Bangladesh time", () => {
    // 20:00 UTC on 13 Oct is 02:00 on 14 Oct in Dhaka.
    expect(formatDate(new Date("2026-10-13T20:00:00Z"), "en")).toBe("14 October 2026");
    expect(formatDate(new Date("2026-10-14T10:00:00Z"), "bn")).toBe("১৪ অক্টোবর, ২০২৬");
  });

  it("names weekdays (0 = Sunday)", () => {
    expect(weekdayName(0, "en")).toBe("Sunday");
    expect(weekdayName(5, "bn")).toBe("শুক্রবার");
    expect(() => weekdayName(7, "en")).toThrow(RangeError);
  });
});

describe("durations", () => {
  it("formats hours in English", () => {
    expect(formatDuration(10.5, "en")).toBe("10.5 hours");
    expect(formatDuration(1, "en")).toBe("1 hour");
    expect(formatDuration(4, "en")).toBe("4 hours");
    expect(formatDuration(0.5, "en")).toBe("0.5 hours");
    expect(formatDuration(4.25, "en")).toBe("4 h 15 min");
  });

  it("formats hours in spoken Bengali", () => {
    expect(formatDuration(10.5, "bn")).toBe("সাড়ে ১০ ঘণ্টা");
    expect(formatDuration(4, "bn")).toBe("৪ ঘণ্টা");
    expect(formatDuration(0.5, "bn")).toBe("আধা ঘণ্টা");
    expect(formatDuration(1.5, "bn")).toBe("দেড় ঘণ্টা");
    expect(formatDuration(2.5, "bn")).toBe("আড়াই ঘণ্টা");
    expect(formatDuration(3.5, "bn")).toBe("সাড়ে ৩ ঘণ্টা");
    expect(formatDuration(4.25, "bn")).toBe("৪ ঘণ্টা ১৫ মিনিট");
  });

  it("formats hour ranges", () => {
    expect(formatHoursRange(7.5, 10, "en")).toBe("7.5–10 hours");
    expect(formatHoursRange(7.5, 10, "bn")).toBe("সাড়ে ৭–১০ ঘণ্টা");
    expect(formatHoursRange(1.5, 2, "bn")).toBe("দেড়–২ ঘণ্টা");
    expect(formatHoursRange(3, 3, "en")).toBe("3 hours");
  });

  it("formats minutes", () => {
    expect(formatMinutes(295, "en")).toBe("4 h 55 min");
    expect(formatMinutes(295, "bn")).toBe("৪ ঘণ্টা ৫৫ মিনিট");
    expect(formatMinutes(120, "en")).toBe("2 h");
    expect(formatMinutes(45, "bn")).toBe("৪৫ মিনিট");
    expect(formatMinutes(0, "en")).toBe("0 min");
  });
});

describe("distances and scores", () => {
  it("formats kilometres", () => {
    expect(formatDistance(312.1, "en")).toBe("312 km");
    expect(formatDistance(312.1, "bn")).toBe("৩১২ কিমি");
    expect(formatDistance(6.24, "en")).toBe("6.2 km");
    expect(formatDistance(1234, "bn")).toBe("১,২৩৪ কিমি");
    expect(formatDistance(840, "en")).toBe("840 km");
  });

  it("shows the editorial score out of 10", () => {
    expect(starScore(722)).toBe(7);
    expect(starScore(1000)).toBe(10);
    expect(starScore(1200)).toBe(10);
    expect(starScore(99)).toBe(0);
    expect(formatStars(722, "en")).toBe("★ 7/10");
    expect(formatStars(954, "bn")).toBe("★ ৯/১০");
  });
});
