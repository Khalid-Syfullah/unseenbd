/**
 * The twelve months. This is reference data (seeded into the `months` table), not interface
 * copy: pages read month names from the data layer, formatters read them from here.
 */
export type MonthInfo = {
  month: number;
  slug: string;
  nameBn: string;
  nameEn: string;
  shortEn: string;
};

export const MONTHS: readonly MonthInfo[] = [
  { month: 1, slug: "january", nameBn: "জানুয়ারি", nameEn: "January", shortEn: "Jan" },
  { month: 2, slug: "february", nameBn: "ফেব্রুয়ারি", nameEn: "February", shortEn: "Feb" },
  { month: 3, slug: "march", nameBn: "মার্চ", nameEn: "March", shortEn: "Mar" },
  { month: 4, slug: "april", nameBn: "এপ্রিল", nameEn: "April", shortEn: "Apr" },
  { month: 5, slug: "may", nameBn: "মে", nameEn: "May", shortEn: "May" },
  { month: 6, slug: "june", nameBn: "জুন", nameEn: "June", shortEn: "Jun" },
  { month: 7, slug: "july", nameBn: "জুলাই", nameEn: "July", shortEn: "Jul" },
  { month: 8, slug: "august", nameBn: "আগস্ট", nameEn: "August", shortEn: "Aug" },
  { month: 9, slug: "september", nameBn: "সেপ্টেম্বর", nameEn: "September", shortEn: "Sep" },
  { month: 10, slug: "october", nameBn: "অক্টোবর", nameEn: "October", shortEn: "Oct" },
  { month: 11, slug: "november", nameBn: "নভেম্বর", nameEn: "November", shortEn: "Nov" },
  { month: 12, slug: "december", nameBn: "ডিসেম্বর", nameEn: "December", shortEn: "Dec" },
];

/** 1–12 from a number, numeric string or month slug (`"11"`, `"november"`); otherwise null. */
export function parseMonth(value: unknown): number | null {
  if (typeof value === "number")
    return Number.isInteger(value) && value >= 1 && value <= 12 ? value : null;
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  if (/^\d{1,2}$/.test(v)) return parseMonth(Number(v));
  const found = MONTHS.find((m) => m.slug === v || m.shortEn.toLowerCase() === v);
  return found ? found.month : null;
}

export function monthInfo(month: number): MonthInfo {
  const info = MONTHS[month - 1];
  if (!info || !Number.isInteger(month)) throw new RangeError(`month out of range: ${month}`);
  return info;
}
