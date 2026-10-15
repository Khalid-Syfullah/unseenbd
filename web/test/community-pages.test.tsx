import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import GalleryPage from "@/app/[lang]/gallery/page";
import HomePage from "@/app/[lang]/page";
import PhotoPage from "@/app/[lang]/photo/[id]/page";
import PlacePage from "@/app/[lang]/place/[slug]/page";
import ProfilePage from "@/app/[lang]/profile/page";
import SuggestPage from "@/app/[lang]/suggest/page";
import { getT } from "@/i18n/messages";
import { resetAccountForTests } from "@/lib/account/client";
import { resetMineForTests } from "@/lib/community/mine-store";
import type { AuthContext } from "@/server/auth/session";
import { resetAuthLimits } from "@/server/auth/limits";
import { registerWithPassword, type UserRow } from "@/server/auth/users";
import { resetCommunityLimits } from "@/server/community/http";
import { getDb } from "@/server/db/client";
import {
  districts,
  guideSuggestions,
  photos,
  posts,
  suggestions,
  trendVotes,
} from "@/server/db/schema";
import { freshEmail, TestBrowser } from "./account-helpers";
import { renderWithI18n } from "./i18n";

const en = getT("en");

const session: { current: AuthContext | null } = { current: null };
vi.mock("@/server/auth/current", () => ({ currentSession: async () => session.current }));
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  },
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/en",
}));

const browser = new TestBrowser();

beforeEach(() => {
  session.current = null;
  resetAccountForTests();
  resetMineForTests();
  resetAuthLimits();
  resetCommunityLimits();
  vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) =>
    browser.fetch(input, init),
  );
});
afterEach(() => vi.unstubAllGlobals());

function addPhoto(values: Partial<typeof photos.$inferInsert> = {}) {
  return getDb()
    .insert(photos)
    .values({
      uploaderName: "Rupa",
      districtId: 3,
      src: "/media/2026/10/abc.webp",
      thumb: "/media/2026/10/abc-t.webp",
      width: 1600,
      height: 1200,
      status: "approved",
      ...values,
    })
    .returning({ id: photos.id })
    .get().id;
}

async function makeUser(name = "Sadia Khan"): Promise<UserRow> {
  const result = await registerWithPassword({
    email: freshEmail(),
    password: "long password",
    name,
  });
  if (!result.ok) throw new Error(result.error);
  return result.user;
}

describe("/gallery and /photo/:id", () => {
  it("shows approved public photos only, filtered by district and search", async () => {
    const d = getDb().select().from(districts).where(eq(districts.id, 3)).get()!;
    const shown = addPhoto({ caption: "Misty ridge" });
    const pending = addPhoto({ status: "pending", caption: "Pending one" });
    const hidden = addPhoto({ isPublic: false, caption: "Private one" });

    const ui = await GalleryPage({
      params: Promise.resolve({ lang: "en" }),
      searchParams: Promise.resolve({ district: d.slug }),
    });
    renderWithI18n(ui, { locale: "en" });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(en("gallery.title"));
    const links = screen
      .getAllByRole("link")
      .map((a) => a.getAttribute("href"))
      .filter((h) => h?.startsWith("/en/photo/"));
    expect(links).toContain(`/en/photo/${shown}`);
    expect(links).not.toContain(`/en/photo/${pending}`);
    expect(links).not.toContain(`/en/photo/${hidden}`);
    expect(screen.getByRole("link", { name: en("gallery.add") })).toHaveAttribute(
      "href",
      `/en/upload?district=${d.slug}`,
    );
  });

  it("shows the empty state when nothing matches", async () => {
    const ui = await GalleryPage({
      params: Promise.resolve({ lang: "en" }),
      searchParams: Promise.resolve({ q: "zzzz-nothing-like-this" }),
    });
    renderWithI18n(ui, { locale: "en" });
    expect(screen.getByText(en("gallery.emptyFiltered"))).toBeInTheDocument();
  });

  it("shows a photo with its uploader, like button, comments and report, and 404s others", async () => {
    const id = addPhoto({ uploaderName: "Anis", caption: "Boats at dawn" });
    const ui = await PhotoPage({ params: Promise.resolve({ lang: "en", id: String(id) }) });
    renderWithI18n(ui, { locale: "en" });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Boats at dawn");
    expect(screen.getAllByText(en("photo.by", { name: "Anis" })).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /Like/ })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: en("report.button") })).toBeInTheDocument();
    expect(screen.getByLabelText(en("photo.commentBody"))).toHaveAttribute("maxlength", "100");

    // Liking goes to the API and sticks.
    await userEvent.click(screen.getByRole("button", { name: /Like/ }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Remove like/ })).toHaveAttribute(
        "aria-pressed",
        "true",
      ),
    );

    const pending = addPhoto({ status: "pending" });
    await expect(
      PhotoPage({ params: Promise.resolve({ lang: "en", id: String(pending) }) }),
    ).rejects.toThrow();
  });
});

describe("place page community actions", () => {
  it("turns on Add to trending and the private tips form", async () => {
    const user = userEvent.setup();
    const ui = await PlacePage({ params: Promise.resolve({ lang: "en", slug: "kuakata-beach" }) });
    renderWithI18n(ui, { locale: "en" });
    const [trend] = screen.getAllByRole("button", { name: /Add to trending/ });
    expect(trend).toBeEnabled();
    await user.click(trend!);
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/You voted for Kuakata/)).toBeInTheDocument();
    expect(getDb().select().from(trendVotes).all().length).toBeGreaterThan(0);
    await user.click(within(dialog).getByRole("button", { name: en("common.close") }));

    await user.click(screen.getByRole("button", { name: en("place.tipButton") }));
    const tips = await screen.findByRole("dialog");
    await user.type(within(tips).getByLabelText(en("tips.body")), "The ticket counter moved.");
    await user.click(within(tips).getByRole("button", { name: en("tips.send") }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    const saved = getDb().select().from(guideSuggestions).all().at(-1)!;
    expect(saved).toMatchObject({ kind: "correction", body: "The ticket counter moved." });
  });
});

describe("posts, suggestions and the home page", () => {
  it("lets a signed-in user write a post with emoji from the profile", async () => {
    const user = await makeUser();
    session.current = {
      user,
      token: "t",
      csrfToken: "c",
      expiresAt: new Date(Date.now() + 1e9),
      renewed: false,
    };
    const ui = await ProfilePage({
      params: Promise.resolve({ lang: "en" }),
      searchParams: Promise.resolve({ tab: "posts", new: "post" }),
    });
    renderWithI18n(ui, { locale: "en" });
    expect(screen.getByRole("heading", { name: en("posts.composerTitle") })).toBeInTheDocument();
    const box = screen.getByLabelText(en("posts.body"));
    await userEvent.type(box, "Sunrise at Kuakata ");
    await userEvent.click(screen.getByRole("button", { name: en("posts.emoji") }));
    await userEvent.click(screen.getByRole("button", { name: "🌄" }));
    expect(box).toHaveValue("Sunrise at Kuakata 🌄");
  });

  it("shows approved posts and suggestions on the home page with working reactions", async () => {
    const author = await makeUser("Mahfuz");
    getDb()
      .insert(posts)
      .values({ userId: author.id, body: "Tea gardens after rain", status: "approved" })
      .run();
    getDb()
      .insert(posts)
      .values({ userId: author.id, body: "Still waiting", status: "pending" })
      .run();
    const suggestionId = getDb()
      .insert(suggestions)
      .values({ kind: "food", name: "Kalojam", districtId: 3, status: "approved" })
      .returning({ id: suggestions.id })
      .get().id;

    const ui = await HomePage({ params: Promise.resolve({ lang: "en" }) });
    renderWithI18n(ui, { locale: "en" });
    expect(screen.getByText("Tea gardens after rain")).toBeInTheDocument();
    expect(screen.queryByText("Still waiting")).not.toBeInTheDocument();
    const card = screen.getByRole("heading", { name: "Kalojam" }).closest("article")!;
    await userEvent.click(within(card).getByRole("button", { name: /Upvote/ }));
    await waitFor(() =>
      expect(
        getDb().select().from(suggestions).where(eq(suggestions.id, suggestionId)).get()?.votes,
      ).toBe(1),
    );
  });

  it("sends a place suggestion from /suggest", async () => {
    const user = userEvent.setup();
    const ui = await SuggestPage({
      params: Promise.resolve({ lang: "en" }),
      searchParams: Promise.resolve({ kind: "place" }),
    });
    renderWithI18n(ui, { locale: "en" });
    await user.type(screen.getByLabelText(en("suggest.name")), "Hidden lake");
    await user.selectOptions(screen.getByLabelText(en("suggest.district")), "bandarban");
    await user.click(screen.getByRole("button", { name: en("suggest.send") }));
    expect(await screen.findByText(en("suggest.sent"))).toBeInTheDocument();
    const row = getDb().select().from(suggestions).all().at(-1)!;
    expect(row).toMatchObject({ kind: "place", name: "Hidden lake", status: "pending" });
  });
});
