import { describe, expect, it } from "vitest";
import {
  checklistGroup,
  embedSnippet,
  ESSENTIALS,
  mapsSearchUrl,
  oneDayTrip,
  type DayStop,
} from "./place";

const stop = (slug: string, visitHours: number): DayStop => ({ slug, name: slug, visitHours });

describe("place helpers", () => {
  it("has the seven essentials and builds Maps searches around the point", () => {
    expect(ESSENTIALS).toHaveLength(7);
    const url = mapsSearchUrl("hotels", 21.9, 92.3);
    expect(url).toBe("https://www.google.com/maps/search/hotels/@21.9,92.3,15z");
  });

  it("escapes the name in the embed snippet", () => {
    const code = embedSnippet('A "quoted" <place>', 22.1, 91.2);
    expect(code).toContain("<iframe");
    expect(code).toContain("q=22.1,91.2");
    expect(code).toContain("&quot;quoted&quot; &lt;place&gt;");
    expect(code).not.toContain("<place>");
  });

  it("groups kinds for the checklist", () => {
    expect(checklistGroup("beach")).toBe("water");
    expect(checklistGroup("waterfall")).toBe("trek");
    expect(checklistGroup("spiritual")).toBe("culture");
    expect(checklistGroup("tea")).toBe("town");
  });

  it("builds a day trip of at most three stops within the hour limit", () => {
    const trip = oneDayTrip(stop("a", 4), [stop("b", 3), stop("c", 5), stop("d", 2), stop("e", 1)]);
    expect(trip.stops.map((s) => s.slug)).toEqual(["a", "b", "d"]);
    expect(trip.hours).toBe(9);
  });

  it("returns nothing when no neighbour fits", () => {
    expect(oneDayTrip(stop("a", 9), [stop("b", 3)]).stops).toEqual([]);
    expect(oneDayTrip(stop("a", 2), []).stops).toEqual([]);
  });
});
