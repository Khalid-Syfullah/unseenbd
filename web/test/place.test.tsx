import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import DistrictPage, {
  generateStaticParams as districtParams,
} from "@/app/[lang]/district/[slug]/page";
import PlacePage, { generateStaticParams as placeParams } from "@/app/[lang]/place/[slug]/page";
import type { Locale } from "@/i18n/locales";
import { getT } from "@/i18n/messages";
import { BUCKET_KEY } from "@/lib/bucket";
import { VISITED_KEY } from "@/lib/visited";
import { renderWithI18n } from "./i18n";

const en = getT("en");

async function show(
  Page: (props: never) => Promise<React.ReactElement>,
  lang: Locale,
  slug: string,
) {
  const ui = await (Page as (p: unknown) => Promise<React.ReactElement>)({
    params: Promise.resolve({ lang, slug }),
  });
  return renderWithI18n(ui, { locale: lang });
}

beforeEach(() => window.localStorage.clear());

describe("static params", () => {
  it("covers every place and district in bn and en", async () => {
    expect(await placeParams()).toHaveLength(257 * 2);
    expect(await districtParams()).toHaveLength(64 * 2);
  });
});

describe("/place/[slug]", () => {
  it("renders the guide with its sections and seven essentials", async () => {
    await show(PlacePage, "en", "nilgiri-hill");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Nilgiri");
    for (const key of [
      "seeTitle",
      "howTitle",
      "noteTitle",
      "essentialsTitle",
      "embedTitle",
    ] as const) {
      expect(
        screen.getByRole("heading", { level: 2, name: en(`place.${key}`) }),
      ).toBeInTheDocument();
    }
    const essentials = screen
      .getByRole("heading", { name: en("place.essentialsTitle") })
      .closest("section")!;
    const links = within(essentials).getAllByRole("link");
    expect(links).toHaveLength(7);
    expect(links[0]).toHaveAttribute(
      "href",
      expect.stringContaining("google.com/maps/search/hotels"),
    );
    expect(document.querySelector('script[type="application/ld+json"]')?.textContent).toContain(
      "TouristAttraction",
    );
  });

  it("marks a place as wanted in the bucket list", async () => {
    await show(PlacePage, "en", "nilgiri-hill");
    const [want] = screen.getAllByRole("button", { name: en("place.wantToGo") });
    await userEvent.click(want);
    expect(JSON.parse(window.localStorage.getItem(BUCKET_KEY) ?? "{}")["nilgiri-hill"]).toBe(
      "want",
    );
  });
});

describe("/district/[slug]", () => {
  it("renders the title, places and the visited toggle", async () => {
    await show(DistrictPage, "en", "bandarban");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /Bandarban district: \d+ places? to visit/,
    );
    expect(
      screen.getByRole("heading", { level: 2, name: en("district.reachTitle") }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: en("district.beenHere") }));
    // The store keeps district ids (Bandarban is 14).
    expect(JSON.parse(window.localStorage.getItem(VISITED_KEY) ?? "[]")).toEqual([14]);
  });
});
