/**
 * Site navigation: the bottom tab bar, the header menu and the footer columns (FEATURES.md
 * §1.2, §1.3, §1.6). Paths are written without a locale; build links with `localePath()`.
 */
import type { IconName } from "@/components/ui/icons.generated";
import { LOCALES } from "@/i18n/locales";
import type { MessageKey } from "@/i18n/translate";

export type NavItem = { path: string; label: MessageKey; icon?: IconName };
export type NavSection = { title: MessageKey; items: NavItem[] };

/** The five tabs, in order (DESIGN.md §4.2). */
export const TAB_ITEMS: readonly NavItem[] = [
  { path: "/", label: "nav.home", icon: "home" },
  { path: "/my-bangladesh", label: "nav.myBangladesh", icon: "my-map" },
  { path: "/explore", label: "nav.explore", icon: "explore" },
  { path: "/plan", label: "nav.planner", icon: "planner" },
  { path: "/gallery", label: "nav.gallery", icon: "gallery" },
];

/** The header menu: every section of the site. */
export const MENU_SECTIONS: readonly NavSection[] = [
  {
    title: "menu.explore",
    items: [
      { path: "/", label: "nav.home", icon: "home" },
      { path: "/my-bangladesh", label: "nav.myBangladesh", icon: "my-map" },
      { path: "/explore", label: "nav.explore", icon: "explore" },
      { path: "/plan", label: "nav.planner", icon: "planner" },
      { path: "/gallery", label: "nav.gallery", icon: "gallery" },
      { path: "/unseen", label: "nav.unseen", icon: "pin" },
    ],
  },
  {
    title: "menu.plan",
    items: [
      { path: "/routes", label: "nav.routes", icon: "bus" },
      { path: "/trains", label: "nav.trains", icon: "train" },
      { path: "/safety", label: "nav.safety", icon: "emergency" },
      { path: "/world", label: "nav.world", icon: "world" },
    ],
  },
  {
    title: "menu.play",
    items: [
      { path: "/play", label: "nav.play", icon: "quiz" },
      { path: "/upload", label: "nav.upload", icon: "upload" },
    ],
  },
  {
    title: "menu.site",
    items: [
      { path: "/about", label: "nav.about", icon: "users" },
      { path: "/about#privacy", label: "nav.privacy", icon: "shield" },
      { path: "/profile", label: "nav.profile", icon: "user" },
      { path: "/my-listings", label: "nav.myListings", icon: "shopping" },
    ],
  },
];

/** Footer link columns. The divisions column is built from data (8 links to /best-places). */
export const FOOTER_SECTIONS: readonly NavSection[] = [
  {
    title: "footer.explore",
    items: [
      { path: "/explore", label: "nav.explore" },
      { path: "/unseen", label: "nav.unseen" },
      { path: "/best-places", label: "nav.bestPlaces" },
      { path: "/bucket-list", label: "nav.bucketList" },
      { path: "/gallery", label: "nav.gallery" },
    ],
  },
  {
    title: "footer.nearby",
    items: [
      { path: "/near-me", label: "nav.nearMe" },
      { path: "/stay", label: "nav.stay" },
      { path: "/restaurants", label: "nav.restaurants" },
      { path: "/shopping", label: "nav.shopping" },
      { path: "/listings", label: "nav.listings" },
      { path: "/add-listing", label: "nav.addListing" },
    ],
  },
  {
    title: "footer.tripPlanning",
    items: [
      { path: "/plan", label: "nav.planner" },
      { path: "/trip-cost", label: "nav.tripCost" },
      { path: "/routes", label: "nav.routes" },
      { path: "/trains", label: "nav.trains" },
      { path: "/safety", label: "nav.safety" },
    ],
  },
  {
    title: "footer.foreignTravel",
    items: [
      { path: "/foreign-tour", label: "nav.foreignTour" },
      { path: "/world", label: "nav.world" },
    ],
  },
  {
    title: "footer.topPlayers",
    items: [
      { path: "/play", label: "nav.leaderboards" },
      { path: "/quiz/bangladesh", label: "nav.districtQuiz" },
      { path: "/quiz/famous", label: "nav.famousQuiz" },
    ],
  },
];

/** Small print links at the bottom of the footer. */
export const FOOTER_LEGAL: readonly NavItem[] = [
  { path: "/about", label: "nav.about" },
  { path: "/safety", label: "nav.safety" },
  { path: "/about#privacy", label: "nav.privacy" },
];

/**
 * The path without its locale prefix: `/en/explore` → `/explore`, `/bn` → `/`, `/explore` →
 * `/explore`. Also handles the internal `/bn/…` form (rewritten Bengali URLs).
 */
export function stripLocale(pathname: string | null | undefined): string {
  if (!pathname) return "/";
  const [path = "/"] = pathname.split(/[?#]/);
  const parts = path.split("/").filter(Boolean);
  if (parts.length && (LOCALES as readonly string[]).includes(parts[0]!)) parts.shift();
  return `/${parts.join("/")}`;
}

/** Whether a nav item is the current page: Home only on `/`, others on their path or below it. */
export function isActivePath(itemPath: string, currentPath: string): boolean {
  const item = stripLocale(itemPath);
  const current = stripLocale(currentPath);
  if (item === "/") return current === "/";
  return current === item || current.startsWith(`${item}/`);
}
