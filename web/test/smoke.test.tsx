import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import HomePage from "@/app/[lang]/page";
import { getT } from "@/i18n/messages";

const bn = getT("bn");
const en = getT("en");

async function renderHome(lang: string) {
  const ui = await HomePage({ params: Promise.resolve({ lang }) });
  return render(ui);
}

describe("home page (smoke)", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.setAttribute("data-theme-pref", "system");
    document.cookie = "theme=; Max-Age=0; Path=/";
  });

  it("renders Bengali at bn with links to the other locales", async () => {
    await renderHome("bn");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(bn("home.lead"));

    const nav = screen.getByRole("navigation", { name: bn("language.label") });
    expect(within(nav).getByRole("link", { name: "বাংলা" })).toHaveAttribute("href", "/");
    expect(within(nav).getByRole("link", { name: "বাংলা" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(nav).getByRole("link", { name: "English" })).toHaveAttribute("href", "/en");
    expect(within(nav).getByRole("link", { name: "日本語" })).toHaveAttribute("href", "/ja");

    expect(screen.getAllByAltText("Unseen BD")[0]).toHaveAttribute(
      "src",
      "/brand/logo-horizontal-bn.svg",
    );
  });

  it("renders English at en", async () => {
    await renderHome("en");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(en("home.lead"));
    expect(screen.getAllByAltText("Unseen BD")[0]).toHaveAttribute(
      "src",
      "/brand/logo-horizontal-en.svg",
    );
  });

  it("switches the theme and remembers it in the cookie", async () => {
    await renderHome("en");
    const group = screen.getByRole("group", { name: "Theme" });
    expect(within(group).getByRole("button", { name: "System" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await userEvent.click(within(group).getByRole("button", { name: "Dark" }));

    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(document.cookie).toContain("theme=dark");
    expect(within(group).getByRole("button", { name: "Dark" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
