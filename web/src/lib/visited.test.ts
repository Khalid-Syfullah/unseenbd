import { describe, expect, it } from "vitest";
import { parseVisited } from "./visited";

describe("parseVisited", () => {
  it("reads a list of slugs and drops duplicates", () => {
    expect(parseVisited('["dhaka","sylhet","dhaka"]')).toEqual(["dhaka", "sylhet"]);
  });

  it("ignores anything that is not a list of strings", () => {
    expect(parseVisited(null)).toEqual([]);
    expect(parseVisited("")).toEqual([]);
    expect(parseVisited("{not json")).toEqual([]);
    expect(parseVisited('{"a":1}')).toEqual([]);
    expect(parseVisited('["dhaka",3,null,""]')).toEqual(["dhaka"]);
  });
});
