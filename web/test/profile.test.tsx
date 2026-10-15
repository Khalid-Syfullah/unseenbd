import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProfilePage from "@/app/[lang]/profile/page";
import TripPage from "@/app/[lang]/trip/[id]/page";
import PublicProfilePage from "@/app/[lang]/u/[handle]/page";
import { getT } from "@/i18n/messages";
import { recordView } from "@/server/account/history";
import { applyVisitedDelta } from "@/server/account/sync";
import { createTrip, updateTrip } from "@/server/account/trips";
import type { AuthContext } from "@/server/auth/session";
import { registerWithPassword, updateProfile, type UserRow } from "@/server/auth/users";
import { resetAccountForTests } from "@/lib/account/client";
import { freshEmail } from "./account-helpers";
import { renderWithI18n } from "./i18n";

const en = getT("en");

const session: { current: AuthContext | null } = { current: null };

vi.mock("@/server/auth/current", () => ({
  currentSession: async () => session.current,
}));

const redirects: string[] = [];
vi.mock("next/navigation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/navigation")>();
  return {
    ...actual,
    redirect: (url: string) => {
      redirects.push(url);
      throw new Error(`NEXT_REDIRECT ${url}`);
    },
    useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
    usePathname: () => "/en/profile",
  };
});

async function makeUser(name = "Nadia Rahman"): Promise<UserRow> {
  const result = await registerWithPassword({
    email: freshEmail(),
    password: "long password",
    name,
  });
  if (!result.ok) throw new Error(result.error);
  return result.user;
}

function signIn(user: UserRow) {
  session.current = {
    user,
    token: "t",
    csrfToken: "c",
    expiresAt: new Date(Date.now() + 1e9),
    renewed: false,
  };
}

const sampleInput = {
  start: 1,
  destinations: [19],
  places: [],
  optimize: true,
  returnToStart: true,
  people: 2,
  level: "mid",
};

beforeEach(() => {
  session.current = null;
  redirects.length = 0;
  resetAccountForTests();
});

async function showProfile(query: Record<string, string> = {}) {
  const ui = await ProfilePage({
    params: Promise.resolve({ lang: "en" }),
    searchParams: Promise.resolve(query),
  });
  return renderWithI18n(ui, { locale: "en" });
}

describe("/profile", () => {
  it("sends visitors who are not signed in to the login page", async () => {
    await expect(showProfile({ tab: "trips" })).rejects.toThrow("NEXT_REDIRECT");
    expect(redirects).toEqual(["/en/login?next=%2Fen%2Fprofile%3Ftab%3Dtrips"]);
  });

  it("shows the header, the pill tabs and the summary", async () => {
    const user = await makeUser();
    applyVisitedDelta(user.id, { add: [1, 19, 28], remove: [] });
    createTrip(user.id, { title: "A", input: sampleInput, totalCost: 22200 });
    createTrip(user.id, { title: "B", input: sampleInput, totalCost: 1800 });
    signIn(user);
    await showProfile();

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Nadia Rahman");
    expect(screen.getByRole("link", { name: `@${user.handle}` })).toHaveAttribute(
      "href",
      `/en/u/${user.handle}`,
    );
    expect(screen.getByRole("link", { name: en("profile.createPost") })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: en("profile.myListings") })).toHaveAttribute(
      "href",
      "/en/my-listings",
    );
    const tabs = screen.getByRole("navigation", { name: en("profile.tabs.label") });
    expect(within(tabs).getAllByRole("link")).toHaveLength(7);
    expect(within(tabs).getByRole("link", { name: en("profile.tabs.summary") })).toHaveAttribute(
      "aria-current",
      "page",
    );
    const tile = (label: string) => screen.getByText(label, { selector: "p" }).parentElement!;
    expect(tile(en("profile.summary.visited"))).toHaveTextContent("3");
    expect(tile(en("profile.summary.trips"))).toHaveTextContent("2");
    expect(tile(en("profile.summary.spend"))).toHaveTextContent("৳24,000");
    expect(
      screen.getByRole("link", { name: en("profile.summary.planNextAction") }),
    ).toHaveAttribute("href", "/en/plan");
  });

  it("lists history, trips and settings in their tabs", async () => {
    const user = await makeUser("Karim");
    recordView(user.id, { placeId: 1 });
    recordView(user.id, { districtId: 2 });
    createTrip(user.id, { title: "Hill trip", input: sampleInput, totalCost: 9000 });
    signIn(user);

    const history = await showProfile({ tab: "history" });
    expect(within(document.querySelector("ol")!).getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByRole("button", { name: en("profile.history.clear") })).toBeInTheDocument();
    history.unmount();

    const trips = await showProfile({ tab: "trips" });
    expect(screen.getByRole("link", { name: "Hill trip" })).toBeInTheDocument();
    expect(screen.getByText(en("profile.trips.private"))).toBeInTheDocument();
    expect(screen.getByRole("button", { name: en("profile.trips.share") })).toBeInTheDocument();
    trips.unmount();

    await showProfile({ tab: "settings" });
    expect(screen.getByLabelText(en("account.name"))).toHaveValue("Karim");
    expect(screen.getByLabelText(en("profile.settings.handle"))).toHaveValue(user.handle);
    expect(
      screen.getByRole("button", { name: en("profile.settings.deleteAccount") }),
    ).toBeEnabled();
    expect(screen.getByRole("button", { name: en("profile.photos.deleteAll") })).toBeEnabled();
  });
});

describe("/trip/:id", () => {
  it("shows a shared trip read-only to anyone, and a private one only to its owner", async () => {
    const owner = await makeUser("Owner");
    const created = createTrip(owner.id, {
      title: "Dhaka → Cox's Bazar",
      input: sampleInput,
      plan: {
        costs: {
          transport: 1,
          stay: 2,
          food: 3,
          local: 4,
          misc: 5,
          subtotal: 15,
          total: 22200,
          perPerson: 11100,
        },
      },
      totalCost: 22200,
    });
    if (!created.ok) throw new Error(created.error);
    const id = String(created.trip.id);
    const show = async () =>
      renderWithI18n(await TripPage({ params: Promise.resolve({ lang: "en", id }) }), {
        locale: "en",
      });

    await expect(show()).rejects.toThrow();

    signIn(owner);
    const mine = await show();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Dhaka → Cox's Bazar");
    expect(screen.getByText(en("trip.private"), { exact: false })).toBeInTheDocument();
    mine.unmount();

    updateTrip(owner.id, created.trip.id, { isPublic: true });
    session.current = null;
    await show();
    expect(screen.queryByRole("button", { name: en("plan.save") })).not.toBeInTheDocument();
    expect(screen.getAllByText("৳22,200").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("link", { name: en("trip.openInPlanner") }).getAttribute("href"),
    ).toMatch(/^\/en\/plan\?from=1&to=19/);
  });
});

describe("/u/:handle", () => {
  it("shows only public things", async () => {
    const user = await makeUser("Public Person");
    applyVisitedDelta(user.id, { add: [1, 2], remove: [] });
    const t1 = createTrip(user.id, { title: "Shared one", input: sampleInput, totalCost: 100 });
    createTrip(user.id, { title: "Secret one", input: sampleInput, totalCost: 100 });
    if (!t1.ok) throw new Error();
    updateTrip(user.id, t1.trip.id, { isPublic: true });

    const show = async () =>
      renderWithI18n(
        await PublicProfilePage({ params: Promise.resolve({ lang: "en", handle: user.handle }) }),
        { locale: "en" },
      );
    const first = await show();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Public Person");
    expect(screen.getByRole("link", { name: "Shared one" })).toBeInTheDocument();
    expect(screen.queryByText("Secret one")).not.toBeInTheDocument();
    // The map is private until the user switches it on.
    expect(screen.queryByText(en("publicProfile.map"))).not.toBeInTheDocument();
    expect(document.body.textContent).not.toContain("@example.com");
    first.unmount();

    updateProfile(user.id, { publicMap: true });
    await show();
    expect(screen.getByText(en("publicProfile.map"))).toBeInTheDocument();
    expect(
      screen.getByText(en("publicProfile.visitedCount", { count: 2, total: 64 })),
    ).toBeInTheDocument();
  });

  it("is a 404 for unknown handles", async () => {
    await expect(
      PublicProfilePage({ params: Promise.resolve({ lang: "en", handle: "nobody_here_xyz" }) }),
    ).rejects.toThrow();
  });
});
