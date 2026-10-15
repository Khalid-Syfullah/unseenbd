/**
 * Locale-aware formatting (DESIGN.md §6). Bengali output uses Bengali numerals everywhere and
 * the South Asian grouping (১,০০,০০০); every other locale gets Western numerals and the
 * 3-digit grouping (100,000) with English words, because content is only bn or en.
 *
 * All functions are pure and deterministic (no Intl), so server and client render the same text.
 */
import { monthInfo } from "./months";
import { isYearRound } from "./season";

/** `"bn"` or anything else (treated as English). Accepts any locale code. */
export type FormatLang = string;

const isBn = (lang: FormatLang) => lang === "bn";

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";

/** Swap Western digits for Bengali ones: `"7:05"` → `"৭:০৫"`. */
export function toBengaliDigits(value: string | number): string {
  return String(value).replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]!);
}

/** Bengali digits for `bn`, unchanged otherwise. */
export function localizeDigits(value: string | number, lang: FormatLang): string {
  return isBn(lang) ? toBengaliDigits(value) : String(value);
}

function groupInteger(int: string, lang: FormatLang): string {
  if (int.length <= 3) return int;
  if (!isBn(lang)) return int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  // South Asian grouping: last three digits, then pairs (12,34,567).
  const last3 = int.slice(-3);
  const rest = int.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${rest},${last3}`;
}

export type NumberOptions = {
  /** Most decimals to show (trailing zeros are dropped). Default 1. */
  maxDecimals?: number;
};

/** `22200` → `22,200` / `২২,২০০`; `10.5` → `10.5` / `১০.৫`. */
export function formatNumber(value: number, lang: FormatLang, options: NumberOptions = {}): string {
  if (!Number.isFinite(value)) return "";
  const maxDecimals = options.maxDecimals ?? 1;
  const factor = 10 ** maxDecimals;
  const rounded = Math.round(Math.abs(value) * factor) / factor;
  const [int = "0", frac] = rounded.toFixed(maxDecimals).split(".");
  const fracTrimmed = frac?.replace(/0+$/, "") ?? "";
  const sign = value < 0 && rounded !== 0 ? "-" : "";
  const text = `${sign}${groupInteger(int, lang)}${fracTrimmed ? `.${fracTrimmed}` : ""}`;
  return localizeDigits(text, lang);
}

export const TAKA = "৳";
const EN_DASH = "–";

/** Whole taka with the `৳` prefix: `৳22,200` / `৳২২,২০০`. */
export function formatMoney(value: number, lang: FormatLang): string {
  const n = Math.round(value);
  return n < 0
    ? `-${TAKA}${formatNumber(-n, lang, { maxDecimals: 0 })}`
    : `${TAKA}${formatNumber(n, lang, { maxDecimals: 0 })}`;
}

/**
 * A range with an en dash and no spaces: `980–1,050` / `৯৮০–১,০৫০`. With `money`, one `৳` prefix
 * (`৳980–1,050`). Equal ends collapse to one value; a missing end shows the other alone.
 */
export function formatRange(
  min: number | null | undefined,
  max: number | null | undefined,
  lang: FormatLang,
  options: { money?: boolean; maxDecimals?: number } = {},
): string {
  const num = (v: number) =>
    formatNumber(options.money ? Math.round(v) : v, lang, {
      maxDecimals: options.money ? 0 : options.maxDecimals,
    });
  const prefix = options.money ? TAKA : "";
  const hasMin = typeof min === "number" && Number.isFinite(min);
  const hasMax = typeof max === "number" && Number.isFinite(max);
  if (hasMin && hasMax && min !== max) return `${prefix}${num(min)}${EN_DASH}${num(max)}`;
  if (hasMin) return `${prefix}${num(min)}`;
  if (hasMax) return `${prefix}${num(max)}`;
  return "";
}

/** `৳980–1,050` / `৳৯৮০–১,০৫০`. */
export function formatMoneyRange(
  min: number | null | undefined,
  max: number | null | undefined,
  lang: FormatLang,
): string {
  return formatRange(min, max, lang, { money: true });
}

/* Time ---------------------------------------------------------------------------------------- */

/** Bengali time-of-day word for an hour 0–23. */
export function bengaliDayPart(hour: number): string {
  const h = ((hour % 24) + 24) % 24;
  if (h >= 4 && h < 6) return "ভোর";
  if (h >= 6 && h < 12) return "সকাল";
  if (h >= 12 && h < 15) return "দুপুর";
  if (h >= 15 && h < 18) return "বিকাল";
  if (h >= 18 && h < 20) return "সন্ধ্যা";
  return "রাত";
}

/** Parse `"HH:MM"` (24-hour) or minutes since midnight. Returns null for anything else. */
export function parseTime(value: string | number): { hour: number; minute: number } | null {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    const total = ((Math.round(value) % 1440) + 1440) % 1440;
    return { hour: Math.floor(total / 60), minute: total % 60 };
  }
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour > 24 || minute > 59) return null;
  return { hour: hour % 24, minute };
}

/**
 * 12-hour clock time. `"07:00"` → `7:00 am` / `সকাল ৭:০০`; `"21:10"` → `9:10 pm` / `রাত ৯:১০`.
 * Returns the input unchanged if it cannot be parsed, and `""` for null.
 */
export function formatTime(value: string | number | null | undefined, lang: FormatLang): string {
  if (value === null || value === undefined || value === "") return "";
  const t = parseTime(value);
  if (!t) return String(value);
  const h12 = t.hour % 12 === 0 ? 12 : t.hour % 12;
  const clock = `${h12}:${String(t.minute).padStart(2, "0")}`;
  if (isBn(lang)) return `${bengaliDayPart(t.hour)} ${toBengaliDigits(clock)}`;
  return `${clock} ${t.hour < 12 ? "am" : "pm"}`;
}

/** `7:00 am – 11:55 am` / `সকাল ৭:০০ – দুপুর ১১:৫৫` (spaced dash: the ends contain spaces). */
export function formatTimeRange(
  from: string | number | null | undefined,
  to: string | number | null | undefined,
  lang: FormatLang,
): string {
  return [formatTime(from, lang), formatTime(to, lang)].filter(Boolean).join(` ${EN_DASH} `);
}

/* Months and dates ---------------------------------------------------------------------------- */

/** `11` → `November` / `নভেম্বর`; `short` gives `Nov` in English (Bengali has no short form). */
export function monthName(
  month: number,
  lang: FormatLang,
  options: { short?: boolean } = {},
): string {
  const m = monthInfo(month);
  if (isBn(lang)) return m.nameBn;
  return options.short ? m.shortEn : m.nameEn;
}

/**
 * A season as a month range, wrapping across the year: `11, 3` → `Nov – Mar` / `নভেম্বর – মার্চ`.
 * One month shows alone; a 12-month season is `All year` / `সারা বছর`. English uses short names
 * unless `short: false`.
 */
export function formatMonthRange(
  from: number,
  to: number,
  lang: FormatLang,
  options: { short?: boolean } = {},
): string {
  if (isYearRound(from, to)) return isBn(lang) ? "সারা বছর" : "All year";
  const short = options.short ?? true;
  const a = monthName(from, lang, { short });
  if (from === to) return a;
  return `${a} ${EN_DASH} ${monthName(to, lang, { short })}`;
}

const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000;

function dateParts(value: Date | string): { y: number; m: number; d: number } | null {
  if (typeof value === "string") {
    const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    if (iso) return { y: Number(iso[1]), m: Number(iso[2]), d: Number(iso[3]) };
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : dateParts(parsed);
  }
  if (Number.isNaN(value.getTime())) return null;
  // Calendar date in Bangladesh time (UTC+6, no daylight saving).
  const dhaka = new Date(value.getTime() + DHAKA_OFFSET_MS);
  return { y: dhaka.getUTCFullYear(), m: dhaka.getUTCMonth() + 1, d: dhaka.getUTCDate() };
}

/**
 * `2026-10-14` → `14 October 2026` / `১৪ অক্টোবর, ২০২৬`. Date objects are read in Bangladesh
 * time; `YYYY-MM-DD…` strings as written.
 */
export function formatDate(value: Date | string | null | undefined, lang: FormatLang): string {
  if (value === null || value === undefined || value === "") return "";
  const p = dateParts(value);
  if (!p || p.m < 1 || p.m > 12) return String(value);
  if (isBn(lang)) return `${toBengaliDigits(p.d)} ${monthName(p.m, lang)}, ${toBengaliDigits(p.y)}`;
  return `${p.d} ${monthName(p.m, lang)} ${p.y}`;
}

const WEEKDAYS_BN = ["রবিবার", "সোমবার", "মঙ্গলবার", "বুধবার", "বৃহস্পতিবার", "শুক্রবার", "শনিবার"];
const WEEKDAYS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** `0` (Sunday) … `6` (Saturday) → the day's name. */
export function weekdayName(day: number, lang: FormatLang): string {
  const names = isBn(lang) ? WEEKDAYS_BN : WEEKDAYS_EN;
  const name = names[day];
  if (name === undefined) throw new RangeError(`weekday out of range: ${day}`);
  return name;
}

/* Durations and distances --------------------------------------------------------------------- */

/** Bengali spoken form of an hour count: 0.5 আধা, 1.5 দেড়, 2.5 আড়াই, 10.5 সাড়ে ১০, 4 → ৪. */
function bengaliHours(hours: number): string | null {
  if (hours === 0.5) return "আধা";
  if (hours === 1.5) return "দেড়";
  if (hours === 2.5) return "আড়াই";
  if (Number.isInteger(hours)) return toBengaliDigits(hours);
  if (Number.isInteger(hours - 0.5)) return `সাড়ে ${toBengaliDigits(hours - 0.5)}`;
  return null;
}

/** Minutes as hours and minutes: `295` → `4 h 55 min` / `৪ ঘণ্টা ৫৫ মিনিট`. */
export function formatMinutes(minutes: number, lang: FormatLang): string {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  const parts: string[] = [];
  if (isBn(lang)) {
    if (h) parts.push(`${toBengaliDigits(h)} ঘণ্টা`);
    if (m || !h) parts.push(`${toBengaliDigits(m)} মিনিট`);
  } else {
    if (h) parts.push(`${h} h`);
    if (m || !h) parts.push(`${m} min`);
  }
  return parts.join(" ");
}

/**
 * A duration in hours: `10.5` → `10.5 hours` / `সাড়ে ১০ ঘণ্টা`; `1` → `1 hour` / `১ ঘণ্টা`.
 * Values that are not whole or half hours fall back to hours and minutes.
 */
export function formatDuration(hours: number, lang: FormatLang): string {
  if (!Number.isFinite(hours) || hours < 0) return "";
  if (!Number.isInteger(hours * 2)) return formatMinutes(hours * 60, lang);
  if (isBn(lang)) return `${bengaliHours(hours)} ঘণ্টা`;
  return `${formatNumber(hours, lang)} ${hours === 1 ? "hour" : "hours"}`;
}

/** `[7.5, 10]` → `7.5–10 hours` / `সাড়ে ৭–১০ ঘণ্টা`. Equal ends collapse to one duration. */
export function formatHoursRange(min: number, max: number, lang: FormatLang): string {
  if (min === max) return formatDuration(min, lang);
  if (isBn(lang)) {
    const a = bengaliHours(min) ?? formatNumber(min, lang);
    const b = bengaliHours(max) ?? formatNumber(max, lang);
    return `${a}${EN_DASH}${b} ঘণ্টা`;
  }
  return `${formatRange(min, max, lang)} hours`;
}

/** Kilometres: one decimal under 10 km, whole numbers above. `312.1` → `312 km` / `৩১২ কিমি`. */
export function formatDistance(km: number, lang: FormatLang): string {
  if (!Number.isFinite(km)) return "";
  const value = formatNumber(km, lang, { maxDecimals: km < 10 ? 1 : 0 });
  return `${value} ${isBn(lang) ? "কিমি" : "km"}`;
}

/* Scores -------------------------------------------------------------------------------------- */

/** The editorial score out of 10: ⌊stars / 100⌋, clamped to 0–10. */
export function starScore(stars: number): number {
  return Math.min(10, Math.max(0, Math.floor(stars / 100)));
}

/** `722` → `★ 7/10` / `★ ৭/১০`. */
export function formatStars(stars: number, lang: FormatLang): string {
  return `★ ${localizeDigits(`${starScore(stars)}/10`, lang)}`;
}

/** `42` → `42%` / `৪২%`. */
export function formatPercent(value: number, lang: FormatLang): string {
  return `${formatNumber(value, lang, { maxDecimals: 0 })}%`;
}
