/**
 * Cleaning visitor text. Everything people write is stored and shown as plain text: React
 * escapes it on output and nothing is ever rendered as HTML. On top of that, tags are removed on
 * the way in (so markup never even reaches a moderator's screen), along with control and
 * invisible formatting characters.
 */

// C0/C1 controls except tab and newline, zero-width spaces and bidi overrides.
const INVISIBLE =
  /[\u0000-\u0008\u000B-\u001F\u007F-\u009F\u200B\u200E\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]/g;
const TAG = /<\/?[a-zA-Z!?][^<>]*>/g;

/** Multi-line text: tags and invisible characters removed, at most one blank line in a row. */
export function plainText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .replace(TAG, "")
    .replace(INVISIBLE, "")
    .replace(/\t/g, " ")
    .replace(/[  ]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** One-line text (names, titles): like `plainText`, with every whitespace run made one space. */
export function lineText(value: unknown): string {
  return plainText(value).replace(/\s+/g, " ").trim();
}

/** Length in characters as people count them (code points), for limits and counters. */
export function textLength(value: string): number {
  return [...value].length;
}

export type FieldResult = { ok: true; value: string } | { ok: false; reason: "missing" | "long" };

/**
 * Cleans one field and checks it: `missing` when required and empty, `long` when over `max`
 * characters. Optional empty fields come back as "".
 */
export function checkText(
  value: unknown,
  max: number,
  { required = false, multiline = false }: { required?: boolean; multiline?: boolean } = {},
): FieldResult {
  const clean = multiline ? plainText(value) : lineText(value);
  if (!clean) return required ? { ok: false, reason: "missing" } : { ok: true, value: "" };
  if (textLength(clean) > max) return { ok: false, reason: "long" };
  return { ok: true, value: clean };
}
