import { beforeAll, describe, expect, it } from "vitest";
import { getPlannerData, type PlannerData } from "@/server/data";
import {
  buildPlan,
  busFare,
  defaultSights,
  estimateLegKm,
  finishCosts,
  legCost,
  legHours,
  legKm,
  packDays,
  roadKmLookup,
  roomsFor,
  roundTo,
  tripCost,
  vehiclesFor,
  type PlanInput,
  type PlanItem,
  type PlannerDistrict,
  type PlannerPlace,
} from ".";

let data: PlannerData;
const district = (slug: string) => data.districts.find((d) => d.slug === slug)!;

beforeAll(async () => {
  data = await getPlannerData("en");
});

const sample = (over: Partial<PlanInput> = {}): PlanInput => ({
  start: district("dhaka").id,
  destinations: [district("coxs-bazar").id],
  places: [],
  optimize: true,
  returnToStart: true,
  people: 2,
  level: "mid",
  ...over,
});

describe("acceptance: Dhaka → Cox's Bazar, 2 people, mid, return (MASTER_PROMPT §5.4)", () => {
  it("matches every published figure", () => {
    const plan = buildPlan(sample(), data)!;
    expect(plan.days).toHaveLength(3);
    expect(plan.totalKm).toBe(840);
    expect(plan.legs.map((l) => l.km)).toEqual([420, 420]);
    expect(plan.legs.map((l) => l.farePerPerson)).toEqual([1930, 1930]);
    expect(plan.costs.transport).toBe(7720);
    expect(plan.costs.stay).toBe(6000);
    expect(plan.costs.food).toBe(5400);
    expect(plan.costs.local).toBe(1400);
    expect(plan.costs.misc).toBe(1650);
    expect(plan.costs.total).toBe(22200);
    expect(plan.costs.perPerson).toBe(11100);
  });

  it("travels on day 1, sees Cox's Bazar on day 2 and comes back on day 3", () => {
    const plan = buildPlan(sample(), data)!;
    const dhaka = district("dhaka").id;
    const cox = district("coxs-bazar").id;
    const [d1, d2, d3] = plan.days;
    expect(d1!.items.map((i) => i.type)).toEqual(["leg"]);
    expect(d1!.sleepIn).toBe(cox);
    expect(d2!.items.every((i) => i.type === "sight")).toBe(true);
    expect(d2!.items.length).toBeGreaterThan(0);
    expect(d2!.sleepIn).toBe(cox);
    expect(d3!.items).toEqual([expect.objectContaining({ type: "leg", from: cox, to: dhaka })]);
    expect(d3!.sleepIn).toBeNull();
    expect(d3!.endsIn).toBe(dhaka);
    expect(plan.nights).toBe(2);
    expect(plan.hotelNights).toBe(2);
    expect(plan.sightseeingDays).toBe(1);
    expect(plan.rooms).toBe(1);
    expect(plan.legs[0]!.hours).toBe(10.5);
  });

  it("picks the popular, short sights of Cox's Bazar, shortest first", () => {
    const plan = buildPlan(sample(), data)!;
    const cox = district("coxs-bazar").id;
    const slugs = plan.sights[cox]!.map((s) => data.places.find((p) => p.id === s.placeId)!.slug);
    expect(slugs).toEqual(["inani-beach", "coxs-bazar-sea-beach"]);
  });
});

describe("acceptance: trip cost calculator (MASTER_PROMPT §5.5)", () => {
  it("Dhaka → Cox's Bazar, 2 people, 2 nights, mid, round trip → ৳25,200", () => {
    const cost = tripCost({
      from: district("dhaka"),
      to: district("coxs-bazar"),
      people: 2,
      nights: 2,
      level: "mid",
      roundTrip: true,
    });
    expect(cost.km).toBe(420);
    expect(cost.days).toBe(3);
    expect(cost.farePerPerson).toBe(1930);
    expect(cost.costs).toEqual({
      transport: 7720,
      stay: 6000,
      food: 5400,
      local: 4200,
      misc: 1850,
      subtotal: 23320,
      total: 25200,
      perPerson: 12600,
    });
  });

  it("charges one way without the round trip, and a car per four people at the high level", () => {
    const base = { from: district("dhaka"), to: district("coxs-bazar"), nights: 0 } as const;
    const oneWay = tripCost({ ...base, people: 1, level: "low", roundTrip: false });
    expect(oneWay.legs).toBe(1);
    expect(oneWay.costs.transport).toBe(busFare(420, "low"));
    expect(oneWay.costs.stay).toBe(0);
    const car = tripCost({ ...base, people: 5, level: "high", roundTrip: true });
    expect(car.vehicles).toBe(2);
    expect(car.costs.transport).toBe(420 * 42 * 2 * 2);
  });

  it("clamps travellers to 1–30 and nights to 0–60", () => {
    const base = {
      from: district("dhaka"),
      to: district("sylhet"),
      level: "mid",
      roundTrip: true,
    } as const;
    expect(tripCost({ ...base, people: 0, nights: -3 }).days).toBe(1);
    expect(tripCost({ ...base, people: 99, nights: 99 }).rooms).toBe(15);
    expect(tripCost({ ...base, people: 99, nights: 99 }).days).toBe(61);
  });
});

/* Small fixtures for the rules ---------------------------------------------------------------- */

const D = (id: number, slug: string, lat: number, lng: number): PlannerDistrict => ({
  id,
  slug,
  lat,
  lng,
});

describe("leg distance and hours", () => {
  it("applies the road factor, +8 km, the 5 km grid and the 10 km minimum", () => {
    const a = D(1, "a", 23.0, 90.0);
    expect(estimateLegKm(a, D(2, "b", 23.0, 90.0001))).toBe(10);
    // 1° of latitude ≈ 111.19 km → × 1.3 + 8 = 152.5 → 155 (halves round up)
    expect(estimateLegKm(a, D(3, "c", 24.0, 90.0))).toBe(155);
    // hill tracts: × 1.45 + 8 = 169.2 → 170
    expect(estimateLegKm(a, D(4, "bandarban", 24.0, 90.0))).toBe(170);
    expect(estimateLegKm(D(5, "rangamati", 24.0, 90.0), a)).toBe(170);
  });

  it("prefers a real road distance when one is known", () => {
    const a = D(1, "a", 23.0, 90.0);
    const b = D(2, "b", 24.0, 90.0);
    const roads = roadKmLookup([[1, 2, 182.6]]);
    expect(legKm(a, b, roads)).toBe(185);
    expect(legKm(b, a, roads)).toBe(185);
    expect(legKm(a, D(3, "c", 24, 90), roads)).toBe(155);
    expect(legKm(a, a, roads)).toBe(0);
  });

  it("rounds hours to the nearest half: km / 42 + 0.5", () => {
    expect(legHours(420)).toBe(10.5);
    expect(legHours(100)).toBe(3); // 2.88
    expect(legHours(10)).toBe(0.5); // 0.74
    expect(legHours(0)).toBe(0);
  });
});

describe("costs", () => {
  it("rounds bus fares to 10 taka with an ৳80 floor", () => {
    expect(busFare(420, "mid")).toBe(1930);
    expect(busFare(420, "low")).toBe(1220);
    expect(busFare(10, "low")).toBe(80);
  });

  it("splits a hired car per person and counts rooms and cars", () => {
    expect(legCost(100, "high", 3)).toEqual({ cost: 4200, perPerson: 1400 });
    expect(legCost(100, "high", 5)).toEqual({ cost: 8400, perPerson: 1680 });
    expect(legCost(100, "mid", 3)).toEqual({ cost: 1380, perPerson: 460 });
    expect([1, 2, 3, 4, 5].map(roomsFor)).toEqual([1, 1, 2, 2, 3]);
    expect([1, 4, 5, 8, 9].map(vehiclesFor)).toEqual([1, 1, 2, 2, 3]);
  });

  it("rounds misc to 50 and the total to 100", () => {
    expect(roundTo(1641.6, 50)).toBe(1650);
    const c = finishCosts({ transport: 1000, stay: 0, food: 0, local: 0 }, 3);
    expect(c.misc).toBe(100); // 80 → 100
    expect(c.total).toBe(1100);
    expect(c.perPerson).toBe(367);
  });
});

describe("default sights", () => {
  const P = (id: number, popular: boolean, visitHours: number, stars = 500): PlannerPlace => ({
    id,
    districtId: 9,
    popular,
    visitHours,
    stars,
  });

  it("takes up to 3 popular places of at most 8 hours, best rated, then shortest first", () => {
    const places = [
      P(1, true, 4, 900),
      P(2, true, 24, 990),
      P(3, true, 2, 600),
      P(4, true, 8, 800),
      P(5, true, 1, 100),
      P(6, false, 1, 999),
    ];
    expect(defaultSights(places, 9).map((p) => p.id)).toEqual([3, 1, 4]);
  });

  it("falls back to places of at most 3 hours when no popular place fits", () => {
    const places = [P(1, true, 24), P(2, false, 3, 400), P(3, false, 5, 900), P(4, false, 1, 300)];
    expect(defaultSights(places, 9).map((p) => p.id)).toEqual([4, 2]);
    expect(defaultSights([P(1, false, 6)], 9)).toEqual([]);
  });

  it("uses the traveller's picks instead when there are any", () => {
    const plan = buildPlan(
      sample({ places: [data.places.find((p) => p.slug === "saint-martins-island")!.id] }),
      data,
    )!;
    const cox = district("coxs-bazar").id;
    expect(plan.sights[cox]!.map((s) => s.hours)).toEqual([24]);
  });
});

describe("day packing", () => {
  const leg = (from: number, to: number, hours: number): PlanItem => ({
    type: "leg",
    from,
    to,
    km: hours * 42,
    hours,
    farePerPerson: 0,
    cost: 0,
  });
  const sight = (placeId: number, districtId: number, hours: number): PlanItem => ({
    type: "sight",
    placeId,
    districtId,
    hours,
  });

  it("fits items into 9-hour days and sleeps where the day ends", () => {
    const days = packDays([leg(1, 2, 3), sight(10, 2, 2), sight(11, 2, 2.5), sight(12, 2, 1)], 1);
    // 3 + 2.5 + 3 = 8.5; the next sight (1.5) does not fit.
    expect(days).toHaveLength(2);
    expect(days[0]!.hours).toBe(8.5);
    expect(days[0]!.sleepIn).toBe(2);
    expect(days[1]!.items).toHaveLength(1);
    expect(days[1]!.sleepIn).toBeNull();
    expect(days[1]!.endsIn).toBe(2);
  });

  it("fills a day exactly to 9 hours", () => {
    const days = packDays([leg(1, 2, 5), sight(10, 2, 3.5)], 1);
    expect(days).toHaveLength(1);
    expect(days[0]!.hours).toBe(9);
  });

  it("caps a long leg at one day and starts it on a fresh day when the day is not empty", () => {
    const days = packDays([sight(10, 1, 1), leg(1, 2, 12), leg(2, 3, 2)], 1);
    expect(days.map((d) => d.hours)).toEqual([1.5, 9, 2]);
    expect(days.map((d) => d.sleepIn)).toEqual([1, 2, null]);
  });

  it("lets a sight longer than a day spill into the next days", () => {
    const days = packDays([leg(1, 2, 2), sight(10, 2, 24), leg(2, 1, 2)], 1);
    // The 24.5-hour sight does not fit after the leg: it starts day 2 and runs 9 | 9 | 6.5, then
    // the 2-hour way back still fits into day 4.
    expect(days.map((d) => d.hours)).toEqual([2, 9, 9, 8.5]);
    expect(days[1]!.items[0]).not.toHaveProperty("continued");
    expect(days[2]!.items[0]).toMatchObject({ type: "sight", continued: true });
    expect(days[3]!.items.map((i) => i.type)).toEqual(["sight", "leg"]);
    expect(days.map((d) => d.sleepIn)).toEqual([2, 2, 2, null]);
    expect(days[3]!.endsIn).toBe(1);
  });

  it("keeps an empty trip to one day", () => {
    expect(packDays([], 1)).toEqual([{ day: 1, items: [], hours: 0, sleepIn: null, endsIn: 1 }]);
  });
});

describe("plans", () => {
  it("returns null without a destination or with an unknown start", () => {
    expect(buildPlan(sample({ destinations: [] }), data)).toBeNull();
    expect(buildPlan(sample({ destinations: [district("dhaka").id] }), data)).toBeNull();
    expect(buildPlan(sample({ start: 999 }), data)).toBeNull();
  });

  it("does not charge a hotel for nights in the start district, and skips the way back when asked", () => {
    const oneWay = buildPlan(sample({ returnToStart: false }), data)!;
    expect(oneWay.legs).toHaveLength(1);
    expect(oneWay.totalKm).toBe(420);
    expect(oneWay.days.at(-1)!.endsIn).toBe(district("coxs-bazar").id);
    // Gazipur is next door: the sights fit on day 1 and the trip ends at home the same day.
    const short = buildPlan(sample({ destinations: [district("gazipur").id] }), data)!;
    expect(short.hotelNights).toBe(0);
    expect(short.costs.stay).toBe(0);
  });

  it("keeps the traveller's order when shortest order is off", () => {
    const ids = ["sylhet", "chattogram", "moulvibazar"].map((s) => district(s).id);
    const kept = buildPlan(sample({ destinations: ids, optimize: false }), data)!;
    expect(kept.order).toEqual(ids);
    const best = buildPlan(sample({ destinations: ids }), data)!;
    expect(best.totalKm).toBeLessThan(kept.totalKm);
  });

  it("uses a hired car at the high level", () => {
    const plan = buildPlan(sample({ level: "high", people: 5 }), data)!;
    expect(plan.vehicles).toBe(2);
    expect(plan.legs[0]!.cost).toBe(420 * 42 * 2);
    expect(plan.costs.stay).toBe(2 * 3 * 7000);
  });
});
