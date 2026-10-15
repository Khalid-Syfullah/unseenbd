import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ChallengePage from "@/app/[lang]/challenge/page";
import MyBangladeshPage from "@/app/[lang]/my-bangladesh/page";
import WorldPage from "@/app/[lang]/world/page";
import type { Locale } from "@/i18n/locales";
import { getT } from "@/i18n/messages";
import { encodeDistrictIds, VISITED_KEY, WORLD_KEY, WORLD_PINS_KEY } from "@/lib/visited";
import { renderWithI18n } from "./i18n";

const en = getT("en");
const bn = getT("bn");
type Query = Record<string, string>;

async function show(
  Page: typeof MyBangladeshPage | typeof WorldPage | typeof ChallengePage,
  lang: Locale,
  query: Query = {},
) {
  const ui = await Page({
    params: Promise.resolve({ lang }),
    searchParams: Promise.resolve(query),
  });
  return renderWithI18n(ui, { locale: lang });
}

/** The map's button for a district (its accessible name is "District, Division"). */
const mapDistrict = (name: string) =>
  screen.getByRole("button", { name: new RegExp(`^${name}, `) });
const stored = (key: string) => JSON.parse(window.localStorage.getItem(key) ?? "null");

beforeEach(() => window.localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("/my-bangladesh", () => {
  it("ticks districts from chips and the map, saves them and announces pressed state", async () => {
    const user = userEvent.setup();
    await show(MyBangladeshPage, "en");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(en("myBd.title"));
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");

    const chip = screen.getByRole("button", { name: "Sylhet" });
    expect(chip).toHaveAttribute("aria-pressed", "false");
    await user.click(chip);
    expect(screen.getByRole("button", { name: "Sylhet" })).toHaveAttribute("aria-pressed", "true");
    expect(mapDistrict("Sylhet")).toHaveAttribute("aria-pressed", "true");
    expect(stored(VISITED_KEY)).toEqual([28]);

    // Tapping the map toggles too.
    await user.click(mapDistrict("Dhaka"));
    expect(mapDistrict("Dhaka")).toHaveAttribute("aria-pressed", "true");
    expect(stored(VISITED_KEY)).toEqual([1, 28]);
    await user.click(mapDistrict("Dhaka"));
    expect(mapDistrict("Dhaka")).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");
  });

  it("ticks a whole division and shows level, ladder and stamps", async () => {
    const user = userEvent.setup();
    await show(MyBangladeshPage, "en");
    await user.click(screen.getByRole("button", { name: `${en("myBd.wholeDivision")}: Dhaka` }));
    expect(stored(VISITED_KEY)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
    expect(screen.getByText("13 / 64")).toBeInTheDocument();
    expect(
      screen.getByText(en("myBd.level", { level: "Bangladesh Explorer" })),
    ).toBeInTheDocument();
    expect(screen.getAllByText(en("myBd.levelReached"))).toHaveLength(1);
    expect(screen.getByAltText(en("myBd.stampDone", { name: "Gazipur" }))).toBeInTheDocument();
    expect(screen.getByAltText(en("myBd.stampLocked", { name: "Sylhet" }))).toHaveClass(
      "opacity-15",
    );
    expect(screen.getByText(en("myBd.passportNote"))).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: `${en("myBd.clearDivision")}: Dhaka` }));
    expect(window.localStorage.getItem(VISITED_KEY)).toBeNull();
  });

  it("restores ticks after a reload and follows other tabs", async () => {
    window.localStorage.setItem(VISITED_KEY, "[19]");
    const first = await show(MyBangladeshPage, "en");
    await waitFor(() => expect(mapDistrict("Cox's Bazar")).toHaveAttribute("aria-pressed", "true"));
    first.unmount();

    await show(MyBangladeshPage, "en");
    expect(mapDistrict("Cox's Bazar")).toHaveAttribute("aria-pressed", "true");
    act(() => {
      window.localStorage.setItem(VISITED_KEY, "[19,28]");
      window.dispatchEvent(new StorageEvent("storage", { key: VISITED_KEY }));
    });
    expect(mapDistrict("Sylhet")).toHaveAttribute("aria-pressed", "true");
  });

  it("searches districts in either language", async () => {
    const user = userEvent.setup();
    await show(MyBangladeshPage, "en");
    await user.type(screen.getByRole("searchbox", { name: en("myBd.searchLabel") }), "সিলেট");
    const results = screen.getByRole("group", { name: en("myBd.searchResults") });
    expect(within(results).getByRole("button", { name: "Sylhet" })).toBeInTheDocument();
  });

  it("keeps the story in this browser", async () => {
    const user = userEvent.setup();
    await show(MyBangladeshPage, "en");
    await user.selectOptions(screen.getByLabelText(en("myBd.storyBirth")), "28");
    expect(stored("unseenbd.story")).toEqual({ birth: 28 });
    await user.click(screen.getByRole("button", { name: en("myBd.storyAdd") }));
    expect(stored(VISITED_KEY)).toEqual([28]);
  });

  it("makes a short link and shows it", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(VISITED_KEY, "[1,28]");
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ code: "Ab3dEf" }), { status: 201 }));
    await show(MyBangladeshPage, "en");
    await user.type(screen.getByLabelText(en("myBd.nameLabel")), "Rahim");
    await user.click(await screen.findByRole("button", { name: en("myBd.shortLink") }));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/share",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ ids: [1, 28], name: "Rahim" }),
      }),
    );
    expect(
      await screen.findByDisplayValue("http://localhost:3000/en/s/Ab3dEf"),
    ).toBeInTheDocument();
    expect(screen.getByText(en("myBd.privacy"))).toBeInTheDocument();
  });

  it("disables sharing until a district is ticked and leaves the card-maker slot", async () => {
    const { container } = await show(MyBangladeshPage, "en");
    expect(screen.getByRole("button", { name: en("myBd.shortLink") })).toBeDisabled();
    expect(screen.getByText(en("myBd.shareEmpty"))).toBeInTheDocument();
    expect(container.querySelector('[data-slot="card-maker"]')).not.toBeNull();
  });

  it("shows a shared link read-only, with Make your own", async () => {
    await show(MyBangladeshPage, "en", { v: encodeDistrictIds([1, 19, 28]), n: "Rahim" });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Rahim's Bangladesh");
    expect(screen.getAllByText("Rahim has seen 3 districts").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: en("myBd.makeOwn") })).toHaveAttribute(
      "href",
      "/en/my-bangladesh",
    );
    // Read-only: the map is a picture, not buttons.
    expect(screen.queryByRole("button", { name: /^Sylhet, / })).toBeNull();
    expect(screen.getByRole("link", { name: "Cox's Bazar" })).toBeInTheDocument();
    expect(window.localStorage.getItem(VISITED_KEY)).toBeNull();
  });

  it("speaks Bengali at the root", async () => {
    await show(MyBangladeshPage, "bn", { v: encodeDistrictIds([1, 2]), n: "রহিম" });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      bn("myBd.sharedTitle", { name: "রহিম" }),
    );
    expect(screen.getAllByText(bn("myBd.sharedLine", { name: "রহিম", count: 2 })).length).toBe(2);
  });
});

describe("/challenge", () => {
  it("shows the friend's districts and compares with yours", async () => {
    window.localStorage.setItem(VISITED_KEY, "[1,5]");
    await show(ChallengePage, "en", { c: encodeDistrictIds([1, 2, 3]), n: "Mitu" });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Mitu challenges you");
    expect(await screen.findByText(en("challenge.you", { count: 2 }))).toBeInTheDocument();
    expect(screen.getByText(en("challenge.both", { count: 1 }))).toBeInTheDocument();
    expect(screen.getByText(en("challenge.behind", { count: 1 }))).toBeInTheDocument();
    expect(screen.getByRole("link", { name: en("challenge.cta") })).toHaveAttribute(
      "href",
      "/en/my-bangladesh",
    );
  });

  it("handles an empty link", async () => {
    await show(ChallengePage, "en");
    expect(screen.getByText(en("challenge.empty"))).toBeInTheDocument();
  });
});

describe("/world", () => {
  it("marks countries from the list and the map, with counts per continent", async () => {
    const user = userEvent.setup();
    await show(WorldPage, "en");
    await user.type(screen.getByRole("searchbox", { name: en("world.searchLabel") }), "Nepal");
    const nepal = () => within(screen.getByRole("group", { name: "Nepal" }));
    await user.click(nepal().getByRole("button", { name: en("map.visited") }));
    expect(stored(WORLD_KEY)).toEqual({ NP: "visited" });
    expect(screen.getAllByText(en("world.visitedCount", { count: 1 })).length).toBeGreaterThan(0);

    await user.click(nepal().getByRole("button", { name: en("map.wish") }));
    expect(stored(WORLD_KEY)).toEqual({ NP: "wish" });
    expect(nepal().getByRole("button", { name: en("map.wish") })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: /^Nepal: / })).toHaveAttribute("data-state", "wish");

    // The map: "Visited" mode paints, "Clear" mode clears.
    await user.click(screen.getByRole("button", { name: /^Japan: / }));
    expect(stored(WORLD_KEY)).toEqual({ NP: "wish", JP: "visited" });
    expect(screen.getByRole("button", { name: /^Japan: / })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await user.click(screen.getByRole("radio", { name: en("world.modeClear") }));
    await user.click(screen.getByRole("button", { name: /^Japan: / }));
    expect(stored(WORLD_KEY)).toEqual({ NP: "wish" });

    const asia = screen.getByText(en("world.asia")).closest("li")!;
    expect(within(asia).getByText(en("world.continentWish", { count: 1 }))).toBeInTheDocument();
  });

  it("pins a travel memory", async () => {
    const user = userEvent.setup();
    await show(WorldPage, "en");
    await user.click(screen.getByRole("button", { name: en("world.pinAdd") }));
    expect(screen.getByText(en("world.pinNeedCountry"))).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText(en("world.pinCountry")), "NP");
    await user.type(screen.getByLabelText(en("world.pinNote")), "Sunrise at Nagarkot");
    await user.click(screen.getByRole("button", { name: en("world.pinAdd") }));
    expect(await screen.findByText("Sunrise at Nagarkot")).toBeInTheDocument();
    expect(stored(WORLD_PINS_KEY)).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: en("world.pinRemove") }));
    expect(window.localStorage.getItem(WORLD_PINS_KEY)).toBeNull();
  });

  it("shows a shared world link read-only", async () => {
    await show(WorldPage, "en", { v: "BDNP", w: "JP", n: "Mitu" });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Mitu's world");
    expect(screen.getByText(/Mitu has been to 2 countries/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: en("world.makeOwn") })).toHaveAttribute(
      "href",
      "/en/world",
    );
    expect(screen.queryByRole("button", { name: /^Japan: / })).toBeNull();
  });
});
