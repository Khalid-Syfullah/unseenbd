/**
 * Planner and calculator state in the URL, so plans can be shared:
 * `/plan?from=1&to=19,14&people=2&level=mid&ret=1&order=1` (district ids; `places=` adds picked
 * place ids; `add=` appends a district by id or slug, as the trip cost calculator links it), and
 * `/trip-cost?from=1&to=19&people=2&nights=2&level=mid&ret=1`.
 */
import {
  DEFAULT_LEVEL,
  isBudgetLevel,
  MAX_DESTINATIONS,
  MAX_NIGHTS,
  MAX_PEOPLE,
  MIN_PEOPLE,
  type BudgetLevel,
} from "./constants";
import type { PlanInput } from "./types";

export type QueryLike = URLSearchParams | Record<string, string | string[] | undefined>;

export const DEFAULT_PEOPLE = 2;
export const DEFAULT_NIGHTS = 2;

function get(query: QueryLike, key: string): string {
  if (query instanceof URLSearchParams) return query.get(key) ?? "";
  const v = query[key];
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

/** A whole number in [min, max]; `fallback` when missing or malformed. */
function intParam(raw: string, min: number, max: number, fallback: number): number {
  if (!/^\d{1,4}$/.test(raw.trim())) return fallback;
  return Math.min(max, Math.max(min, Number(raw)));
}

/** A switch that is on unless the URL turns it off (`0`, `false`, `off`, `no`). */
function onByDefault(raw: string): boolean {
  return !["0", "false", "off", "no"].includes(raw.trim().toLowerCase());
}

/** Comma-separated values, trimmed, without empties. */
function list(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Positive integer ids from a comma list, de-duplicated, in order. */
function idList(raw: string, limit: number): number[] {
  const ids = list(raw)
    .filter((s) => /^\d{1,6}$/.test(s))
    .map(Number)
    .filter((n) => n >= 1);
  return [...new Set(ids)].slice(0, limit);
}

export type DistrictResolver = (value: string) => number | null;

export function parseLevel(raw: string): BudgetLevel {
  return isBudgetLevel(raw) ? raw : DEFAULT_LEVEL;
}

/** Planner input from the URL. Unknown districts are dropped by `resolve`. */
export function parsePlanQuery(
  query: QueryLike,
  { resolve, defaultStart }: { resolve: DistrictResolver; defaultStart: number },
): PlanInput & { add: number[] } {
  const start = resolve(get(query, "from")) ?? defaultStart;
  const known = (values: string[]) =>
    values
      .slice(0, MAX_DESTINATIONS)
      .map(resolve)
      .filter((id): id is number => id !== null && id !== start);
  const add = [...new Set(known(list(get(query, "add"))))];
  const destinations = [...new Set([...known(list(get(query, "to"))), ...add])].slice(
    0,
    MAX_DESTINATIONS,
  );
  return {
    start,
    destinations,
    places: idList(get(query, "places"), 200),
    optimize: onByDefault(get(query, "order")),
    returnToStart: onByDefault(get(query, "ret")),
    people: intParam(get(query, "people"), MIN_PEOPLE, MAX_PEOPLE, DEFAULT_PEOPLE),
    level: parseLevel(get(query, "level")),
    add,
  };
}

/** The planner's query string (without `?`), commas left readable. */
export function planQuery(input: PlanInput): string {
  const parts = [
    `from=${input.start}`,
    input.destinations.length ? `to=${input.destinations.join(",")}` : "",
    `people=${input.people}`,
    `level=${input.level}`,
    `ret=${input.returnToStart ? 1 : 0}`,
    `order=${input.optimize ? 1 : 0}`,
    input.places.length ? `places=${input.places.join(",")}` : "",
  ];
  return parts.filter(Boolean).join("&");
}

export type TripCostState = {
  from: number;
  /** null until a destination is chosen. */
  to: number | null;
  people: number;
  nights: number;
  level: BudgetLevel;
  roundTrip: boolean;
};

/** Calculator input from the URL. */
export function parseTripCostQuery(
  query: QueryLike,
  { resolve, defaultFrom }: { resolve: DistrictResolver; defaultFrom: number },
): TripCostState {
  const from = resolve(get(query, "from")) ?? defaultFrom;
  const to = resolve(get(query, "to"));
  return {
    from,
    to: to === from ? null : to,
    people: intParam(get(query, "people"), MIN_PEOPLE, MAX_PEOPLE, DEFAULT_PEOPLE),
    nights: intParam(get(query, "nights"), 0, MAX_NIGHTS, DEFAULT_NIGHTS),
    level: parseLevel(get(query, "level")),
    roundTrip: onByDefault(get(query, "ret")),
  };
}

export function tripCostQuery(state: TripCostState): string {
  return [
    `from=${state.from}`,
    state.to !== null ? `to=${state.to}` : "",
    `people=${state.people}`,
    `nights=${state.nights}`,
    `level=${state.level}`,
    `ret=${state.roundTrip ? 1 : 0}`,
  ]
    .filter(Boolean)
    .join("&");
}

/**
 * A resolver over a district list: accepts an id (`19`) or a slug (`coxs-bazar`).
 */
export function districtResolver(
  districts: readonly { id: number; slug: string }[],
): DistrictResolver {
  const byId = new Map(districts.map((d) => [String(d.id), d.id]));
  const bySlug = new Map(districts.map((d) => [d.slug, d.id]));
  return (value) => {
    const v = value.trim().toLowerCase();
    return byId.get(v) ?? bySlug.get(v) ?? null;
  };
}
