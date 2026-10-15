import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import HomePage from "@/app/[lang]/page";
import { PARTNER_BANNER, PARTNER_BANNER_DISMISS_KEY } from "@/config/site";
import type { Locale } from "@/i18n/locales";
import { getT } from "@/i18n/messages";
import { VISITED_KEY } from "@/lib/visited";
import { renderWithI18n } from "./i18n";

const bn = getT("bn");
const en = getT("en");

async function renderHome(lang: Locale) {
  const ui = await HomePage({ params: Promise.resolve({ lang }) });
  return renderWithI18n(ui, { locale: lang });
}

const SECTION_IDS = [
  "directory",
  "owner",
  "my-map",
  "photos",
  "posts",
  "suggestions",
  "trending",
  "popular",
  "about",
  "kinds",
  "months",
  "unseen",
  "districts",
  "routes",
  "features",
  "faq",
];

describe("home page", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders the hero in Bengali with the pitch, note and search", async () => {
    await renderHome("bn");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(bn("home.hero.title"));
    expect(screen.getByText(bn("common.freeNoTrackers"))).toBeInTheDocument();
    expect(screen.getByRole("search")).toHaveAttribute("action", "/search");
    expect(screen.getByRole("link", { name: bn("home.hero.ctaMap") })).toHaveAttribute(
      "href",
      "/my-bangladesh",
    );
  });

  it("renders English with locale-prefixed links", async () => {
    await renderHome("en");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Unseen Bangladesh");
    expect(screen.getByRole("search")).toHaveAttribute("action", "/en/search");
    expect(screen.getByRole("link", { name: en("home.hero.ctaPlan") })).toHaveAttribute(
      "href",
      "/en/plan",
    );
  });

  it("has every block, in order", async () => {
    const { container } = await renderHome("en");
    const ids = [...container.querySelectorAll("section[id]")].map((s) => s.id);
    expect(ids).toEqual(SECTION_IDS);
    // The "how much have you seen" band sits between popular places and the explainer.
    const headings = [...container.querySelectorAll("h2")].map((h) => h.textContent);
    expect(headings.indexOf(en("home.seen.title"))).toBe(
      headings.indexOf(en("home.popular.title")) + 1,
    );
  });

  it("shows the empty state for community blocks with nothing in them", async () => {
    await renderHome("en");
    expect(screen.getByText(en("home.photos.empty"))).toBeInTheDocument();
    expect(screen.getByText(en("home.posts.empty"))).toBeInTheDocument();
    expect(screen.getByText(en("home.suggestions.empty"))).toBeInTheDocument();
  });

  it("lists the trending places and the 24 popular destinations", async () => {
    // The seeded trending snapshot belongs to autumn 2026.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-15T06:00:00Z"));
    const { container } = await renderHome("en").finally(() => vi.useRealTimers());
    const trending = container.querySelector("#trending")!;
    expect(within(trending as HTMLElement).getAllByRole("listitem").length).toBeGreaterThanOrEqual(
      10,
    );
    const popular = container.querySelector("#popular")!;
    expect(popular.querySelectorAll("article")).toHaveLength(24);
  });

  it("filters popular destinations by division without leaving the page", async () => {
    const { container } = await renderHome("en");
    const popular = container.querySelector("#popular") as HTMLElement;
    const group = within(popular).getByRole("group", { name: en("home.popular.filter") });
    const chips = within(group).getAllByRole("button");
    expect(chips[0]).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(chips[1]!);
    expect(chips[1]).toHaveAttribute("aria-pressed", "true");
    const shown = popular.querySelectorAll("article").length;
    expect(shown).toBeGreaterThan(0);
    expect(shown).toBeLessThan(24);
  });

  it("shows the empty map widget on the server and fills it from localStorage", async () => {
    await renderHome("bn");
    expect(screen.getByText("আরও ৬৪টি জেলা অদেখা")).toBeInTheDocument();
  });

  it("marks visited districts with a solid underline", async () => {
    window.localStorage.setItem(VISITED_KEY, JSON.stringify(["sylhet", "not-a-district"]));
    const { container } = await renderHome("en");
    const districts = container.querySelector("#districts") as HTMLElement;
    const link = await within(districts).findByRole("link", { name: /^Sylhet/ });
    expect(link.className).toContain("decoration-solid");
    expect(within(districts).getByRole("link", { name: "Dhaka" }).className).toContain(
      "decoration-dotted",
    );
    expect(screen.getByText("63 districts still unseen")).toBeInTheDocument();
  });

  it("dismisses the partner banner and remembers it", async () => {
    await renderHome("en");
    const banner = screen.getByRole("complementary", { name: en("home.banner.label") });
    expect(within(banner).getByText(PARTNER_BANNER.name)).toBeInTheDocument();
    await userEvent.click(within(banner).getByRole("button", { name: en("ui.dismiss") }));
    expect(screen.queryByRole("complementary", { name: en("home.banner.label") })).toBeNull();
    expect(window.localStorage.getItem(PARTNER_BANNER_DISMISS_KEY)).toBe(PARTNER_BANNER.url);
  });

  it("answers six questions in the accordion and in FAQPage JSON-LD", async () => {
    const { container } = await renderHome("en");
    const faq = container.querySelector("#faq") as HTMLElement;
    expect(within(faq).getAllByRole("button")).toHaveLength(6);

    const blocks = [...container.querySelectorAll('script[type="application/ld+json"]')].map(
      (s) => JSON.parse(s.textContent ?? "{}") as Record<string, unknown>,
    );
    const page = blocks.find((b) => b["@type"] === "FAQPage") as {
      mainEntity: { name: string; acceptedAnswer: { text: string } }[];
    };
    expect(page.mainEntity).toHaveLength(6);
    expect(page.mainEntity[0]!.name).toBe(en("home.faq.q1"));
    expect(page.mainEntity[0]!.acceptedAnswer.text).toBe(en("home.faq.a1"));

    const graph = blocks.find((b) => "@graph" in b) as { "@graph": { "@type": string }[] };
    expect(graph["@graph"].map((n) => n["@type"])).toEqual(["WebSite", "Organization"]);
  });
});
