/**
 * Leaderboard names: short, readable, no links and no swearing. Every name is also checked by a
 * person before it is shown (entries start unapproved); this filter only keeps the obvious out
 * of the admin queue.
 */
import { graphemes } from "@/lib/card/text";
import { cleanName } from "@/lib/visited/encode";

export const MIN_PLAYER_NAME = 2;
export const MAX_PLAYER_NAME = 24;

/**
 * Words that are rude wherever they appear in a name (checked against the name with spaces,
 * dots and look-alike digits removed, so "f.u.c.k" and "fu_ck" are caught too).
 */
const BLOCKED_ANYWHERE = [
  "fuck",
  "nigger",
  "nigga",
  "faggot",
  "motherf",
  "asshole",
  "bitch",
  "whore",
  "bokachoda",
  "khanki",
  "khankir",
  "chudir",
  "chodna",
  "haramjada",
  "haramzada",
  "বোকাচোদা",
  "খানকি",
  "খানকী",
  "চুদির",
  "চুদি",
  "চোদা",
  "চোদন",
  "মাগি",
  "মাগী",
  "বেশ্যা",
  "হারামজাদা",
  "হারামজাদি",
  "হারামি",
  "শুয়োরের",
];

/** Short words that are rude only on their own (as a whole word), not inside other words. */
const BLOCKED_WORDS = [
  "shit",
  "fuk",
  "cunt",
  "dick",
  "cock",
  "pussy",
  "slut",
  "fag",
  "rape",
  "porn",
  "sex",
  "bastard",
  "retard",
  "magi",
  "choda",
  "chudi",
  "harami",
  "shuor",
  "suar",
  "kutta",
  "বাল",
  "শুয়োর",
  "কুত্তা",
];

const LEET: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "@": "a",
  $: "s",
  "!": "i",
};

function normalise(text: string): string {
  return text
    .normalize("NFC")
    .toLowerCase()
    .replace(/[013457@$!]/g, (c) => LEET[c] ?? c);
}

/** Letters and marks only, repeated letters squeezed ("fuuuck" → "fuck"). */
function compact(text: string): string {
  return normalise(text)
    .replace(/[^\p{L}\p{M}]+/gu, "")
    .replace(/(\p{L})\1+/gu, "$1");
}

function words(text: string): string[] {
  return normalise(text)
    .split(/[^\p{L}\p{M}]+/u)
    .filter(Boolean)
    .map((w) => w.replace(/(\p{L})\1+/gu, "$1"));
}

const ANYWHERE = BLOCKED_ANYWHERE.map((w) => compact(w)).filter(Boolean);
const WHOLE = new Set(BLOCKED_WORDS.map((w) => compact(w)));

/** True when the name contains a word from the block lists. */
export function isProfane(name: string): boolean {
  const squeezed = compact(name);
  if (ANYWHERE.some((w) => squeezed.includes(w))) return true;
  return words(name).some((w) => WHOLE.has(w));
}

export type NameCheck =
  | { ok: true; name: string }
  | { ok: false; error: "name_length" | "name_invalid" | "name_profane" };

/** Cleans a submitted name and says whether it can go on the board (after approval). */
export function checkPlayerName(value: unknown): NameCheck {
  if (typeof value !== "string") return { ok: false, error: "name_invalid" };
  if ([...value].length > MAX_PLAYER_NAME * 4) return { ok: false, error: "name_length" };
  const name = cleanName(value);
  const length = graphemes(name).length;
  if (length < MIN_PLAYER_NAME || length > MAX_PLAYER_NAME)
    return { ok: false, error: "name_length" };
  if (!/\p{L}/u.test(name)) return { ok: false, error: "name_invalid" };
  if (/https?:|www\.|\.(com|net|org|xyz|bd|io|me)\b|@\w|\/\//i.test(name)) {
    return { ok: false, error: "name_invalid" };
  }
  if (isProfane(name)) return { ok: false, error: "name_profane" };
  return { ok: true, name };
}
