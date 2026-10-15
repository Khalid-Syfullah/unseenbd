/**
 * Text fitting for the card, written against a `measure(text) → width` function so it works with
 * a canvas context in the browser and with a fake measure in tests.
 */

export type Measure = (text: string) => number;

const ELLIPSIS = "…";

/** Splits text into user-perceived characters, so Bengali conjuncts are never cut in half. */
export function graphemes(text: string): string[] {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const seg = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    return Array.from(seg.segment(text), (s) => s.segment);
  }
  return Array.from(text);
}

/** The longest start of `text` that fits `maxWidth` with "…" after it. */
export function ellipsize(text: string, maxWidth: number, measure: Measure): string {
  if (measure(text) <= maxWidth) return text;
  const chars = graphemes(text);
  let lo = 0;
  let hi = chars.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const candidate = chars.slice(0, mid).join("").trimEnd() + ELLIPSIS;
    if (measure(candidate) <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return lo ? chars.slice(0, lo).join("").trimEnd() + ELLIPSIS : "";
}

/**
 * Wraps text into at most `maxLines` lines no wider than `maxWidth`, breaking at spaces (a word
 * longer than a line is cut by characters). The last line ends with "…" when text is left over.
 */
export function wrapLines(
  text: string,
  maxWidth: number,
  maxLines: number,
  measure: Measure,
): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean || maxLines <= 0) return [];
  const words = clean.split(" ");
  const lines: string[] = [];
  let line = "";
  let i = 0;
  while (i < words.length) {
    const word = words[i]!;
    const candidate = line ? `${line} ${word}` : word;
    if (measure(candidate) <= maxWidth) {
      line = candidate;
      i++;
      continue;
    }
    if (!line) {
      // One word wider than the line: cut it by characters.
      const chars = graphemes(word);
      let n = chars.length;
      while (n > 1 && measure(chars.slice(0, n).join("")) > maxWidth) n--;
      lines.push(chars.slice(0, n).join(""));
      words[i] = chars.slice(n).join("");
      if (!words[i]) i++;
    } else {
      lines.push(line);
      line = "";
    }
    if (lines.length === maxLines) break;
  }
  if (line && lines.length < maxLines) {
    lines.push(line);
    line = "";
  }
  const leftover = i < words.length || line !== "";
  if (leftover && lines.length) {
    const last = lines.length - 1;
    const rest = [lines[last], line, ...words.slice(i)].filter(Boolean).join(" ");
    lines[last] = ellipsize(rest, maxWidth, measure);
  }
  return lines;
}

/**
 * The biggest font size from `size` down to `minSize` at which `text` fits `maxWidth`
 * (`measureAt(text, size)` measures at a given size). Returns `minSize` when nothing fits.
 */
export function fitFontSize(
  text: string,
  maxWidth: number,
  size: number,
  minSize: number,
  measureAt: (text: string, size: number) => number,
): number {
  let s = Math.floor(size);
  const floor = Math.max(1, Math.floor(minSize));
  while (s > floor && measureAt(text, s) > maxWidth) s--;
  return s;
}
