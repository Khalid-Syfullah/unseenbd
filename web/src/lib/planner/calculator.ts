import { MAX_NIGHTS, MAX_PEOPLE, MIN_PEOPLE, RATES, type BudgetLevel } from "./constants";
import { busFare, finishCosts, roomsFor, vehiclesFor } from "./costs";
import { legHours, legKm } from "./distance";
import type { PlanCosts, PlannerDistrict, RoadKmLookup } from "./types";

export type TripCostInput = {
  from: PlannerDistrict;
  to: PlannerDistrict;
  /** 1–30. */
  people: number;
  /** 0–60. */
  nights: number;
  level: BudgetLevel;
  roundTrip: boolean;
};

export type TripCost = {
  km: number;
  hours: number;
  days: number;
  rooms: number;
  /** One traveller's fare each way (bus), or their share of the car each way. */
  farePerPerson: number;
  /** Legs travelled: 2 for a round trip, else 1. */
  legs: number;
  vehicles: number;
  costs: PlanCosts;
};

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Math.floor(Number.isFinite(v) ? v : min)));

/**
 * The A → B trip cost calculator (MASTER_PROMPT §5.5). Days = nights + 1. Transport = fare ×
 * people × legs (car: km × 42 × cars × legs); stay = nights × rooms × hotel; food and local
 * transport per person per day; 8 % buffer rounded to 50; total rounded to 100.
 */
export function tripCost(input: TripCostInput, roadKm?: RoadKmLookup): TripCost {
  const people = clamp(input.people, MIN_PEOPLE, MAX_PEOPLE);
  const nights = clamp(input.nights, 0, MAX_NIGHTS);
  const rates = RATES[input.level];
  const km = legKm(input.from, input.to, roadKm);
  const days = nights + 1;
  const legs = input.roundTrip ? 2 : 1;
  const rooms = roomsFor(people);
  const vehicles = rates.mode === "car" ? vehiclesFor(people) : 0;

  let transport: number;
  let farePerPerson: number;
  if (rates.mode === "car") {
    transport = Math.round(km * rates.perKm * vehicles * legs);
    farePerPerson = Math.round((km * rates.perKm * vehicles) / people);
  } else {
    farePerPerson = km > 0 ? busFare(km, input.level) : 0;
    transport = farePerPerson * people * legs;
  }

  const costs = finishCosts(
    {
      transport,
      stay: nights * rooms * rates.hotel,
      food: days * people * rates.food,
      local: days * people * rates.local,
    },
    people,
  );
  return { km, hours: legHours(km), days, rooms, farePerPerson, legs, vehicles, costs };
}
