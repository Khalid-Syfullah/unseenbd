import { WORLD_COUNTRIES, type WorldCountry } from "@/components/maps/WorldMap";
import type { MessageKey } from "@/i18n/translate";
import type { WorldMark } from "@/lib/visited";

/* The world map's countries grouped by continent, for counts and the country list. */

export const CONTINENTS = [
  "asia",
  "europe",
  "africa",
  "northAmerica",
  "southAmerica",
  "oceania",
] as const;
export type Continent = (typeof CONTINENTS)[number];

export const CONTINENT_LABEL: Record<Continent, MessageKey> = {
  asia: "world.asia",
  europe: "world.europe",
  africa: "world.africa",
  northAmerica: "world.northAmerica",
  southAmerica: "world.southAmerica",
  oceania: "world.oceania",
};

const BY_NAME: Record<string, Continent> = {
  Asia: "asia",
  Europe: "europe",
  Africa: "africa",
  "North America": "northAmerica",
  "South America": "southAmerica",
  Oceania: "oceania",
};

/** Natural Earth files a few islands under "Seven seas"; give them the continent people expect. */
const OPEN_OCEAN: Record<string, Continent> = {
  MV: "asia",
  IO: "asia",
  MU: "africa",
  SC: "africa",
  SH: "africa",
  TF: "africa",
  HM: "oceania",
  GS: "southAmerica",
};

export function continentOf(country: WorldCountry): Continent {
  return OPEN_OCEAN[country.key] ?? BY_NAME[country.continent] ?? "asia";
}

export type CountryEntry = WorldCountry & { continentKey: Continent };

/** Every country and territory on the map, with its continent key. */
export const COUNTRIES: readonly CountryEntry[] = WORLD_COUNTRIES.map((c) => ({
  ...c,
  continentKey: continentOf(c),
}));

export const COUNTRY_KEYS = new Set(COUNTRIES.map((c) => c.key));

export type ContinentCount = { key: Continent; total: number; visited: number; wish: number };

/** Totals, visited and want-to-go per continent. */
export function continentCounts(marks: Readonly<Record<string, WorldMark>>): ContinentCount[] {
  return CONTINENTS.map((key) => {
    const list = COUNTRIES.filter((c) => c.continentKey === key);
    return {
      key,
      total: list.length,
      visited: list.filter((c) => marks[c.key] === "visited").length,
      wish: list.filter((c) => marks[c.key] === "wish").length,
    };
  });
}

/** Marks that belong to countries on the map (ignores anything stale). */
export function countMarks(marks: Readonly<Record<string, WorldMark>>) {
  let visited = 0;
  let wish = 0;
  for (const [key, mark] of Object.entries(marks)) {
    if (!COUNTRY_KEYS.has(key)) continue;
    if (mark === "visited") visited += 1;
    else wish += 1;
  }
  return { visited, wish };
}
