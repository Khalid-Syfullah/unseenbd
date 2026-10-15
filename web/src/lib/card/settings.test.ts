import { describe, expect, it } from "vitest";
import { exportName } from "./export";
import { DEFAULT_SETTINGS, MAX_TRIP_PINS, parseCardSettings } from "./settings";

describe("parseCardSettings", () => {
  it("falls back to the defaults for missing or broken data", () => {
    expect(parseCardSettings(null)).toBe(DEFAULT_SETTINGS);
    expect(parseCardSettings("not json")).toBe(DEFAULT_SETTINGS);
    expect(parseCardSettings("[1,2]")).toBe(DEFAULT_SETTINGS);
    expect(parseCardSettings('{"type":"poster","theme":"neon","size":"a4"}')).toMatchObject({
      type: "map",
      theme: "mist",
      size: "square",
    });
  });

  it("keeps valid choices", () => {
    const saved = {
      type: "passport",
      theme: "jamdani",
      size: "story",
      labelSize: "large",
      fill: "photos",
      zoomHometown: true,
      caption: "Hello",
      hometown: "sylhet",
      pins: [{ region: "coxs-bazar", date: "2026-01-02", note: "Sunset" }],
      postStyle: "emoji",
      showMemories: false,
    };
    expect(parseCardSettings(JSON.stringify(saved))).toEqual(saved);
  });

  it("cleans trip pins: valid regions only, dates as ISO, short notes, at most six", () => {
    const pins = [
      { region: "dhaka", date: "yesterday", note: "  lots   of   space  " },
      { region: "<script>", date: "", note: "" },
      { region: "NP", date: "2026-02-03", note: "x".repeat(200) },
      ...Array.from({ length: 10 }, () => ({ region: "sylhet", date: "", note: "" })),
    ];
    const parsed = parseCardSettings(JSON.stringify({ pins }));
    expect(parsed.pins).toHaveLength(MAX_TRIP_PINS);
    expect(parsed.pins[0]).toEqual({ region: "dhaka", date: "", note: "lots of space" });
    expect(parsed.pins[1]!.region).toBe("NP");
    expect(parsed.pins[1]!.note.length).toBe(60);
  });

  it("keeps the hometown choice: auto, none or a district", () => {
    expect(parseCardSettings("{}").hometown).toBe("auto");
    expect(parseCardSettings('{"hometown":""}').hometown).toBe("");
    expect(parseCardSettings('{"hometown":"Bad Value"}').hometown).toBe("auto");
  });
});

describe("exportName", () => {
  it("makes safe file names", () => {
    expect(exportName(["bangladesh", "map", "square"], "png")).toBe(
      "unseen-bd-bangladesh-map-square.png",
    );
    expect(exportName(["World", "Map / 360"], "webm")).toBe("unseen-bd-world-map-360.webm");
    expect(exportName([], "png")).toBe("unseen-bd-card.png");
  });
});
