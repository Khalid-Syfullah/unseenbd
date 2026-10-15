import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PlanPage from "@/app/[lang]/plan/page";
import TripCostPage from "@/app/[lang]/trip-cost/page";
import { PLAN_DRAFT_KEY } from "@/components/planner/Planner";
import type { Locale } from "@/i18n/locales";
import { getT } from "@/i18n/messages";
import { renderWithI18n } from "./i18n";

const en = getT("en");
const bn = getT("bn");

/** The sample plan, as the URL the planner writes for it. */
const SAMPLE = "from=1&to=19&people=2&level=mid&ret=1&order=1";

async function show(
  Page: typeof PlanPage | typeof TripCostPage,
  lang: Locale,
  query: Record<string, string> = {},
) {
  const ui = await Page({
    params: Promise.resolve({ lang }),
    searchParams: Promise.resolve(query),
  });
  return renderWithI18n(ui, { locale: lang });
}

const sampleQuery = () => Object.fromEntries(new URLSearchParams(SAMPLE));

function tile(label: string): HTMLElement {
  return screen.getByText(label, { selector: "p" }).parentElement!;
}

beforeEach(() => {
  window.localStorage.clear();
  window.history.replaceState(null, "", "/en/plan");
});
afterEach(() => vi.restoreAllMocks());

describe("/plan", () => {
  it("renders the sample plan's figures in English", async () => {
    await show(PlanPage, "en", sampleQuery());
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(en("plan.title"));
    expect(tile(en("plan.days"))).toHaveTextContent("3");
    expect(tile(en("plan.totalKm"))).toHaveTextContent("840 km");
    expect(tile(en("plan.total"))).toHaveTextContent("৳22,200");
    expect(tile(en("plan.perPerson"))).toHaveTextContent("৳11,100");

    const table = screen.getByRole("table", { name: en("plan.costs") });
    const row = (name: string) => within(table).getByRole("row", { name: new RegExp(name) });
    expect(row(en("plan.transport"))).toHaveTextContent("৳7,720");
    expect(row(en("plan.stay"))).toHaveTextContent("৳6,000");
    expect(row(en("plan.food"))).toHaveTextContent("৳5,400");
    expect(row(en("plan.local"))).toHaveTextContent("৳1,400");
    expect(row(en("plan.misc").replace("&", "\\&"))).toHaveTextContent("৳1,650");
    expect(table.querySelector('[data-cost="total"]')).toHaveTextContent("৳22,200");
    expect(table.querySelector('[data-cost="per-person"]')).toHaveTextContent("৳11,100");
  });

  it("shows three day cards with the legs, the sights and where to sleep", async () => {
    await show(PlanPage, "en", sampleQuery());
    const days = within(screen.getByRole("region", { name: en("plan.itinerary") })).getAllByRole(
      "article",
    );
    expect(days).toHaveLength(3);
    expect(days[0]).toHaveTextContent("Dhaka → Cox's Bazar");
    expect(days[0]).toHaveTextContent("≈ 420 km · 10.5 hours · ৳1,930 per person");
    expect(days[0]).toHaveTextContent(en("plan.sleepIn", { name: "Cox's Bazar" }));
    expect(days[1]!.querySelectorAll('[data-item="sight"]')).toHaveLength(2);
    expect(days[2]).toHaveTextContent("Cox's Bazar → Dhaka");
    expect(days[2]).toHaveTextContent(en("plan.tripEnds", { name: "Dhaka" }));
    expect(within(days[0]!).getByRole("link", { name: en("plan.routeGuide") })).toHaveAttribute(
      "href",
      "/en/route/dhaka-to-coxs-bazar",
    );
  });

  it("renders the same figures with Bengali numerals", async () => {
    window.history.replaceState(null, "", "/plan");
    await show(PlanPage, "bn", sampleQuery());
    expect(tile(bn("plan.days"))).toHaveTextContent("৩");
    expect(tile(bn("plan.totalKm"))).toHaveTextContent("৮৪০ কিমি");
    expect(tile(bn("plan.total"))).toHaveTextContent("৳২২,২০০");
    expect(tile(bn("plan.perPerson"))).toHaveTextContent("৳১১,১০০");
    const table = screen.getByRole("table", { name: bn("plan.costs") });
    expect(table).toHaveTextContent("৳৭,৭২০");
    expect(table).toHaveTextContent("৳৬,০০০");
    expect(table).toHaveTextContent("৳৫,৪০০");
    expect(table).toHaveTextContent("৳১,৪০০");
    expect(table).toHaveTextContent("৳১,৬৫০");
    expect(screen.getAllByText(/জনপ্রতি ৳১,৯৩০/)).toHaveLength(2);
  });

  it("starts empty and fills in the sample from the button, mirroring it in the URL", async () => {
    const user = userEvent.setup();
    await show(PlanPage, "en");
    expect(screen.getByText(en("plan.empty"))).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: en("plan.sample") })[0]!);
    expect(tile(en("plan.total"))).toHaveTextContent("৳22,200");
    await waitFor(() => expect(window.location.search).toBe(`?${SAMPLE}`));
    expect(window.localStorage.getItem(PLAN_DRAFT_KEY)).toBe(SAMPLE);
  });

  it("recomputes when the form changes", async () => {
    const user = userEvent.setup();
    await show(PlanPage, "en", sampleQuery());
    const form = screen.getByRole("form", { name: en("plan.formTitle") });
    await user.click(within(form).getByRole("switch", { name: en("plan.returnToStart") }));
    expect(tile(en("plan.totalKm"))).toHaveTextContent("420 km");
    await user.click(
      within(form).getByRole("button", { name: `${en("ui.increase")}: ${en("plan.travellers")}` }),
    );
    await user.click(within(form).getByRole("radio", { name: en("plan.levels.high") }));
    await user.selectOptions(within(form).getByLabelText(en("plan.addDestination")), "14");
    expect(
      within(form).getByRole("button", { name: en("plan.remove", { name: "Bandarban" }) }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(window.location.search).toBe("?from=1&to=19,14&people=3&level=high&ret=0&order=1"),
    );
    await user.click(
      within(form).getByRole("button", { name: en("plan.remove", { name: "Cox's Bazar" }) }),
    );
    await user.click(
      within(form).getByRole("button", { name: en("plan.remove", { name: "Bandarban" }) }),
    );
    expect(screen.getByText(en("plan.empty"))).toBeInTheDocument();
  });

  it("adds a district from `?add=` to the plan saved in this browser", async () => {
    window.localStorage.setItem(PLAN_DRAFT_KEY, "from=1&to=28&people=4&level=low&ret=1&order=1");
    await show(PlanPage, "en", { from: "1", add: "19" });
    const form = screen.getByRole("form", { name: en("plan.formTitle") });
    await waitFor(() =>
      expect(
        within(form).getByRole("button", { name: en("plan.remove", { name: "Sylhet" }) }),
      ).toBeInTheDocument(),
    );
    expect(
      within(form).getByRole("button", { name: en("plan.remove", { name: "Cox's Bazar" }) }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(window.location.search).toBe("?from=1&to=28,19&people=4&level=low&ret=1&order=1"),
    );
  });

  it("asks the visitor to sign in when saving without an account", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 }));
    await show(PlanPage, "en", sampleQuery());
    await user.click(screen.getByRole("button", { name: en("plan.save") }));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/trips",
      expect.objectContaining({ method: "POST" }),
    );
    const body = JSON.parse(String(fetchMock.mock.calls[0]![1]!.body));
    expect(body.totalCost).toBe(22200);
    expect(body.input).toMatchObject({ start: 1, destinations: [19], people: 2, level: "mid" });
    await waitFor(() => expect(screen.getAllByText(en("plan.signInToSave"))).toHaveLength(2));
  });
});

describe("/trip-cost", () => {
  it("computes the acceptance case and links to the planner", async () => {
    await show(TripCostPage, "en", {
      from: "1",
      to: "19",
      people: "2",
      nights: "2",
      level: "mid",
      ret: "1",
    });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(en("tripCost.title"));
    expect(tile(en("plan.total"))).toHaveTextContent("৳25,200");
    expect(tile(en("plan.perPerson"))).toHaveTextContent("৳12,600");
    expect(tile(en("tripCost.roadKm"))).toHaveTextContent("420 km");
    const table = screen.getByRole("table", { name: en("tripCost.breakdown") });
    expect(table).toHaveTextContent("৳7,720");
    expect(table).toHaveTextContent("৳4,200");
    expect(table).toHaveTextContent("৳1,850");
    expect(screen.getByRole("link", { name: en("tripCost.addToPlan") })).toHaveAttribute(
      "href",
      "/en/plan?from=1&add=19",
    );
  });

  it("shows Bengali numerals and asks for a destination first", async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, "", "/trip-cost");
    await show(TripCostPage, "bn");
    expect(screen.getByText(bn("tripCost.empty"))).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText(bn("tripCost.to")), "19");
    expect(tile(bn("plan.total"))).toHaveTextContent("৳২৫,২০০");
    await waitFor(() =>
      expect(window.location.search).toBe("?from=1&to=19&people=2&nights=2&level=mid&ret=1"),
    );
  });
});
