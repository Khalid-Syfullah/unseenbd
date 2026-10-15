import { describe, expect, it } from "vitest";
import { contentLocale, localePath } from "./locales";
import { resolveLocaleRoute } from "./routing";

describe("resolveLocaleRoute", () => {
  it("rewrites un-prefixed paths to bn", () => {
    expect(resolveLocaleRoute("/")).toEqual({ action: "rewrite", pathname: "/bn" });
    expect(resolveLocaleRoute("/explore")).toEqual({ action: "rewrite", pathname: "/bn/explore" });
    expect(resolveLocaleRoute("/district/sylhet")).toEqual({
      action: "rewrite",
      pathname: "/bn/district/sylhet",
    });
  });

  it("leaves prefixed locales alone", () => {
    for (const p of ["/en", "/en/explore", "/zh", "/fr/plan", "/de", "/it/x", "/ja"]) {
      expect(resolveLocaleRoute(p)).toEqual({ action: "next" });
    }
  });

  it("does not mistake a path that merely starts like a locale", () => {
    expect(resolveLocaleRoute("/english")).toEqual({ action: "rewrite", pathname: "/bn/english" });
    expect(resolveLocaleRoute("/bnx")).toEqual({ action: "rewrite", pathname: "/bn/bnx" });
  });

  it("redirects /bn/… to the un-prefixed URL", () => {
    expect(resolveLocaleRoute("/bn")).toEqual({ action: "redirect", pathname: "/" });
    expect(resolveLocaleRoute("/bn/")).toEqual({ action: "redirect", pathname: "/" });
    expect(resolveLocaleRoute("/bn/explore")).toEqual({ action: "redirect", pathname: "/explore" });
  });
});

describe("locale helpers", () => {
  it("builds public paths", () => {
    expect(localePath("bn", "/")).toBe("/");
    expect(localePath("bn", "/explore")).toBe("/explore");
    expect(localePath("en", "/")).toBe("/en");
    expect(localePath("ja", "/plan")).toBe("/ja/plan");
  });

  it("falls back to English content for interface-only locales", () => {
    expect(contentLocale("bn")).toBe("bn");
    expect(contentLocale("en")).toBe("en");
    expect(contentLocale("zh")).toBe("en");
    expect(contentLocale("ja")).toBe("en");
  });
});
