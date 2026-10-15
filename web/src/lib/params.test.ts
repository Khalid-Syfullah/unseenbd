import { describe, expect, it } from "vitest";
import { firstParam, flagParam, pageParam } from "./params";

describe("query parameters", () => {
  it("takes the first value", () => {
    expect(firstParam(["a", "b"])).toBe("a");
    expect(firstParam("a")).toBe("a");
    expect(firstParam(undefined)).toBe("");
  });
  it("reads a page number, defaulting to 1", () => {
    expect(pageParam("3")).toBe(3);
    expect(pageParam(["2", "9"])).toBe(2);
    for (const bad of [undefined, "", "0", "-1", "1.5", "x"]) expect(pageParam(bad)).toBe(1);
  });
  it("reads a switch", () => {
    expect(flagParam("1")).toBe(true);
    expect(flagParam("TRUE")).toBe(true);
    expect(flagParam("0")).toBe(false);
    expect(flagParam(undefined)).toBe(false);
  });
});
