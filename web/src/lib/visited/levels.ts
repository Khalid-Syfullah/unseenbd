/**
 * My Bangladesh levels (FEATURES.md §5.4): Explorer 10 · Traveller 25 · Adventurer 40 · Master 50
 * · Legend 64 districts. The titles come from `data/reference.json` (`my_bangladesh_levels`); the
 * badges are `assets/badges/level-{n}-{name}.svg`.
 */
export type Level = {
  /** Districts needed. */
  min: number;
  title: string;
  /** Public path of the badge image. */
  badge: string;
};

/** Badge files in level order. */
export const LEVEL_BADGES = [
  "/badges/level-1-explorer.svg",
  "/badges/level-2-traveller.svg",
  "/badges/level-3-adventurer.svg",
  "/badges/level-4-master.svg",
  "/badges/level-5-legend.svg",
] as const;

/** Index of the highest level reached with `count` districts, or -1 for none yet. */
export function levelIndex(count: number, levels: readonly Pick<Level, "min">[]): number {
  let index = -1;
  levels.forEach((level, i) => {
    if (count >= level.min) index = i;
  });
  return index;
}

/** The next level to reach, or null when every level is reached. */
export function nextLevel<L extends Pick<Level, "min">>(
  count: number,
  levels: readonly L[],
): L | null {
  return levels.find((level) => count < level.min) ?? null;
}
