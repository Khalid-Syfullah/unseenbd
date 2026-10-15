import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BestPlacesPage from "@/app/[lang]/best-places/page";
import BucketListPage from "@/app/[lang]/bucket-list/page";
import ExplorePage from "@/app/[lang]/explore/page";
import KindPage from "@/app/[lang]/kind/[kind]/page";
import MonthPage from "@/app/[lang]/month/[month]/page";
import NearMePage from "@/app/[lang]/near-me/page";
import SearchPage from "@/app/[lang]/search/page";
import UnseenPage from "@/app/[lang]/unseen/page";
import type { Locale } from "@/i18n/locales";
import { getT } from "@/i18n/messages";
import { BUCKET_KEY } from "@/lib/bucket";
import { renderWithI18n } from "./i18n";

const push = vi.fn();
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push, replace: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
}));

const en = getT("en");
const bn = getT("bn");
type Query = Record<string, string | string[] | undefined>;

async function show(
  Page: (props: never) => Promise<React.ReactElement>,
  props: { lang: Locale; query?: Query; extra?: Record<string, string> },
) {
  const ui = await (Page as (p: unknown) => Promise<React.ReactElement>)({
    params: Promise.resolve({ lang: props.lang, ...props.extra }),
    searchParams: Promise.resolve(props.query ?? {}),
  });
  return renderWithI18n(ui, { locale: props.lang });
}

const cardTitles = () =>
  screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent ?? "");

beforeEach(() => {
  push.mockClear();
  window.localStorage.clear();
});

describe("/explore", () => {
  it("renders the filters, map, results and districts by division", async () => {
    await show(ExplorePage, { lang: "en" });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(en("explore.title"));
    expect(screen.getByRole("search")).toBeInTheDocument();
    expect(screen.getByLabelText(en("common.district"))).toBeInTheDocument();
    expect(screen.getByLabelText(en("common.kind"))).toBeInTheDocument();
    expect(screen.getByLabelText(en("common.month"))).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: en("common.onlyUnseen") })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /, / }).length).toBeGreaterThanOrEqual(64);
    // 24 cards per page
    expect(screen.getAllByRole("article")).toHaveLength(24);
    expect(screen.getByRole("navigation", { name: en("ui.pagination") })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: en("explore.districtsTitle") })).toBeInTheDocument();
  });

  it("reflects the URL in the controls, the map and the results", async () => {
    await show(ExplorePage, {
      lang: "en",
      query: { district: "sylhet", kind: "waterfall", unseen: "1", q: "fall" },
    });
    expect(screen.getByLabelText(en("common.district"))).toHaveValue("sylhet");
    expect(screen.getByLabelText(en("common.kind"))).toHaveValue("waterfall");
    expect(screen.getByRole("switch", { name: en("common.onlyUnseen") })).toBeChecked();
    expect(screen.getByRole("searchbox")).toHaveValue("fall");
    expect(screen.getByRole("button", { name: "Sylhet, Sylhet" })).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  it("accepts a district id and ignores values it does not know", async () => {
    await show(ExplorePage, {
      lang: "en",
      query: { district: "3", kind: "nonsense", month: "13", page: "zzz" },
    });
    expect(screen.getByLabelText(en("common.district"))).not.toHaveValue("");
    expect(screen.getByLabelText(en("common.kind"))).toHaveValue("");
    expect(screen.getByLabelText(en("common.month"))).toHaveValue("");
  });

  it("finds a place by its Bengali and by its English name", async () => {
    const { unmount } = await show(ExplorePage, { lang: "en", query: { q: "সাজেক" } });
    expect(cardTitles()).toContain("Sajek Valley");
    unmount();
    await show(ExplorePage, { lang: "bn", query: { q: "sajek" } });
    expect(cardTitles()).toContain("সাজেক ভ্যালি");
  });

  it("shows an empty state with a way out when nothing matches", async () => {
    await show(ExplorePage, { lang: "en", query: { q: "qqqqzzzz" } });
    expect(screen.getAllByText(en("common.noResults")).length).toBeGreaterThan(0);
    expect(screen.queryAllByRole("article")).toHaveLength(0);
    expect(screen.getAllByRole("link", { name: en("common.clearFilters") })[0]).toHaveAttribute(
      "href",
      "/en/explore",
    );
  });

  it("pages through the results with links that keep the filters", async () => {
    await show(ExplorePage, { lang: "en", query: { month: "11" } });
    const next = screen.getByRole("link", { name: new RegExp(en("common.next")) });
    expect(next).toHaveAttribute("href", "/en/explore?month=11&page=2");
    expect(screen.getByRole("navigation", { name: en("ui.pagination") })).toBeInTheDocument();
  });

  it("writes every change to the URL", async () => {
    const user = userEvent.setup();
    await show(ExplorePage, { lang: "en", query: { kind: "hill" } });

    await user.selectOptions(screen.getByLabelText(en("common.month")), "11");
    expect(push).toHaveBeenLastCalledWith("/en/explore?kind=hill&month=11", { scroll: false });

    await user.click(screen.getByRole("switch", { name: en("common.onlyUnseen") }));
    expect(push).toHaveBeenLastCalledWith("/en/explore?kind=hill&unseen=1", { scroll: false });

    await user.selectOptions(screen.getByLabelText(en("common.kind")), "");
    expect(push).toHaveBeenLastCalledWith("/en/explore", { scroll: false });

    const box = screen.getByRole("searchbox");
    await user.type(box, "  sajek{Enter}");
    expect(push).toHaveBeenLastCalledWith("/en/explore?q=sajek&kind=hill", { scroll: false });
  });

  it("filters by district when a district on the map is clicked, and clears it on a second click", async () => {
    const user = userEvent.setup();
    const first = await show(ExplorePage, { lang: "en" });
    await user.click(screen.getByRole("button", { name: "Bandarban, Chattogram" }));
    expect(push).toHaveBeenLastCalledWith("/en/explore?district=bandarban", { scroll: false });
    first.unmount();

    await show(ExplorePage, { lang: "en", query: { district: "bandarban" } });
    await user.click(screen.getByRole("button", { name: "Bandarban, Chattogram" }));
    expect(push).toHaveBeenLastCalledWith("/en/explore", { scroll: false });
  });

  it("hides and shows the map, and has a district names switch", async () => {
    const user = userEvent.setup();
    await show(ExplorePage, { lang: "en" });
    expect(screen.getByRole("switch", { name: en("map.showNames") })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: en("explore.hideMap") }));
    expect(screen.queryByRole("switch", { name: en("map.showNames") })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: en("explore.showMap") }));
    expect(screen.getByRole("switch", { name: en("map.showNames") })).toBeInTheDocument();
  });
});

describe("/kind/[kind]", () => {
  it("puts the count in the title and lists that type only", async () => {
    await show(KindPage, { lang: "en", extra: { kind: "beach" } });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /Beaches in Bangladesh \(9\)/,
    );
    expect(screen.getAllByRole("article")).toHaveLength(9);
  });

  it("is localised", async () => {
    await show(KindPage, { lang: "bn", extra: { kind: "beach" } });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "বাংলাদেশের সমুদ্রসৈকত (৯)",
    );
  });

  it("is a 404 for an unknown type", async () => {
    await expect(show(KindPage, { lang: "en", extra: { kind: "volcano" } })).rejects.toThrow();
  });
});

describe("/month/[month]", () => {
  it("includes seasons that wrap across the new year", async () => {
    // January is in season for places whose best months run November → March.
    await show(MonthPage, { lang: "en", extra: { month: "january" } });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /Places to visit in January \(\d+\)/,
    );
    expect(screen.getAllByRole("article").length).toBeGreaterThan(0);
    const wrapped = (await import("@/server/data")).listPlaces;
    const page = await wrapped({ month: 1, pageSize: 100, lang: "en" });
    expect(page.items.some((p) => p.bestFromMonth > p.bestToMonth)).toBe(true);
  });

  it("is a 404 for anything that is not a month", async () => {
    await expect(show(MonthPage, { lang: "en", extra: { month: "13" } })).rejects.toThrow();
    await expect(show(MonthPage, { lang: "en", extra: { month: "smarch" } })).rejects.toThrow();
  });
});

describe("/unseen", () => {
  it("groups places by division with counts", async () => {
    await show(UnseenPage, { lang: "en" });
    const sections = screen.getAllByRole("region");
    expect(sections.length).toBeGreaterThan(1);
    for (const section of sections) {
      expect(within(section).getByRole("heading", { level: 2 })).toBeInTheDocument();
      expect(within(section).getAllByRole("article").length).toBeGreaterThan(0);
    }
  });
});

describe("/best-places", () => {
  it("lists the popular places and filters by division", async () => {
    const { unmount } = await show(BestPlacesPage, { lang: "en" });
    const all = screen.getAllByRole("article").length;
    expect(all).toBe(24);
    unmount();
    await show(BestPlacesPage, { lang: "en", query: { division: "sylhet" } });
    const some = screen.getAllByRole("article").length;
    expect(some).toBeGreaterThan(0);
    expect(some).toBeLessThan(all);
    expect(screen.getByRole("link", { name: /Sylhet/ })).toHaveAttribute("aria-current", "true");
  });

  it("ignores an unknown division", async () => {
    await show(BestPlacesPage, { lang: "en", query: { division: "narnia" } });
    expect(screen.getAllByRole("article")).toHaveLength(24);
  });
});

describe("/search", () => {
  it("is a normal page with a prompt when there is no query", async () => {
    await show(SearchPage, { lang: "en" });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(en("search.title"));
    expect(screen.getByText(en("search.promptTitle"))).toBeInTheDocument();
    expect(screen.getByRole("search")).toHaveAttribute("action", "/en/search");
  });

  it("says so when nothing is found", async () => {
    await show(SearchPage, { lang: "en", query: { q: "qqqqzzzz" } });
    expect(screen.getByText(en("search.emptyTitle"))).toBeInTheDocument();
    expect(screen.getByText(en("search.emptyBody", { query: "qqqqzzzz" }))).toBeInTheDocument();
  });

  it("finds Sajek by its English and Bengali names, in either language", async () => {
    for (const [lang, q] of [
      ["en", "sajek"],
      ["en", "সাজেক"],
      ["bn", "sajek"],
      ["bn", "সাজেক"],
    ] as const) {
      const { unmount } = await show(SearchPage, { lang, query: { q } });
      expect(cardTitles().some((t) => t === "Sajek Valley" || t === "সাজেক ভ্যালি")).toBe(true);
      unmount();
    }
  });

  it("groups districts and places, with jump chips", async () => {
    await show(SearchPage, { lang: "en", query: { q: "sylhet" } });
    expect(
      screen.getByRole("heading", { level: 2, name: new RegExp(en("search.districts")) }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: new RegExp(en("search.places")) }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: new RegExp(en("search.districts")) })).toHaveAttribute(
      "href",
      "#districts",
    );
    expect(screen.queryByRole("heading", { name: en("search.photos") })).not.toBeInTheDocument();
  });

  it("copes with a malformed or huge query", async () => {
    await show(SearchPage, { lang: "bn", query: { q: ["%", "x"] } });
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    await show(SearchPage, { lang: "bn", query: { q: "a".repeat(5000) } });
  });
});

describe("/near-me", () => {
  const dhakaPlace = "Lalbagh Fort";
  const geo = { getCurrentPosition: vi.fn() };

  beforeEach(() => {
    geo.getCurrentPosition.mockReset();
    Object.defineProperty(navigator, "geolocation", { value: geo, configurable: true });
  });

  const names = () =>
    screen.getAllByRole("listitem").flatMap((li) => {
      const link = within(li).queryAllByRole("link")[0];
      return link ? [link.textContent ?? ""] : [];
    });

  it("lists the places nearest to Dhaka first and never asks for the location on load", async () => {
    await show(NearMePage, { lang: "en" });
    expect(geo.getCurrentPosition).not.toHaveBeenCalled();
    expect(screen.getByLabelText(en("nearMe.startLabel"))).toHaveValue("dhaka");
    expect(screen.getByRole("heading", { level: 2, name: /Dhaka/ })).toBeInTheDocument();
    expect(names()[0]).toBeTruthy();
    expect(names().slice(0, 24)).toContain(dhakaPlace);
    expect(names()).toHaveLength(24);
  });

  it("starts from the district and type in the URL", async () => {
    await show(NearMePage, { lang: "en", query: { from: "sylhet", kind: "waterfall" } });
    expect(screen.getByLabelText(en("nearMe.startLabel"))).toHaveValue("sylhet");
    expect(screen.getByRole("button", { name: /Waterfalls/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("re-sorts when the start district changes and filters by type", async () => {
    const user = userEvent.setup();
    await show(NearMePage, { lang: "en" });
    const fromDhaka = names();
    await user.selectOptions(screen.getByLabelText(en("nearMe.startLabel")), "bandarban");
    expect(names()).not.toEqual(fromDhaka);
    await user.click(screen.getByRole("button", { name: /Beaches/ }));
    const beaches = names();
    expect(beaches.length).toBeGreaterThan(0);
    expect(beaches.length).toBeLessThanOrEqual(24);
    await user.click(screen.getByRole("button", { name: en("common.all") }));
    expect(names()).toHaveLength(24);
  });

  it("opens Google Maps directions in a new tab", async () => {
    await show(NearMePage, { lang: "en" });
    const link = screen.getAllByRole("link", { name: /Directions to/ })[0]!;
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
    expect(link.getAttribute("href")).toMatch(
      /^https:\/\/www\.google\.com\/maps\/dir\/\?api=1&destination=-?\d+(\.\d+)?,-?\d+(\.\d+)?$/,
    );
  });

  it("asks for the location only after the click, and sorts by it", async () => {
    const user = userEvent.setup();
    geo.getCurrentPosition.mockImplementation((ok: PositionCallback) =>
      // Teknaf, the far south-east tip
      ok({ coords: { latitude: 20.86, longitude: 92.3 } } as GeolocationPosition),
    );
    await show(NearMePage, { lang: "en" });
    expect(geo.getCurrentPosition).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: en("nearMe.useLocation") }));
    expect(geo.getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("heading", { level: 2, name: en("nearMe.fromYou") }),
    ).toBeInTheDocument();
    expect(names().slice(0, 5).join(" ")).toMatch(/Saint Martin|Teknaf|Inani|Himchari|Cox/);
  });

  it("explains a refused location and keeps the district list", async () => {
    const user = userEvent.setup();
    geo.getCurrentPosition.mockImplementation(
      (_ok: PositionCallback, fail: PositionErrorCallback) =>
        fail({ code: 1 } as GeolocationPositionError),
    );
    await show(NearMePage, { lang: "en" });
    await user.click(screen.getByRole("button", { name: en("nearMe.useLocation") }));
    await waitFor(() => expect(screen.getByText(en("nearMe.denied"))).toBeInTheDocument());
    expect(names()).toHaveLength(24);
  });

  it("copes with a browser that has no geolocation", async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, "geolocation", { value: undefined, configurable: true });
    delete (navigator as unknown as Record<string, unknown>).geolocation;
    await show(NearMePage, { lang: "en" });
    await user.click(screen.getByRole("button", { name: en("nearMe.useLocation") }));
    expect(screen.getByText(en("nearMe.unsupported"))).toBeInTheDocument();
  });
});

describe("/bucket-list", () => {
  it("lists every place grouped by type", async () => {
    await show(BucketListPage, { lang: "en" });
    expect(screen.getAllByRole("region").length).toBe(11);
    expect(screen.getAllByRole("button", { name: new RegExp(en("bucket.been")) }).length).toBe(257);
    expect(screen.getByTestId("bucket-progress")).toHaveTextContent("0 of 257 ticked");
  });

  it("marks places, counts the ones been to, and saves them in localStorage", async () => {
    const user = userEvent.setup();
    await show(BucketListPage, { lang: "en" });
    const been = screen.getAllByRole("button", { name: new RegExp(en("bucket.been")) });
    const want = screen.getAllByRole("button", { name: new RegExp(en("bucket.want")) });

    await user.click(been[0]!);
    await user.click(been[1]!);
    await user.click(want[2]!);
    expect(been[0]).toHaveAttribute("aria-pressed", "true");
    expect(want[2]).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("bucket-progress")).toHaveTextContent("2 of 257 ticked");
    const saved = JSON.parse(window.localStorage.getItem(BUCKET_KEY)!);
    expect(Object.values(saved).sort()).toEqual(["been", "been", "want"]);

    // choosing "been" on a wished place replaces the wish; clicking again clears it
    await user.click(been[2]!);
    expect(want[2]).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByTestId("bucket-progress")).toHaveTextContent("3 of 257 ticked");
    await user.click(been[2]!);
    expect(screen.getByTestId("bucket-progress")).toHaveTextContent("2 of 257 ticked");
  });

  it("restores saved marks after a reload", async () => {
    await show(BucketListPage, { lang: "en" });
    const first = screen
      .getAllByRole("link", { name: /.+/ })
      .find((a) => a.getAttribute("href")?.startsWith("/en/place/"))!;
    const slug = first.getAttribute("href")!.split("/").pop()!;
    window.localStorage.setItem(BUCKET_KEY, JSON.stringify({ [slug]: "been" }));
    window.dispatchEvent(new StorageEvent("storage", { key: BUCKET_KEY }));
    await waitFor(() =>
      expect(screen.getByTestId("bucket-progress")).toHaveTextContent("1 of 257 ticked"),
    );
  });

  it("speaks Bengali", async () => {
    await show(BucketListPage, { lang: "bn" });
    expect(screen.getByTestId("bucket-progress")).toHaveTextContent(
      bn("bucket.progress", { done: 0, total: 257 }),
    );
  });
});
