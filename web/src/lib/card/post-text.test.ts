import { describe, expect, it } from "vitest";
import { getT } from "@/i18n/messages";
import { buildPostText, percentOf, POST_STYLES, type PostData } from "./post-text";

const URL_ = "https://unseenbd.example/en/my-bangladesh?v=abc";

const bd: PostData = {
  map: "bangladesh",
  title: "Rahim's Bangladesh",
  count: 3,
  total: 64,
  names: ["Dhaka", "Sylhet", "Cox's Bazar"],
  level: "",
  hometown: "Sylhet",
  caption: "",
  url: URL_,
};

describe("percentOf", () => {
  it("rounds and uses the page's numerals", () => {
    expect(percentOf(13, 64, "en")).toBe("20%");
    expect(percentOf(64, 64, "en")).toBe("100%");
    expect(percentOf(0, 0, "en")).toBe("0%");
    expect(percentOf(13, 64, "bn")).toBe("২০%");
  });
});

describe("buildPostText", () => {
  const en = getT("en");
  const bn = getT("bn");

  it("builds all four styles with the link and hashtags", () => {
    for (const style of POST_STYLES) {
      const text = buildPostText(style, bd, en, "en");
      expect(text, style).toContain(URL_);
      expect(text, style).toContain("#UnseenBD");
      expect(text, style).not.toMatch(/[ \t]+$/m);
      expect(text, style).not.toMatch(/\n{3,}/);
    }
  });

  it("short: count, total and percent in one sentence", () => {
    const text = buildPostText("short", bd, en, "en");
    expect(text).toContain("3 of 64 districts");
    expect(text).toContain("(5%)");
    expect(text.split("\n\n")).toHaveLength(2);
  });

  it("detailed: every district name, the level and the hometown", () => {
    const names = Array.from({ length: 40 }, (_, i) => `District ${i + 1}`);
    const text = buildPostText(
      "detailed",
      { ...bd, count: 40, names, level: "Bangladesh Adventurer", caption: "Next: the hill tracts" },
      en,
      "en",
    );
    for (const name of names) expect(text).toContain(name);
    expect(text).toContain("Level: Bangladesh Adventurer");
    expect(text).toContain("Hometown: Sylhet");
    expect(text).toContain("Next: the hill tracts");
    expect(text).toContain("Rahim's Bangladesh: 40 of 64 districts (63%)");
  });

  it("stylish and emoji have their decorations", () => {
    const stylish = buildPostText("stylish", { ...bd, level: "Bangladesh Explorer" }, en, "en");
    expect(stylish).toContain("✦ Rahim's Bangladesh ✦");
    expect(stylish).toContain("★ Bangladesh Explorer");
    const emoji = buildPostText("emoji", bd, en, "en");
    expect(emoji).toContain("🇧🇩 Rahim's Bangladesh");
    expect(emoji.match(/📍/g)).toHaveLength(3);
    expect(emoji).toContain("🏠 Sylhet");
  });

  it("writes Bengali pages in Bengali, with Bengali numerals and hashtags", () => {
    const text = buildPostText("short", { ...bd, title: "আমার বাংলাদেশ" }, bn, "bn");
    expect(text).toContain("৬৪টি জেলার মধ্যে ৩টিতে");
    expect(text).toContain("(৫%)");
    expect(text).toContain("#আমার_বাংলাদেশ");
    expect(text).not.toMatch(/[0-9]+টি/);
  });

  it("uses the page language's list separator", () => {
    const ja = buildPostText("detailed", bd, getT("ja"), "ja");
    expect(ja).toContain("Dhaka、Sylhet、Cox's Bazar");
  });

  it("covers the world map: countries and the wish list", () => {
    const world: PostData = {
      map: "world",
      title: "My world",
      count: 1,
      total: 64,
      wish: 4,
      names: ["Nepal"],
      url: "https://unseenbd.example/en/world?v=NP",
    };
    expect(buildPostText("short", world, en, "en")).toContain("I have been to 1 country so far");
    const detailed = buildPostText(
      "detailed",
      { ...world, count: 2, names: ["Nepal", "India"] },
      en,
      "en",
    );
    expect(detailed).toContain("My world: 2 countries visited");
    expect(detailed).toContain("4 countries on my wish list");
    expect(detailed).toContain("Countries I have been to: Nepal, India");
    expect(detailed).toContain("#MyWorld");
    expect(buildPostText("emoji", world, en, "en")).toContain("🌍 My world");
  });

  it("still makes sense with nothing ticked", () => {
    const text = buildPostText("detailed", { ...bd, count: 0, names: [], hometown: "" }, en, "en");
    expect(text).toContain("0 of 64 districts");
    expect(text).not.toContain("Districts I have been to");
  });
});
