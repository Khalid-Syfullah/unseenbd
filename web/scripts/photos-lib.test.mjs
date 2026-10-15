import { describe, expect, it } from "vitest";
import { backoffMs, commonsTitle, creditFrom, downloadUrl, stripHtml } from "./photos-lib.mjs";

describe("photos-lib", () => {
  it("reads the file title from a Commons page URL", () => {
    expect(
      commonsTitle("https://commons.wikimedia.org/wiki/File:Nilgiri_Hill_Resort,_Nilgiri_(1).jpg"),
    ).toBe("File:Nilgiri Hill Resort, Nilgiri (1).jpg");
    expect(commonsTitle("https://commons.wikimedia.org/wiki/File:A%26B.jpg")).toBe("File:A&B.jpg");
  });

  it("rejects anything that is not a Commons file page", () => {
    expect(commonsTitle("https://unseenbd.com/x.jpg")).toBeNull();
    expect(commonsTitle("https://commons.wikimedia.org/wiki/Category:Dhaka")).toBeNull();
    expect(commonsTitle("not a url")).toBeNull();
  });

  it("strips markup from metadata", () => {
    expect(stripHtml('<a href="x">Moheen &amp; Co</a>\n')).toBe("Moheen & Co");
  });

  it("builds the credit, falling back to places.json", () => {
    const info = { extmetadata: { Artist: { value: '<a href="u">Jane</a>' } } };
    expect(creditFrom(info, { by: "X", license: "CC BY 4.0" })).toEqual({
      author: "Jane",
      license: "CC BY 4.0",
      license_url: "",
    });
    expect(creditFrom(undefined, { by: "X" }).author).toBe("X");
  });

  it("prefers the thumbnail and backs off exponentially", () => {
    expect(downloadUrl({ thumburl: "t", url: "u" })).toBe("t");
    expect(downloadUrl({ url: "u" })).toBe("u");
    expect(backoffMs(0)).toBe(2000);
    expect(backoffMs(10)).toBe(60_000);
  });
});
