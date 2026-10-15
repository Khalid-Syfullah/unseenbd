/**
 * The travel personality quiz (FEATURES.md §5.11): six rounds, each showing one place of each of
 * four travel styles; the style picked most often is yours. Just for fun — no score, no board.
 */
import { createRng, dailySeed, sample, shuffle } from "./seed";

export const TRAVEL_STYLES = ["sea", "hills", "heritage", "countryside"] as const;
export type TravelStyle = (typeof TRAVEL_STYLES)[number];

/** Which place kinds (`kinds.json`) belong to each style. */
export const STYLE_KINDS: Readonly<Record<TravelStyle, readonly string[]>> = {
  sea: ["beach", "island"],
  hills: ["hill", "waterfall", "forest", "tea"],
  heritage: ["heritage", "spiritual", "city"],
  countryside: ["river", "village"],
};

export const PERSONALITY_ROUNDS = 6;

export function isTravelStyle(value: unknown): value is TravelStyle {
  return typeof value === "string" && (TRAVEL_STYLES as readonly string[]).includes(value);
}

/** The style a place kind belongs to, or null. */
export function styleOfKind(kind: string): TravelStyle | null {
  for (const style of TRAVEL_STYLES) if (STYLE_KINDS[style].includes(kind)) return style;
  return null;
}

export type PersonalityOption = { style: TravelStyle; slug: string };

/**
 * Six rounds of four options (one per style, in a shuffled order). `pools` lists the place slugs
 * of each style, best first; each place appears at most once.
 */
export function buildPersonalityRounds(
  date: string,
  pools: Readonly<Record<TravelStyle, readonly string[]>>,
): PersonalityOption[][] {
  const rng = createRng(dailySeed("personality", date));
  const picks = Object.fromEntries(
    TRAVEL_STYLES.map((style) => [style, sample(rng, pools[style] ?? [], PERSONALITY_ROUNDS)]),
  ) as Record<TravelStyle, string[]>;
  const rounds: PersonalityOption[][] = [];
  for (let i = 0; i < PERSONALITY_ROUNDS; i += 1) {
    const options = TRAVEL_STYLES.filter((s) => picks[s][i]).map((style) => ({
      style,
      slug: picks[style][i]!,
    }));
    if (options.length) rounds.push(shuffle(rng, options));
  }
  return rounds;
}

/** Picks per style. */
export function styleCounts(picks: readonly TravelStyle[]): Record<TravelStyle, number> {
  const counts = Object.fromEntries(TRAVEL_STYLES.map((s) => [s, 0])) as Record<
    TravelStyle,
    number
  >;
  for (const p of picks) counts[p] += 1;
  return counts;
}

/** The most-picked style; a tie goes to the style picked most recently. Null with no picks. */
export function personalityResult(picks: readonly TravelStyle[]): TravelStyle | null {
  if (!picks.length) return null;
  const counts = styleCounts(picks);
  const top = Math.max(...Object.values(counts));
  for (let i = picks.length - 1; i >= 0; i -= 1) {
    if (counts[picks[i]!] === top) return picks[i]!;
  }
  return null;
}
