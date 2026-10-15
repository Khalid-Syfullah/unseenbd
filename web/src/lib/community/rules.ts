/**
 * Limits for community submissions, shared by the forms (hints, `maxLength`, early checks) and
 * the API (the checks that count). Changing a number here changes both.
 */

const MB = 1024 * 1024;

/** Photos per upload batch, and per post. */
export const UPLOAD_PHOTOS_MAX = 3;
export const POST_PHOTOS_MAX = 4;

/** Largest file the server accepts, after the browser has shrunk and re-encoded it. */
export const PHOTO_BYTES_MAX = 5 * MB;
/** Largest original the browser will try to shrink (bigger files are refused before reading). */
export const ORIGINAL_BYTES_MAX = 40 * MB;
/** Longest side of an uploaded photo, in pixels. */
export const PHOTO_SIDE_MAX = 2000;
/** Thumbnails: longest side the browser makes, and the most the server accepts. */
export const THUMB_SIDE = 480;
export const THUMB_SIDE_MAX = 640;
export const THUMB_BYTES_MAX = 512 * 1024;

/** Text lengths (characters). */
export const NAME_MAX = 60;
export const EMAIL_MAX = 254;
export const CAPTION_MAX = 120;
export const PHOTO_COMMENT_MAX = 100;
export const POST_MAX = 2000;
export const POST_COMMENT_MAX = 300;
export const SUGGESTION_NAME_MAX = 80;
export const SUGGESTION_BODY_MAX = 600;
export const TIP_BODY_MAX = 1000;
export const TREND_COMMENT_MAX = 200;
export const REPORT_NOTE_MAX = 300;

/** ★ ratings on posts and suggestions. */
export const RATING_MIN = 1;
export const RATING_MAX = 10;

/** Daily quotas (Bangladesh calendar day). */
export const DAILY = {
  /** Upload batches per IP address. */
  photos: 2,
  /** Posts per signed-in user. */
  posts: 5,
  /** Place / food / product suggestions per IP address. */
  suggestions: 5,
  /** Tips and corrections per IP address. */
  guide: 5,
  /** Comments (photos, posts, trending) per visitor. */
  comments: 30,
  /** Reports per visitor. */
  reports: 20,
  /** Owner listings per IP address (or signed-in owner). */
  listings: 3,
} as const;

export type QuotaScope = keyof typeof DAILY;

export const REPORT_REASONS = [
  "inappropriate",
  "not_bangladesh",
  "copyright",
  "privacy",
  "spam",
  "other",
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const TIP_KINDS = ["tip", "correction", "experience", "warning"] as const;
export type TipKind = (typeof TIP_KINDS)[number];

export const SUGGESTION_KINDS = ["place", "food", "product"] as const;
export type SuggestionKind = (typeof SUGGESTION_KINDS)[number];

/** Emoji offered by the post composer's picker. */
export const EMOJI = [
  "😀",
  "😂",
  "😍",
  "🥰",
  "😎",
  "🤩",
  "😮",
  "😢",
  "🙏",
  "👍",
  "👏",
  "💚",
  "❤️",
  "🔥",
  "✨",
  "🎉",
  "🇧🇩",
  "🌄",
  "🏞️",
  "🏝️",
  "🏖️",
  "⛰️",
  "🌊",
  "🌧️",
  "☀️",
  "🌙",
  "🌳",
  "🌾",
  "🍵",
  "🐟",
  "🍛",
  "🥭",
  "🚌",
  "🚆",
  "⛴️",
  "🛺",
  "✈️",
  "🏕️",
  "📸",
  "🗺️",
] as const;

const EMAIL_PATTERN = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;

export function isValidEmail(value: string): boolean {
  return value.length <= EMAIL_MAX && EMAIL_PATTERN.test(value);
}

/** Largest request bodies: all files plus room for the text fields. */
export const UPLOAD_BODY_MAX = UPLOAD_PHOTOS_MAX * (PHOTO_BYTES_MAX + THUMB_BYTES_MAX) + 64 * 1024;
export const POST_BODY_MAX = POST_PHOTOS_MAX * (PHOTO_BYTES_MAX + THUMB_BYTES_MAX) + 64 * 1024;
