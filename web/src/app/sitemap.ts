import type { MetadataRoute } from "next";
import { localePath, type Locale } from "@/i18n/locales";
import { SITE_URL } from "@/lib/site";
import {
  allPlaces,
  listDistricts,
  listKinds,
  listMonths,
  listRoutes,
  listTrains,
} from "@/server/data";

/** Rebuilt at most once an hour; the content only changes when the database is re-seeded. */
export const revalidate = 3600;

const LOCALES: readonly Locale[] = ["bn", "en"];

/** Public pages with no parameters (account, admin and share-link pages are left out). */
const STATIC_PATHS = [
  "/",
  "/explore",
  "/best-places",
  "/unseen",
  "/near-me",
  "/plan",
  "/trip-cost",
  "/routes",
  "/trains",
  "/safety",
  "/foreign-tour",
  "/about",
  "/world",
  "/my-bangladesh",
  "/bucket-list",
  "/gallery",
  "/upload",
  "/suggest",
  "/stay",
  "/restaurants",
  "/shopping",
  "/listings",
  "/play",
  "/quiz/bangladesh",
  "/quiz/famous",
  "/quiz/personality",
];

type Item = { path: string; priority: number; images?: string[] };

function entries(items: Item[]): MetadataRoute.Sitemap {
  const abs = (p: string) => `${SITE_URL}${p}`;
  return items.flatMap((item) =>
    LOCALES.map((locale) => ({
      url: abs(localePath(locale, item.path)),
      changeFrequency: "weekly" as const,
      priority: item.priority,
      alternates: {
        languages: Object.fromEntries(
          LOCALES.map((l) => [l, abs(localePath(l, item.path))] as const),
        ),
      },
      ...(item.images?.length ? { images: item.images.map(abs) } : {}),
    })),
  );
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [districts, places, kinds, months, routes, trains] = await Promise.all([
    listDistricts("en"),
    allPlaces({ lang: "en" }),
    listKinds("en"),
    listMonths("en"),
    listRoutes("en"),
    listTrains("en"),
  ]);

  return entries([
    ...STATIC_PATHS.map((path) => ({ path, priority: path === "/" ? 1 : 0.7 })),
    ...districts.map((d) => ({ path: `/district/${d.slug}`, priority: 0.8 })),
    ...places.map((p) => {
      const image = p.photo?.src ?? p.cover?.w1200;
      return { path: `/place/${p.slug}`, priority: 0.8, images: image ? [image] : undefined };
    }),
    ...kinds.map((k) => ({ path: `/kind/${k.key}`, priority: 0.6 })),
    ...months.map((m) => ({ path: `/month/${m.slug}`, priority: 0.6 })),
    ...routes.map((r) => ({ path: `/route/${r.slug}`, priority: 0.5 })),
    ...trains.map((t) => ({ path: `/train/${t.slug}`, priority: 0.5 })),
  ]);
}
