import { describe, expect, it } from "vitest";
import {
  districtResolver,
  parsePlanQuery,
  parseTripCostQuery,
  planQuery,
  tripCostQuery,
} from "./url";

const resolve = districtResolver([
  { id: 1, slug: "dhaka" },
  { id: 14, slug: "bandarban" },
  { id: 19, slug: "coxs-bazar" },
  { id: 28, slug: "sylhet" },
]);

describe("planner URL state", () => {
  it("reads the documented query and writes it back unchanged", () => {
    const q = "from=1&to=19,14&people=2&level=mid&ret=1&order=1";
    const input = parsePlanQuery(new URLSearchParams(q), { resolve, defaultStart: 1 });
    expect(input).toEqual({
      start: 1,
      destinations: [19, 14],
      places: [],
      optimize: true,
      returnToStart: true,
      people: 2,
      level: "mid",
      add: [],
    });
    expect(planQuery(input)).toBe(q);
  });

  it("uses defaults for a bare URL and drops junk", () => {
    const input = parsePlanQuery(
      { from: "nowhere", to: "19,x,19,1,999", people: "500", level: "lux", ret: "0", order: "off" },
      { resolve, defaultStart: 1 },
    );
    expect(input.start).toBe(1);
    expect(input.destinations).toEqual([19]);
    expect(input.people).toBe(30);
    expect(input.level).toBe("mid");
    expect(input.returnToStart).toBe(false);
    expect(input.optimize).toBe(false);
    expect(parsePlanQuery({}, { resolve, defaultStart: 1 })).toMatchObject({
      destinations: [],
      people: 2,
      returnToStart: true,
      optimize: true,
    });
  });

  it("appends `add` districts by slug or id", () => {
    const input = parsePlanQuery(
      { to: "28", add: "coxs-bazar", places: "3,3,7" },
      { resolve, defaultStart: 1 },
    );
    expect(input.destinations).toEqual([28, 19]);
    expect(input.add).toEqual([19]);
    expect(input.places).toEqual([3, 7]);
    expect(planQuery(input)).toBe("from=1&to=28,19&people=2&level=mid&ret=1&order=1&places=3,7");
  });
});

describe("trip cost URL state", () => {
  it("round-trips and keeps the destination apart from the start", () => {
    const state = parseTripCostQuery(
      new URLSearchParams("from=dhaka&to=19&people=3&nights=4&level=high&ret=0"),
      { resolve, defaultFrom: 1 },
    );
    expect(state).toEqual({
      from: 1,
      to: 19,
      people: 3,
      nights: 4,
      level: "high",
      roundTrip: false,
    });
    expect(tripCostQuery(state)).toBe("from=1&to=19&people=3&nights=4&level=high&ret=0");
    expect(parseTripCostQuery({ to: "1" }, { resolve, defaultFrom: 1 }).to).toBeNull();
    expect(parseTripCostQuery({ nights: "61" }, { resolve, defaultFrom: 1 }).nights).toBe(60);
  });
});
