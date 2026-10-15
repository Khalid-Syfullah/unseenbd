import type { BudgetLevel } from "./constants";

/** What the engine needs to know about a district. */
export type PlannerDistrict = { id: number; slug: string; lat: number; lng: number };

/** What the engine needs to know about a place. */
export type PlannerPlace = {
  id: number;
  districtId: number;
  popular: boolean;
  /** Time to see it, hours. */
  visitHours: number;
  /** Editorial score 0–1000 (picks the default sights). */
  stars: number;
};

/** Real road distance in km between two district ids, or null/undefined when unknown. */
export type RoadKmLookup = (fromId: number, toId: number) => number | null | undefined;

/** Planner inputs (the form, and the URL). */
export type PlanInput = {
  /** Start district id. */
  start: number;
  /** Destination district ids, in the traveller's order. */
  destinations: number[];
  /** Place ids the traveller picked; a destination with none gets the default sights. */
  places: number[];
  /** Order the destinations by the shortest total distance. */
  optimize: boolean;
  /** Come back to the start district at the end. */
  returnToStart: boolean;
  people: number;
  level: BudgetLevel;
};

export type PlanData = {
  districts: readonly PlannerDistrict[];
  places: readonly PlannerPlace[];
  /** Prefer these real road distances over the estimate when given. */
  roadKm?: RoadKmLookup;
};

export type PlanLeg = {
  type: "leg";
  from: number;
  to: number;
  km: number;
  hours: number;
  /** What one traveller pays for this leg (bus ticket, or their share of the car). */
  farePerPerson: number;
  /** The whole group's cost for this leg. */
  cost: number;
};

export type PlanSight = {
  type: "sight";
  placeId: number;
  districtId: number;
  /** The place's visit time, hours (not including the half-hour allowance). */
  hours: number;
  /** True on the second and later days of a sight longer than one day. */
  continued?: boolean;
};

export type PlanItem = PlanLeg | PlanSight;

export type PlanDay = {
  /** 1-based. */
  day: number;
  items: PlanItem[];
  /** Planned hours used this day (legs capped at 9, sights + 0.5). */
  hours: number;
  /** Where the night is spent; null on the last day. */
  sleepIn: number | null;
  /** Where the day ends (the trip end on the last day). */
  endsIn: number;
};

export type PlanCosts = {
  transport: number;
  stay: number;
  food: number;
  local: number;
  /** Entry fees and incidentals: 8 % of the subtotal, rounded to 50. */
  misc: number;
  subtotal: number;
  /** Rounded to 100. */
  total: number;
  perPerson: number;
};

export type Plan = {
  input: PlanInput;
  /** Destination ids in visiting order. */
  order: number[];
  legs: PlanLeg[];
  /** Sights per destination, in visiting order. */
  sights: Record<number, PlanSight[]>;
  days: PlanDay[];
  totalKm: number;
  nights: number;
  /** Nights away from the start district (paid). */
  hotelNights: number;
  sightseeingDays: number;
  rooms: number;
  /** Hired cars (high level only, else 0). */
  vehicles: number;
  costs: PlanCosts;
};
