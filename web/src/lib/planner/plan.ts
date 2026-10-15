import { RATES } from "./constants";
import { finishCosts, legCost, roomsFor, vehiclesFor } from "./costs";
import { defaultSights, packDays } from "./days";
import { legHours, legKm } from "./distance";
import { orderStops } from "./order";
import type {
  Plan,
  PlanData,
  PlanInput,
  PlanItem,
  PlanLeg,
  PlannerDistrict,
  PlanSight,
} from "./types";

/** Build a district-to-district distance function over the data (memoised per pair). */
export function distanceFn(data: PlanData): (a: number, b: number) => number {
  const byId = new Map(data.districts.map((d) => [d.id, d]));
  const memo = new Map<string, number>();
  return (a, b) => {
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    let km = memo.get(key);
    if (km === undefined) {
      const da = byId.get(a);
      const db = byId.get(b);
      if (!da || !db) throw new RangeError(`unknown district: ${da ? b : a}`);
      km = legKm(da, db, data.roadKm);
      memo.set(key, km);
    }
    return km;
  };
}

/** The sights at a destination: the traveller's picks, else the defaults. Shortest first. */
export function sightsFor(
  districtId: number,
  picked: ReadonlySet<number>,
  data: PlanData,
): PlanSight[] {
  const here = data.places.filter((p) => p.districtId === districtId);
  const chosen = here.filter((p) => picked.has(p.id));
  const list = chosen.length
    ? chosen.sort((a, b) => a.visitHours - b.visitHours || b.stars - a.stars || a.id - b.id)
    : defaultSights(here, districtId);
  return list.map((p) => ({ type: "sight", placeId: p.id, districtId, hours: p.visitHours }));
}

/** Clean input: known districts only, no duplicates, the start never a destination. */
export function cleanInput(input: PlanInput, districts: readonly PlannerDistrict[]): PlanInput {
  const known = new Set(districts.map((d) => d.id));
  const destinations = [...new Set(input.destinations)].filter(
    (id) => known.has(id) && id !== input.start,
  );
  return { ...input, destinations, people: Math.max(1, Math.floor(input.people) || 1) };
}

/**
 * The whole trip (MASTER_PROMPT §5.4): order, legs, sights, days and costs. Returns null when
 * the start is unknown or there is nowhere to go.
 */
export function buildPlan(raw: PlanInput, data: PlanData): Plan | null {
  if (!data.districts.some((d) => d.id === raw.start)) return null;
  const input = cleanInput(raw, data.districts);
  if (!input.destinations.length) return null;

  const dist = distanceFn(data);
  const { start, people, level, returnToStart } = input;
  const order = input.optimize
    ? orderStops(start, input.destinations, dist, returnToStart)
    : [...input.destinations];

  const makeLeg = (from: number, to: number): PlanLeg => {
    const km = dist(from, to);
    const { cost, perPerson } = legCost(km, level, people);
    return { type: "leg", from, to, km, hours: legHours(km), farePerPerson: perPerson, cost };
  };

  const picked = new Set(input.places);
  const sights: Record<number, PlanSight[]> = {};
  const items: PlanItem[] = [];
  const legs: PlanLeg[] = [];
  let at = start;
  for (const stop of order) {
    const leg = makeLeg(at, stop);
    legs.push(leg);
    items.push(leg);
    sights[stop] = sightsFor(stop, picked, data);
    items.push(...sights[stop]);
    at = stop;
  }
  if (returnToStart) {
    const leg = makeLeg(at, start);
    legs.push(leg);
    items.push(leg);
  }

  const days = packDays(items, start);
  const nights = days.length - 1;
  const hotelNights = days.filter((d) => d.sleepIn !== null && d.sleepIn !== start).length;
  const sightseeingDays = days.filter((d) => d.items.some((i) => i.type === "sight")).length;
  const rooms = roomsFor(people);
  const rates = RATES[level];

  const costs = finishCosts(
    {
      transport: legs.reduce((sum, l) => sum + l.cost, 0),
      stay: hotelNights * rooms * rates.hotel,
      food: days.length * people * rates.food,
      local: sightseeingDays * people * rates.local,
    },
    people,
  );

  return {
    input,
    order,
    legs,
    sights,
    days,
    totalKm: legs.reduce((sum, l) => sum + l.km, 0),
    nights,
    hotelNights,
    sightseeingDays,
    rooms,
    vehicles: rates.mode === "car" ? vehiclesFor(people) : 0,
    costs,
  };
}
