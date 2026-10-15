import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthForm } from "@/components/account/AuthForm";
import { AccountSlot } from "@/components/account/AccountSlot";
import { getT } from "@/i18n/messages";
import { signInWithPassword, signOut } from "@/lib/account/auth";
import { getAccount, resetAccountForTests } from "@/lib/account/client";
import { uninstallAccountSync } from "@/lib/account/sync";
import { getBucket, setBucketStatus } from "@/lib/bucket";
import { getStoryState, setStoryDistrict } from "@/lib/visited/story";
import { getVisitedIds, setDistrictsVisited } from "@/lib/visited/visited";
import { getWorldMarks, setCountryMark } from "@/lib/visited/world";
import { resetAuthLimits } from "@/server/auth/limits";
import { accountLimiter } from "@/server/auth/http";
import { freshEmail, TestBrowser } from "./account-helpers";
import { renderWithI18n } from "./i18n";

const en = getT("en");

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/en/login",
}));

let browser: TestBrowser;

beforeEach(() => {
  resetAuthLimits();
  accountLimiter.reset();
  window.localStorage.clear();
  resetAccountForTests();
  browser = new TestBrowser();
  vi.spyOn(globalThis, "fetch").mockImplementation(browser.fetch);
});

afterEach(() => {
  uninstallAccountSync();
  vi.restoreAllMocks();
});

/** An account that already holds Sylhet and a story answer (from another device). */
async function existingAccount() {
  const email = freshEmail();
  const other = new TestBrowser();
  expect((await other.register(email)).status).toBe(201);
  await other.call("POST", "/api/me/visited", { json: { add: [28], remove: [] } });
  await other.call("POST", "/api/me/story", {
    json: { values: { work: 1 }, times: { work: 1 } },
  });
  return { email, other };
}

describe("signing in after using the site logged out", () => {
  it("keeps the districts, bucket list, world marks and story ticked before", async () => {
    const { email, other } = await existingAccount();

    // Logged out: tick two districts and more.
    setDistrictsVisited([1, 19], true);
    setBucketStatus("sajek-valley", "been");
    setCountryMark("NP", "wish");
    setStoryDistrict("birth", 64);

    const result = await signInWithPassword(email, "correct horse battery");
    expect(result.ok).toBe(true);
    expect(getAccount().status).toBe("user");

    // Nothing ticked before signing in was lost, and the account's own data came in.
    expect(getVisitedIds()).toEqual([1, 19, 28]);
    expect(getBucket()).toEqual({ "sajek-valley": "been" });
    expect(getWorldMarks()).toEqual({ NP: "wish" });
    expect(getStoryState().values).toMatchObject({ birth: 64, work: 1 });

    // And the account now holds it all (seen from the other device).
    const server = (await (await other.call("GET", "/api/me/visited")).json()) as { ids: number[] };
    expect(server.ids).toEqual([1, 19, 28]);

    // New ticks keep syncing.
    setDistrictsVisited([40], true);
    await waitFor(
      async () => {
        const now = (await (await other.call("GET", "/api/me/visited")).json()) as {
          ids: number[];
        };
        expect(now.ids).toEqual([1, 19, 28, 40]);
      },
      { timeout: 3000 },
    );
  });

  it("clears the local copies on sign-out but keeps them in the account", async () => {
    const { email, other } = await existingAccount();
    setDistrictsVisited([5], true);
    expect((await signInWithPassword(email, "correct horse battery")).ok).toBe(true);
    expect(getVisitedIds()).toEqual([5, 28]);

    await signOut();
    expect(getAccount().status).toBe("guest");
    expect(getVisitedIds()).toEqual([]);
    expect(getStoryState().values).toEqual({});
    expect(browser.cookies.has("ubd_session")).toBe(false);
    const kept = (await (await other.call("GET", "/api/me/visited")).json()) as { ids: number[] };
    expect(kept.ids).toEqual([5, 28]);

    // Ticking after sign-out stays local.
    setDistrictsVisited([7], true);
    await new Promise((r) => setTimeout(r, 450));
    const still = (await (await other.call("GET", "/api/me/visited")).json()) as { ids: number[] };
    expect(still.ids).toEqual([5, 28]);
  });

  it("shows an error for a wrong password", async () => {
    const { email } = await existingAccount();
    const result = await signInWithPassword(email, "not the password");
    expect(result).toEqual({ ok: false, error: "invalid_credentials" });
    expect(getAccount().status).toBe("guest");
  });
});

describe("the login form and header slot", () => {
  it("signs in from the form and the header shows the avatar", async () => {
    const user = userEvent.setup();
    const { email } = await existingAccount();
    renderWithI18n(
      <>
        <AccountSlot />
        <AuthForm mode="login" googleClientId={null} next={null} />
      </>,
    );
    expect(screen.getByRole("link", { name: en("nav.login") })).toBeInTheDocument();
    await user.type(screen.getByLabelText(en("account.email")), email);
    await user.type(screen.getByLabelText(en("account.password")), "correct horse battery");
    await user.click(screen.getByRole("button", { name: en("account.submitLogin") }));
    const avatar = await screen.findByRole("link", {
      name: en("header.account", { name: "Test Traveller" }),
    });
    expect(avatar).toHaveAttribute("href", "/en/profile");
  });

  it("says what went wrong", async () => {
    const user = userEvent.setup();
    renderWithI18n(<AuthForm mode="login" googleClientId={null} next={null} />);
    await user.type(screen.getByLabelText(en("account.email")), freshEmail());
    await user.type(screen.getByLabelText(en("account.password")), "whatever123");
    await user.click(screen.getByRole("button", { name: en("account.submitLogin") }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      en("account.errors.invalid_credentials"),
    );
  });

  it("has a name field and password hint when registering, and no Google button without a client id", () => {
    renderWithI18n(<AuthForm mode="register" googleClientId={null} next="/en/plan" />);
    expect(screen.getByLabelText(en("account.name"))).toBeRequired();
    expect(screen.getByText(en("account.passwordHint", { min: 8 }))).toBeInTheDocument();
    expect(screen.getByRole("link", { name: en("account.loginLink") })).toHaveAttribute(
      "href",
      "/en/login?next=%2Fen%2Fplan",
    );
    expect(document.querySelector('script[src*="accounts.google.com"]')).toBeNull();
  });
});
