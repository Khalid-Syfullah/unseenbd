/**
 * Text matching for search: case- and accent-insensitive, with a simple Bengali ↔ Latin
 * transliteration so "sajek" finds "সাজেক" and "সাজেক" finds "Sajek".
 *
 * Both scripts are reduced to a consonant "skeleton": vowels, `h` and punctuation are dropped,
 * look-alike consonants share a letter (k/c/q, j/z, s/sh, b/v/w, d/dh, t/th, …) and repeats
 * collapse. "Sajek" and "সাজেক" both become "sjk"; "Cox's Bazar" and "কক্সবাজার" both
 * become "ksbjr". It is deliberately loose, so exact and prefix matches always rank higher.
 */

const BN_SKELETON: Record<string, string> = {
  ক: "k",
  খ: "k",
  গ: "g",
  ঘ: "g",
  ঙ: "n",
  "ং": "n",
  ঞ: "n",
  ন: "n",
  ণ: "n",
  চ: "c",
  ছ: "c",
  জ: "j",
  ঝ: "j",
  য: "j",
  ট: "t",
  ঠ: "t",
  ত: "t",
  থ: "t",
  ৎ: "t",
  ড: "d",
  ঢ: "d",
  দ: "d",
  ধ: "d",
  প: "p",
  ফ: "p",
  ব: "b",
  ভ: "b",
  ম: "m",
  র: "r",
  ল: "l",
  শ: "s",
  ষ: "s",
  স: "s",
};

const NUKTA = "়";
const COMBINING = /[̀-ͯ]/g;
const BENGALI = /[ঀ-৿]/;

/** Lower-case, accents removed, punctuation dropped, spaces collapsed. Bengali is kept as is. */
export function fold(text: string): string {
  return text
    .normalize("NFD")
    .replace(COMBINING, "")
    .toLowerCase()
    .replace(/['’‘`´]/g, "")
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, " ")
    .trim();
}

function latinSkeleton(run: string): string {
  let out = "";
  for (let i = 0; i < run.length; i++) {
    const c = run[i]!;
    const next = run[i + 1];
    const two = c + (next ?? "");
    if (c === "c" && next === "h") {
      out += "c";
      i += run[i + 2] === "h" ? 2 : 1;
    } else if (c === "n" && next === "g") {
      out += "n";
      i += 1;
    } else if ("kgtdpbjs".includes(c) && next === "h") {
      out += c;
      i += 1;
    } else if (two === "ck") {
      out += "k";
      i += 1;
    } else if (c === "x") out += "ks";
    else if (c === "q" || c === "c") out += "k";
    else if (c === "f") out += "p";
    else if (c === "v" || c === "w") out += "b";
    else if (c === "z") out += "j";
    else if ("kgtdpbjsnmrl".includes(c)) out += c;
    // vowels, h and y are dropped
  }
  return out;
}

/** The consonant skeleton of a text in either script (see the module comment). */
export function skeleton(text: string): string {
  const s = fold(text).replace(/ /g, "");
  let out = "";
  let latin = "";
  const flush = () => {
    out += latinSkeleton(latin);
    latin = "";
  };
  const chars = [...s];
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i]!;
    if (BENGALI.test(c)) {
      flush();
      const next = chars[i + 1];
      if (c === "য" && next === NUKTA) {
        i += 1; // য় is a glide, not a consonant
        continue;
      }
      if ((c === "ড" || c === "ঢ") && next === NUKTA) {
        out += "r";
        i += 1;
        continue;
      }
      if (c === "ড়" || c === "ঢ়") out += "r";
      else out += BN_SKELETON[c] ?? "";
    } else if (c >= "a" && c <= "z") latin += c;
    else flush();
  }
  flush();
  return out.replace(/(.)\1+/g, "$1");
}

/** Match quality, best first: 4 equal · 3 starts a word · 2 contains · 1 same consonants · 0 none. */
export type MatchScore = 0 | 1 | 2 | 3 | 4;

export type Query = { fold: string; skeleton: string };

export function prepareQuery(raw: string): Query {
  return { fold: fold(raw), skeleton: skeleton(raw) };
}

/** Scores one text against a prepared query. `fuzzy: false` skips the consonant skeleton. */
export function scoreText(query: Query, text: string, fuzzy = true): MatchScore {
  if (!query.fold) return 0;
  const f = fold(text);
  if (f === query.fold) return 4;
  if (f.startsWith(query.fold) || f.includes(` ${query.fold}`)) return 3;
  if (f.includes(query.fold)) return 2;
  if (!fuzzy) return 0;
  const sk = query.skeleton;
  if (sk.length >= 3) return skeleton(text).includes(sk) ? 1 : 0;
  if (sk.length === 2) {
    // too loose to search inside a name: the whole name, or one of its words, must match
    return f.split(" ").some((w) => skeleton(w) === sk) ? 1 : 0;
  }
  return 0;
}

/** The best score over several texts. */
export function scoreAny(query: Query, texts: (string | null | undefined)[], fuzzy = true) {
  let best: MatchScore = 0;
  for (const text of texts) {
    if (!text) continue;
    const s = scoreText(query, text, fuzzy);
    if (s > best) best = s;
    if (best === 4) break;
  }
  return best;
}
