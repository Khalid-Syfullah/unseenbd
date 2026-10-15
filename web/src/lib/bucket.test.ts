import { beforeEach, describe, expect, it } from "vitest";
import { BUCKET_KEY, bucketCounts, parseBucket, setBucketStatus, toggled } from "./bucket";

describe("parseBucket", () => {
  it("reads a saved map and drops anything else", () => {
    expect(parseBucket('{"a":"want","b":"been","c":"nope","d":1}')).toEqual({
      a: "want",
      b: "been",
    });
  });
  it.each([null, "", "not json", "[]", "3", "null"])("treats %j as empty", (raw) => {
    expect(parseBucket(raw)).toEqual({});
  });
});

describe("toggled", () => {
  it("sets, switches and clears a status", () => {
    const one = toggled({}, "sajek", "want");
    expect(one).toEqual({ sajek: "want" });
    const two = toggled(one, "sajek", "been");
    expect(two).toEqual({ sajek: "been" });
    expect(toggled(two, "sajek", "been")).toEqual({});
    expect(one).toEqual({ sajek: "want" });
  });
});

describe("bucketCounts", () => {
  it("counts each status", () => {
    expect(bucketCounts({ a: "been", b: "want", c: "been" })).toEqual({ been: 2, want: 1 });
  });
});

describe("setBucketStatus", () => {
  beforeEach(() => window.localStorage.clear());
  it("writes to localStorage and clears the key when empty", () => {
    setBucketStatus("sajek", "want");
    expect(JSON.parse(window.localStorage.getItem(BUCKET_KEY)!)).toEqual({ sajek: "want" });
    setBucketStatus("sajek", "want");
    expect(window.localStorage.getItem(BUCKET_KEY)).toBeNull();
  });
});
