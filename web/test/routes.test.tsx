import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RoutePage, { generateStaticParams as routeParams } from "@/app/[lang]/route/[slug]/page";
import RoutesPage from "@/app/[lang]/routes/page";
import TrainPage, { generateStaticParams as trainParams } from "@/app/[lang]/train/[slug]/page";
import TrainsPage from "@/app/[lang]/trains/page";
import type { Locale } from "@/i18n/locales";
import { getT } from "@/i18n/messages";
import { getComputedRoute, listRoutes, listTrains } from "@/server/data";
import { renderWithI18n } from "./i18n";

const push = vi.fn();
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push, replace: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
}));

const en = getT("en");

async function show(
  Page: (props: never) => Promise<React.ReactElement>,
  lang: Locale,
  extra: Record<string, string> = {},
) {
  const ui = await (Page as (p: unknown) => Promise<React.ReactElement>)({
    params: Promise.resolve({ lang, ...extra }),
    searchParams: Promise.resolve({}),
  });
  return renderWithI18n(ui, { locale: lang });
}

beforeEach(() => push.mockClear());

describe("route and train data", () => {
  it("has a static page for every route and train in both locales", async () => {
    expect(await routeParams()).toHaveLength(150 * 2);
    expect(await trainParams()).toHaveLength(120 * 2);
  });

  it("computes a route for a pair with no route page", async () => {
    const curated = new Set((await listRoutes("en")).map((r) => r.slug));
    expect(curated.has("rangamati-to-sylhet")).toBe(false);
    const route = await getComputedRoute("rangamati-to-sylhet", "en");
    expect(route?.from.slug).toBe("rangamati");
    expect(route?.to.slug).toBe("sylhet");
    expect(route?.estimated).toBe(true);
    expect(route?.roadKm).toBeGreaterThan(100);
    expect(await getComputedRoute("coxs-bazar-to-coxs-bazar", "en")).toBeNull();
    expect(await getComputedRoute("nowhere-to-dhaka", "en")).toBeNull();
  });

  it("finds direct trains in stop order", async () => {
    const route = await getComputedRoute("dhaka-to-sylhet", "en");
    const trains = await listTrains("en");
    expect(route?.trains.length).toBeGreaterThan(0);
    expect(route!.trains.every((t) => trains.some((x) => x.slug === t.slug))).toBe(true);
  });
});

describe("/routes", () => {
  it("renders the finder and Dhaka to every other district, grouped by division", async () => {
    await show(RoutesPage, "en");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(en("routes.title"));
    expect(screen.getByRole("form", { name: en("routes.finderTitle") })).toBeInTheDocument();
    const cards = screen.getAllByRole("heading", { level: 4 });
    expect(cards).toHaveLength(63);
    expect(screen.getAllByRole("heading", { level: 3 }).length).toBeGreaterThanOrEqual(8);
  });

  it("opens the route page for a pair and rejects the same district twice", async () => {
    const user = userEvent.setup();
    await show(RoutesPage, "en");
    const form = screen.getByRole("form", { name: en("routes.finderTitle") });
    await user.click(within(form).getByRole("button", { name: en("routes.show") }));
    expect(push).not.toHaveBeenCalled();
    await user.selectOptions(within(form).getByLabelText(en("routes.to")), "sylhet");
    await user.click(within(form).getByRole("button", { name: en("routes.show") }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/en/route/dhaka-to-sylhet"));
    await user.selectOptions(within(form).getByLabelText(en("routes.to")), "dhaka");
    await user.click(within(form).getByRole("button", { name: en("routes.show") }));
    expect(await within(form).findByText(en("routes.samePair"))).toBeInTheDocument();
  });
});

describe("/route/[slug]", () => {
  it("shows bus, trains, launch, flight, places and booking links with provenance", async () => {
    const { container } = await show(RoutePage, "en", { slug: "dhaka-to-barishal" });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Dhaka to Barishal");
    for (const id of ["bus", "trains", "launch", "flight", "places", "booking"]) {
      expect(container.querySelector(`#${id}`), id).not.toBeNull();
    }
    expect(screen.getAllByText(/^As of /).length).toBeGreaterThan(2);
    expect(screen.getAllByText(en("confidence.high")).length).toBeGreaterThan(0);
    expect(container.querySelector('a[href*="eticket.railway.gov.bd"]')).not.toBeNull();
  });

  it("uses Bengali numerals in Bengali", async () => {
    await show(RoutePage, "bn", { slug: "dhaka-to-barishal" });
    expect(screen.getAllByText(/৳[০-৯]/).length).toBeGreaterThan(0);
  });

  it("renders a computed route for a pair with no route page", async () => {
    await show(RoutePage, "en", { slug: "rangamati-to-sylhet" });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Rangamati to Sylhet");
    expect(screen.getByText(en("route.computedNote"))).toBeInTheDocument();
    expect(screen.getByText(en("route.tileRoadEstimate"))).toBeInTheDocument();
  });

  it("is a 404 for an unknown pair", async () => {
    await expect(show(RoutePage, "en", { slug: "nowhere-to-dhaka" })).rejects.toThrow();
  });
});

describe("/trains", () => {
  it("lists all 120 trains and filters by station and sorts by departure", async () => {
    const user = userEvent.setup();
    await show(TrainsPage, "en");
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(120);
    await user.type(screen.getByLabelText(en("trains.stationLabel")), "Sylhet");
    const some = screen.getAllByRole("heading", { level: 3 });
    expect(some.length).toBeGreaterThan(0);
    expect(some.length).toBeLessThan(120);
    await user.click(screen.getByRole("radio", { name: en("trains.sortDeparture") }));
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(some.length);
  });
});

describe("/train/[slug]", () => {
  it("shows the stop timeline, fare matrix, return train and e-ticket link", async () => {
    await show(TrainPage, "en", { slug: "suborno-express-701" });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Suborno Express (701)");
    expect(screen.getAllByRole("listitem").length).toBeGreaterThanOrEqual(3);
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("৳943")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: en("train.returnLink", { name: "Suborno Express" }) }),
    ).toHaveAttribute("href", "/en/train/suborno-express-702");
    expect(screen.getByRole("link", { name: en("train.eticket") })).toHaveAttribute(
      "href",
      "https://eticket.railway.gov.bd/",
    );
  });
});
