import { describe, expect, it } from "vitest";
import { MENU_SECTIONS, isActivePath, stripLocale, TAB_ITEMS } from "./nav";

describe("stripLocale", () => {
  it("removes a locale prefix", () => {
    expect(stripLocale("/en/explore")).toBe("/explore");
    expect(stripLocale("/en")).toBe("/");
    expect(stripLocale("/bn/plan")).toBe("/plan");
    expect(stripLocale("/ja/place/sajek-valley")).toBe("/place/sajek-valley");
  });

  it("leaves un-prefixed paths alone", () => {
    expect(stripLocale("/explore")).toBe("/explore");
    expect(stripLocale("/")).toBe("/");
    expect(stripLocale("")).toBe("/");
    expect(stripLocale(null)).toBe("/");
    expect(stripLocale("/english-food")).toBe("/english-food");
  });

  it("drops the query and hash", () => {
    expect(stripLocale("/en/explore?kind=hill#map")).toBe("/explore");
  });
});

describe("isActivePath", () => {
  it("matches Home only on the root", () => {
    expect(isActivePath("/", "/")).toBe(true);
    expect(isActivePath("/", "/en")).toBe(true);
    expect(isActivePath("/", "/explore")).toBe(false);
  });

  it("matches a section and the pages below it", () => {
    expect(isActivePath("/explore", "/en/explore")).toBe(true);
    expect(isActivePath("/plan", "/plan/123")).toBe(true);
    expect(isActivePath("/plan", "/planet")).toBe(false);
  });
});

describe("navigation config", () => {
  it("has the five tabs from DESIGN.md §4.2", () => {
    expect(TAB_ITEMS.map((t) => t.path)).toEqual([
      "/",
      "/my-bangladesh",
      "/explore",
      "/plan",
      "/gallery",
    ]);
  });

  it("puts every FEATURES.md §1.2 section in the menu", () => {
    const paths = MENU_SECTIONS.flatMap((s) => s.items.map((i) => i.path));
    expect(paths).toHaveLength(16);
    for (const path of [
      "/",
      "/my-bangladesh",
      "/explore",
      "/plan",
      "/gallery",
      "/world",
      "/upload",
      "/unseen",
      "/routes",
      "/trains",
      "/play",
      "/safety",
      "/about",
      "/about#privacy",
      "/profile",
      "/my-listings",
    ]) {
      expect(paths).toContain(path);
    }
  });
});
