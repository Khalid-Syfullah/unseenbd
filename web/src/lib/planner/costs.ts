import {
  FARE_STEP,
  MIN_BUS_FARE,
  MISC_SHARE,
  MISC_STEP,
  PEOPLE_PER_CAR,
  PEOPLE_PER_ROOM,
  RATES,
  TOTAL_STEP,
  type BudgetLevel,
} from "./constants";
import { roundTo } from "./distance";
import type { PlanCosts } from "./types";

/** Hotel rooms for a group: one per two travellers. */
export function roomsFor(people: number): number {
  return Math.ceil(people / PEOPLE_PER_ROOM);
}

/** Hired cars for a group (high level): one per four travellers. */
export function vehiclesFor(people: number): number {
  return Math.ceil(people / PEOPLE_PER_CAR);
}

/** One bus ticket: km × rate, rounded to 10 taka, at least ৳80. */
export function busFare(km: number, level: BudgetLevel): number {
  return Math.max(MIN_BUS_FARE, roundTo(km * RATES[level].perKm, FARE_STEP));
}

/** What a leg costs: the whole group's spend and one traveller's share. */
export function legCost(
  km: number,
  level: BudgetLevel,
  people: number,
): { cost: number; perPerson: number } {
  const rates = RATES[level];
  if (rates.mode === "car") {
    const cost = Math.round(km * rates.perKm * vehiclesFor(people));
    return { cost, perPerson: Math.round(cost / people) };
  }
  const fare = busFare(km, level);
  return { cost: fare * people, perPerson: fare };
}

/** Misc and total: 8 % of the subtotal rounded to 50, then the total rounded to 100. */
export function finishCosts(
  parts: Pick<PlanCosts, "transport" | "stay" | "food" | "local">,
  people: number,
): PlanCosts {
  const subtotal = parts.transport + parts.stay + parts.food + parts.local;
  const misc = roundTo(subtotal * MISC_SHARE, MISC_STEP);
  const total = roundTo(subtotal + misc, TOTAL_STEP);
  return { ...parts, misc, subtotal, total, perPerson: Math.round(total / people) };
}
