import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { noopSyncAdapter } from "./sync";
import {
  addPin,
  clearWorld,
  getWorldMarks,
  MAX_PINS,
  parsePins,
  parseWorld,
  removePin,
  setCountryMark,
  setWorldSyncAdapter,
  useMemoryPins,
  useWorldMarks,
  WORLD_KEY,
  WORLD_PINS_KEY,
} from "./world";

beforeEach(() => {
  window.localStorage.clear();
  setWorldSyncAdapter(noopSyncAdapter());
});

describe("world marks", () => {
  it("parses only valid keys and marks", () => {
    expect(parseWorld('{"BD":"visited","NP":"wish","XX1":"visited","IN":"maybe"}')).toEqual({
      BD: "visited",
      NP: "wish",
    });
    expect(parseWorld("[1]")).toEqual({});
  });

  it("marks, re-marks and clears countries, saved per ISO2", () => {
    setCountryMark("BD", "visited");
    setCountryMark("NP", "wish");
    expect(JSON.parse(window.localStorage.getItem(WORLD_KEY)!)).toEqual({
      BD: "visited",
      NP: "wish",
    });
    setCountryMark("NP", "visited");
    setCountryMark("BD", null);
    expect(getWorldMarks()).toEqual({ NP: "visited" });
    clearWorld();
    expect(window.localStorage.getItem(WORLD_KEY)).toBeNull();
  });

  it("pushes changes to the adapter", () => {
    const push = vi.fn();
    setWorldSyncAdapter({ connect: () => undefined, push });
    setCountryMark("BD", "visited");
    setCountryMark("BD", "wish");
    setCountryMark("BD", null);
    expect(push.mock.calls).toEqual([
      [{ set: { BD: "visited" }, clear: [] }],
      [{ set: { BD: "wish" }, clear: [] }],
      [{ set: {}, clear: ["BD"] }],
    ]);
  });

  it("stays in step with other tabs", () => {
    const { result } = renderHook(() => useWorldMarks());
    act(() => {
      window.localStorage.setItem(WORLD_KEY, '{"JP":"wish"}');
      window.dispatchEvent(new StorageEvent("storage", { key: WORLD_KEY }));
    });
    expect(result.current).toEqual({ JP: "wish" });
  });
});

describe("memory pins", () => {
  it("adds pins newest first and removes them", () => {
    const { result } = renderHook(() => useMemoryPins());
    act(() => {
      addPin({ country: "NP", date: "2025-04-01", note: " Sunrise " });
      addPin({ country: "BT", date: "not a date", note: "" });
    });
    expect(result.current.map((p) => [p.country, p.date, p.note])).toEqual([
      ["BT", "", ""],
      ["NP", "2025-04-01", "Sunrise"],
    ]);
    act(() => removePin(result.current[0]!.id));
    expect(result.current).toHaveLength(1);
    expect(parsePins(window.localStorage.getItem(WORLD_PINS_KEY))).toHaveLength(1);
  });

  it("refuses pins without a country and caps the list", () => {
    expect(addPin({ country: "", date: "", note: "x" })).toBe(false);
    const many = Array.from({ length: MAX_PINS }, (_, i) => ({
      id: `p${i}`,
      country: "BD",
      date: "",
      note: "",
    }));
    window.localStorage.setItem(WORLD_PINS_KEY, JSON.stringify(many));
    expect(addPin({ country: "IN", date: "", note: "" })).toBe(false);
  });
});
