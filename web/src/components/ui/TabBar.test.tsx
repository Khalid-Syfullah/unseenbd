import { screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithI18n } from "../../../test/i18n";
import { TabBar } from "./TabBar";

const nav = vi.hoisted(() => ({ pathname: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => nav.pathname }));

function current() {
  const bar = screen.getByRole("navigation", { name: "Quick links" });
  return within(bar)
    .getAllByRole("link")
    .filter((link) => link.getAttribute("aria-current") === "page")
    .map((link) => link.textContent);
}

describe("TabBar", () => {
  afterEach(() => {
    nav.pathname = "/";
  });

  it("shows the five tabs in order with locale links", () => {
    nav.pathname = "/en";
    renderWithI18n(<TabBar />);
    const links = within(screen.getByRole("navigation", { name: "Quick links" })).getAllByRole(
      "link",
    );
    expect(links.map((l) => l.textContent)).toEqual([
      "Home",
      "My Bangladesh",
      "Explore",
      "Planner",
      "Gallery",
    ]);
    expect(links.map((l) => l.getAttribute("href"))).toEqual([
      "/en",
      "/en/my-bangladesh",
      "/en/explore",
      "/en/plan",
      "/en/gallery",
    ]);
  });

  it("marks Home active only on the home page", () => {
    nav.pathname = "/en";
    renderWithI18n(<TabBar />);
    expect(current()).toEqual(["Home"]);
  });

  it("marks the tab for the current route, including pages below it", () => {
    nav.pathname = "/en/explore";
    const { unmount } = renderWithI18n(<TabBar />);
    expect(current()).toEqual(["Explore"]);
    unmount();

    nav.pathname = "/en/plan/abc";
    renderWithI18n(<TabBar />);
    expect(current()).toEqual(["Planner"]);
  });

  it("reads un-prefixed Bengali URLs and the internal /bn form", () => {
    nav.pathname = "/gallery";
    const { unmount } = renderWithI18n(<TabBar />, { locale: "bn" });
    const bar = screen.getByRole("navigation", { name: "দ্রুত লিংক" });
    expect(within(bar).getByRole("link", { name: "গ্যালারি" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(bar).getByRole("link", { name: "গ্যালারি" })).toHaveAttribute("href", "/gallery");
    unmount();

    nav.pathname = "/bn/my-bangladesh";
    renderWithI18n(<TabBar />, { locale: "bn" });
    expect(screen.getByRole("link", { name: "আমার বাংলাদেশ" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("has no active tab on pages outside the five sections", () => {
    nav.pathname = "/en/routes";
    renderWithI18n(<TabBar />);
    expect(current()).toEqual([]);
  });

  it("takes the path as a prop (previews)", () => {
    renderWithI18n(<TabBar pathname="/en/gallery" fixed={false} />);
    expect(current()).toEqual(["Gallery"]);
  });
});
