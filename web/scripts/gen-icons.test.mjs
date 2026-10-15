import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { buildModule, collectIcons, OUTPUT, parseIcon } from "./gen-icons.mjs";

describe("gen-icons", () => {
  it("parses an icon file", () => {
    const icon = parseIcon(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" role="img" aria-label="Home"><path d="M3 11l9-7"/></svg>\n',
    );
    expect(icon).toEqual({
      viewBox: "0 0 24 24",
      stroke: true,
      title: "Home",
      body: '<path d="M3 11l9-7"/>',
    });
  });

  it("collects the ui, kinds and kinds-badge icons", () => {
    const icons = collectIcons();
    expect(icons.home?.stroke).toBe(true);
    expect(icons["kinds/beach"]?.stroke).toBe(true);
    expect(icons["kinds-badge/beach"]?.stroke).toBe(false);
    expect(Object.keys(icons).filter((n) => n.startsWith("kinds/"))).toHaveLength(11);
  });

  it("icons.generated.ts is up to date (run `npm run icons`)", () => {
    expect(fs.readFileSync(OUTPUT, "utf8")).toBe(buildModule());
  });
});
