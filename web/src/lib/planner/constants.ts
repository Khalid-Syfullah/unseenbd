/**
 * The planner's model constants (MASTER_PROMPT §5.4). Every figure the planner and the trip cost
 * calculator produce comes from these numbers; change them here and nowhere else.
 */

export const BUDGET_LEVELS = ["low", "mid", "high"] as const;
export type BudgetLevel = (typeof BUDGET_LEVELS)[number];
export const DEFAULT_LEVEL: BudgetLevel = "mid";

export function isBudgetLevel(value: unknown): value is BudgetLevel {
  return typeof value === "string" && (BUDGET_LEVELS as readonly string[]).includes(value);
}

export type LevelRates = {
  /** How travellers move between districts. */
  mode: "bus" | "car";
  /** Bus: taka per km per person. Car: taka per km per vehicle. */
  perKm: number;
  /** Taka per room per night. */
  hotel: number;
  /** Taka per person per day. */
  food: number;
  /** Taka per person per sightseeing day (rickshaws, CNGs, boats). */
  local: number;
};

/** Costs in BDT by budget level. */
export const RATES: Record<BudgetLevel, LevelRates> = {
  low: { mode: "bus", perKm: 2.9, hotel: 1200, food: 500, local: 300 },
  mid: { mode: "bus", perKm: 4.6, hotel: 3000, food: 900, local: 700 },
  high: { mode: "car", perKm: 42, hotel: 7000, food: 1600, local: 1200 },
};

/** Roads wind: real road distance is about 1.3 × the straight line between district centroids… */
export const ROAD_FACTOR = 1.3;
/** …and more in the Chittagong Hill Tracts. */
export const HILL_ROAD_FACTOR = 1.45;
export const HILL_TRACTS: ReadonlySet<string> = new Set(["bandarban", "khagrachhari", "rangamati"]);
/** Added to every estimated leg (getting in and out of towns). */
export const LEG_EXTRA_KM = 8;
/** Leg distances are rounded to this many km… */
export const KM_STEP = 5;
/** …and are never shorter than this. */
export const MIN_LEG_KM = 10;

/** Average door-to-door road speed, km/h. */
export const ROAD_SPEED_KMH = 42;
/** Added to every leg for boarding, breaks and town traffic, hours. */
export const LEG_EXTRA_HOURS = 0.5;

/** Usable hours in a travel day. */
export const DAY_HOURS = 9;
/** Added to each sight's visit time (getting there and back within the district). */
export const SIGHT_EXTRA_HOURS = 0.5;

/** The cheapest bus ticket, taka. */
export const MIN_BUS_FARE = 80;
/** Bus fares are rounded to this many taka. */
export const FARE_STEP = 10;
/** Travellers per hired car. */
export const PEOPLE_PER_CAR = 4;
/** Travellers per hotel room. */
export const PEOPLE_PER_ROOM = 2;

/** Entry fees and incidentals, as a share of the subtotal… */
export const MISC_SHARE = 0.08;
/** …rounded to this many taka. */
export const MISC_STEP = 50;
/** The total is rounded to this many taka. */
export const TOTAL_STEP = 100;

/** Up to this many destinations are ordered by trying every permutation. */
export const BRUTE_FORCE_MAX = 7;

/** Sights picked for a destination when the traveller chooses none. */
export const DEFAULT_SIGHTS = 3;
/** Popular places up to this long are default sights… */
export const DEFAULT_SIGHT_MAX_HOURS = 8;
/** …otherwise any place up to this long. */
export const FALLBACK_SIGHT_MAX_HOURS = 3;

/** Planner and calculator input limits. */
export const MIN_PEOPLE = 1;
export const MAX_PEOPLE = 30;
export const MAX_NIGHTS = 60;
export const MAX_DESTINATIONS = 30;
