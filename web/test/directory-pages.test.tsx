import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import AddListingPage from "@/app/[lang]/add-listing/page";
import AdminPage from "@/app/[lang]/admin/page";
import ListingPage from "@/app/[lang]/listing/[id]/page";
import ListingsPage from "@/app/[lang]/listings/page";
import MyListingsPage from "@/app/[lang]/my-listings/page";
import RestaurantsPage from "@/app/[lang]/restaurants/page";
import StayPage from "@/app/[lang]/stay/page";
import { AdminConsole } from "@/components/admin/AdminConsole";
import { AddListingForm } from "@/components/listings/AddListingForm";
import { getT } from "@/i18n/messages";
import { resetAccountForTests } from "@/lib/account/client";
import { DEFAULT_TIERS } from "@/lib/listings/rules";
import type { PipelineDeps } from "@/lib/media/prepare";
import type { AuthContext } from "@/server/auth/session";
import { resetAuthLimits } from "@/server/auth/limits";
import { registerWithPassword, type UserRow } from "@/server/auth/users";
import { resetCommunityLimits } from "@/server/community/http";
import { getDb } from "@/server/db/client";
import { listings, users } from "@/server/db/schema";
import { TestBrowser } from "./account-helpers";
import { renderWithI18n } from "./i18n";
import { TINY_JPEG } from "./media-fixtures";

const en = getT("en");
const bn = getT("bn");

const session: { current: AuthContext | null } = { current: null };
vi.mock("@/server/auth/current", () => ({ currentSession: async () => session.current }));
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/en",
}));

const params = (lang: string) => ({ params: Promise.resolve({ lang }) });
const withQuery = (lang: string, query: Record<string, string> = {}) => ({
  params: Promise.resolve({ lang }),
  searchParams: Promise.resolve(query),
});

function insertListing(values: Partial<typeof listings.$inferInsert> = {}) {
  return getDb()
    .insert(listings)
    .values({
      kind: "business",
      category: "hotel",
      sizeTier: "small",
      name: "Cloud Nine Cottage",
      districtId: 3,
      area: "Nilgiri",
      description: "Quiet rooms.",
      phone: "01712345678",
      status: "approved",
      ...values,
    })
    .returning({ id: listings.id })
    .get().id;
}

async function userRow(): Promise<UserRow> {
  const result = await registerWithPassword({
    email: `owner.${Date.now()}.${Math.random()}@example.com`,
    password: "correct horse battery",
    name: "Owner",
  });
  if (!result.ok) throw new Error("could not register");
  return result.user;
}

const asSession = (user: UserRow): AuthContext => ({
  user,
  token: "t",
  csrfToken: "c",
  expiresAt: new Date(Date.now() + 1e9),
  renewed: false,
});

beforeEach(() => {
  session.current = null;
  resetAccountForTests();
});

describe("/stay, /restaurants", () => {
  it("lists the seeded hotels and resorts with area chips and a details dialog", async () => {
    const user = userEvent.setup();
    renderWithI18n(await StayPage(params("en")));
    expect(
      screen.getByRole("heading", { level: 1, name: en("directory.stay.title") }),
    ).toBeInTheDocument();
    const hotels = screen.getByRole("region", { name: en("directory.section.hotels") });
    expect(
      within(hotels).getByRole("heading", { name: "InterContinental Dhaka by IHG" }),
    ).toBeInTheDocument();

    // Area chips filter the group.
    const hotelChips = within(within(hotels).getByRole("group", { name: en("directory.areas") }));
    await user.click(hotelChips.getByRole("button", { name: /Khulna/ }));
    expect(within(hotels).queryByText("InterContinental Dhaka by IHG")).not.toBeInTheDocument();
    expect(within(hotels).getByText("Jatra Flagship Khulna City Centre")).toBeInTheDocument();
    await user.click(hotelChips.getByRole("button", { name: en("directory.allAreas") }));

    const resorts = screen.getByRole("region", { name: en("directory.section.resorts") });
    const resortChips = within(within(resorts).getByRole("group", { name: en("directory.areas") }));
    expect(resortChips.getByRole("button", { name: /Inani/ })).toBeInTheDocument();
    expect(resortChips.getByRole("button", { name: /Cox's Bazar/ })).toBeInTheDocument();

    await user.click(within(resorts).getByRole("button", { name: /Baywatch/ }));
    const dialog = screen.getByRole("dialog", { name: "Baywatch" });
    expect(within(dialog).getByText("Resort")).toBeInTheDocument();
    expect(within(dialog).getByText("Inani, Cox's Bazar")).toBeInTheDocument();
    expect(within(dialog).getByText("4.6")).toBeInTheDocument();
    expect(within(dialog).getByText(en("ui.reviews", { count: 2308 }))).toBeInTheDocument();
    expect(within(dialog).getByText("Google Maps")).toBeInTheDocument();
    const maps = within(dialog).getByRole("link", { name: new RegExp(en("directory.openMaps")) });
    expect(maps).toHaveAttribute(
      "href",
      expect.stringContaining("https://www.google.com/maps/search/"),
    );
    expect(maps.getAttribute("href")).toContain(encodeURIComponent("Baywatch"));
  });

  it("shows approved owner listings in their own section, sponsored ones labelled", async () => {
    const hotel = insertListing({ name: "Sponsored Sands Hotel", sponsored: true });
    insertListing({ name: "Pending Palace", status: "pending" });
    insertListing({ name: "Rice and Fish Corner", kind: "food", category: null });
    renderWithI18n(await StayPage(params("en")));
    const owners = screen.getByRole("region", { name: en("directory.ownersTitle") });
    expect(
      within(owners).getByRole("heading", { name: "Sponsored Sands Hotel" }),
    ).toBeInTheDocument();
    expect(within(owners).getByText(en("common.sponsored"))).toBeInTheDocument();
    expect(screen.queryByText("Pending Palace")).not.toBeInTheDocument();
    expect(screen.queryByText("Rice and Fish Corner")).not.toBeInTheDocument();
    getDb().delete(listings).where(eq(listings.id, hotel)).run();

    // Home food shows on the restaurants page.
    renderWithI18n(await RestaurantsPage(params("en")));
    expect(
      await screen.findByRole("heading", { name: "Rice and Fish Corner" }),
    ).toBeInTheDocument();
  });

  it("labels sponsored items in Bengali as বিজ্ঞাপন / Sponsored", async () => {
    insertListing({ name: "বিজ্ঞাপন হোটেল", sponsored: true });
    renderWithI18n(await StayPage(params("bn")), { locale: "bn" });
    expect(screen.getByText(bn("common.sponsored"))).toHaveTextContent("বিজ্ঞাপন / Sponsored");
  });
});

describe("/listings and /listing/:id", () => {
  it("filters by kind and shows prices, contact buttons and reviews", async () => {
    const id = insertListing({
      name: "Shumi's Pitha",
      kind: "food",
      category: null,
      whatsapp: "01812345678",
      socialUrl: "https://facebook.com/shumi",
    });
    getDb()
      .$client.prepare(
        "INSERT INTO listing_prices (listing_id, position, item, amount, unit) VALUES (?, 0, 'Patishapta', 40, 'each')",
      )
      .run(id);
    getDb()
      .$client.prepare(
        "INSERT INTO listing_reviews (listing_id, name, rating, body, status) VALUES (?, 'Mitu', 4, 'Tasty', 'approved')",
      )
      .run(id);

    renderWithI18n(await ListingsPage(withQuery("en", { kind: "food" })));
    expect(screen.getByRole("heading", { name: "Shumi's Pitha" })).toBeInTheDocument();
    expect(screen.queryByText("Cloud Nine Cottage")).not.toBeInTheDocument();

    renderWithI18n(await ListingPage({ params: Promise.resolve({ lang: "en", id: String(id) }) }));
    expect(screen.getByRole("heading", { level: 1, name: "Shumi's Pitha" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: new RegExp(en("listing.call")) })).toHaveAttribute(
      "href",
      "tel:01712345678",
    );
    expect(screen.getByRole("link", { name: new RegExp(en("listing.whatsapp")) })).toHaveAttribute(
      "href",
      "https://wa.me/8801812345678",
    );
    expect(screen.getByRole("link", { name: new RegExp(en("listing.social")) })).toHaveAttribute(
      "href",
      "https://facebook.com/shumi",
    );
    expect(screen.getByText("Patishapta")).toBeInTheDocument();
    expect(screen.getByText("৳40")).toBeInTheDocument();
    expect(screen.getByText("Tasty")).toBeInTheDocument();
  });

  it("hides pending listings from the public but not from their owner", async () => {
    const owner = await userRow();
    const id = insertListing({ name: "Secret Stay", status: "pending", userId: owner.id });
    await expect(
      ListingPage({ params: Promise.resolve({ lang: "en", id: String(id) }) }),
    ).rejects.toThrow(/NEXT_HTTP_ERROR_FALLBACK;404/);
    session.current = asSession(owner);
    renderWithI18n(await ListingPage({ params: Promise.resolve({ lang: "en", id: String(id) }) }));
    expect(screen.getByRole("heading", { level: 1, name: "Secret Stay" })).toBeInTheDocument();
    expect(screen.getByText(en("myListings.note.pending"))).toBeInTheDocument();
  });
});

describe("/my-listings and /admin", () => {
  it("asks guests to sign in and shows an owner's listings with their status", async () => {
    renderWithI18n(await MyListingsPage(params("en")));
    expect(screen.getByText(en("myListings.signIn"))).toBeInTheDocument();

    const owner = await userRow();
    insertListing({ name: "My Waiting Place", status: "pending", userId: owner.id });
    insertListing({ name: "My Live Place", userId: owner.id });
    session.current = asSession(owner);
    renderWithI18n(await MyListingsPage(params("en")));
    expect(screen.getByText(en("myListings.status.pending"))).toBeInTheDocument();
    expect(screen.getByText(en("myListings.status.approved"))).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Edit: My Waiting Place/ })).toHaveAttribute(
      "href",
      expect.stringContaining("/add-listing?edit="),
    );
    expect(screen.getByRole("button", { name: /Delete: My Live Place/ })).toBeInTheDocument();
  });

  it("is a 404 for everyone but admins", async () => {
    await expect(AdminPage(params("en"))).rejects.toThrow(/NEXT_HTTP_ERROR_FALLBACK;404/);
    const user = await userRow();
    session.current = asSession(user);
    await expect(AdminPage(params("en"))).rejects.toThrow(/NEXT_HTTP_ERROR_FALLBACK;404/);
    getDb().update(users).set({ role: "admin" }).where(eq(users.id, user.id)).run();
    session.current = asSession({ ...user, role: "admin" });
    renderWithI18n(await AdminPage(params("en")));
    expect(screen.getByRole("heading", { level: 1, name: "Admin" })).toBeInTheDocument();
  });

  it("only lets the owner open the edit form", async () => {
    const owner = await userRow();
    const id = insertListing({ userId: owner.id, name: "Mine To Edit" });
    await expect(AddListingPage(withQuery("en", { edit: String(id) }))).rejects.toThrow(
      /NEXT_HTTP_ERROR_FALLBACK;404/,
    );
    session.current = asSession(await userRow());
    await expect(AddListingPage(withQuery("en", { edit: String(id) }))).rejects.toThrow(
      /NEXT_HTTP_ERROR_FALLBACK;404/,
    );
    session.current = asSession(owner);
    renderWithI18n(await AddListingPage(withQuery("en", { edit: String(id) })));
    expect(screen.getByLabelText(en("addListing.name"))).toHaveValue("Mine To Edit");
  });
});

describe("<AddListingForm>", () => {
  let mediaRoot: string;
  const browser = new TestBrowser();
  const sent: FormData[] = [];
  const divisions = [
    {
      slug: "chattogram",
      name: "Chattogram",
      districts: [{ slug: "bandarban", name: "Bandarban" }],
    },
  ];
  const pipeline: PipelineDeps = {
    decode: async () => ({ source: {} as CanvasImageSource, width: 800, height: 600 }),
    encode: async (_img, _w, _h, type) =>
      new Blob([TINY_JPEG as BlobPart], { type: type || "image/jpeg" }),
  };

  beforeAll(() => {
    mediaRoot = mkdtempSync(join(tmpdir(), "ubd-addlisting-"));
    process.env.MEDIA_DIR = mediaRoot;
  });
  afterAll(() => {
    rmSync(mediaRoot, { recursive: true, force: true });
    delete process.env.MEDIA_DIR;
  });
  beforeEach(() => {
    resetAuthLimits();
    resetCommunityLimits();
    sent.length = 0;
    vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.body && typeof init.body === "object" && "entries" in init.body) {
        sent.push(init.body as FormData);
      }
      return browser.fetch(input, init);
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  const form = (kind: "business" | "food" | "product" = "business") =>
    renderWithI18n(
      <AddListingForm
        divisions={divisions}
        tiers={DEFAULT_TIERS}
        initialKind={kind}
        pipeline={pipeline}
      />,
    );

  it("has type tabs, size cards with the tier limits, a honeypot and checks before sending", async () => {
    const user = userEvent.setup();
    const { container } = form();
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual([
      en("listings.kind.business"),
      en("listings.kind.food"),
      en("listings.kind.product"),
    ]);
    const sizes = screen.getAllByRole("radio");
    expect(sizes).toHaveLength(3);
    expect(sizes[0]).toBeChecked();
    expect(
      screen.getByText(en("addListing.tierLimits", { prices: 12, min: 3, max: 8 })),
    ).toBeInTheDocument();
    expect(container.querySelector('input[type="text"][tabindex="-1"]')).toBeInTheDocument();

    // Price rows are limited by the size: small allows 5.
    const add = screen.getByRole("button", { name: en("addListing.addPrice") });
    for (let i = 0; i < 6; i++) if (!(add as HTMLButtonElement).disabled) await user.click(add);
    expect(screen.getAllByPlaceholderText(en("addListing.priceItem"))).toHaveLength(5);
    expect(add).toBeDisabled();
    await user.click(screen.getByRole("radio", { name: new RegExp(en("addListing.tier.large")) }));
    expect(add).toBeEnabled();

    await user.click(screen.getByRole("button", { name: en("addListing.submit") }));
    expect(screen.getByText(en("addListing.errRequired"))).toBeInTheDocument();
    expect(sent).toHaveLength(0);
  });

  it("sends a listing end to end and says it is waiting for review", async () => {
    const user = userEvent.setup();
    const { container } = form("food");
    await user.click(screen.getByRole("radio", { name: new RegExp(en("addListing.tier.small")) }));
    await user.type(screen.getByLabelText(en("addListing.name")), "Mitu's Pitha");
    await user.selectOptions(screen.getByLabelText(en("addListing.district")), "bandarban");
    await user.type(screen.getByLabelText(en("addListing.description")), "Fresh winter pitha.");
    await user.type(screen.getByLabelText(en("addListing.contactName")), "Mitu");
    await user.type(screen.getByLabelText(new RegExp(`^${en("addListing.phone")}`)), "01712345678");
    await user.type(screen.getAllByPlaceholderText(en("addListing.priceItem"))[0]!, "Patishapta");
    await user.type(screen.getAllByPlaceholderText(en("addListing.priceAmount"))[0]!, "40");
    const files = [1, 2, 3].map(
      (n) => new File([TINY_JPEG as BlobPart], `p${n}.jpg`, { type: "image/jpeg" }),
    );
    await user.upload(container.querySelector<HTMLInputElement>('input[type="file"]')!, files);
    await waitFor(() => expect(screen.getAllByAltText(/./).length).toBeGreaterThanOrEqual(3));
    await user.click(screen.getByRole("button", { name: en("addListing.submit") }));

    expect(await screen.findByText(en("addListing.doneBody"))).toBeInTheDocument();
    expect(sent).toHaveLength(1);
    expect(sent[0]!.get("kind")).toBe("food");
    expect(sent[0]!.get("prices")).toBe(
      JSON.stringify([{ item: "Patishapta", amount: 40, unit: "" }]),
    );
    const row = getDb().select().from(listings).where(eq(listings.name, "Mitu's Pitha")).get()!;
    expect(row.status).toBe("pending");
  });
});

describe("<AdminConsole>", () => {
  const boss = new TestBrowser();
  beforeEach(() => {
    vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) =>
      boss.fetch(input, init),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it("lists every queue with its pending count, then stars and daily stats", async () => {
    const email = `boss.${Date.now()}@example.com`;
    expect((await boss.register(email)).status).toBe(201);
    getDb().update(users).set({ role: "admin" }).where(eq(users.email, email)).run();
    insertListing({ name: "Waiting Hotel", status: "pending" });

    const user = userEvent.setup();
    renderWithI18n(<AdminConsole today="2026-03-04" locale="en" />);
    const listingsTab = await screen.findByRole("tab", { name: /^Listings \(\d+\)$/ });
    for (const name of [
      /^Photos/,
      /^Posts/,
      /^Comments/,
      /^Suggestions/,
      /^Tips and corrections/,
      /^Listing reviews/,
      /^Reports/,
      /^Leaderboard names/,
    ]) {
      expect(screen.getByRole("tab", { name })).toBeInTheDocument();
    }
    await user.click(listingsTab);
    expect((await screen.findAllByText("Waiting Hotel")).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /Mark sponsored \(0\)/ })).toBeDisabled(); // nothing selected yet

    await user.click(screen.getByRole("tab", { name: "Editorial stars" }));
    expect(await screen.findAllByRole("combobox", { name: /Score for/ })).not.toHaveLength(0);
    await user.click(screen.getByRole("tab", { name: "Daily stats" }));
    expect(await screen.findByText("Top pages")).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "Admin log" }));
    expect(await screen.findByText(/Every action taken here/)).toBeInTheDocument();
  });
});
