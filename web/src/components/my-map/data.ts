import { contentLocale, type Locale } from "@/i18n/locales";
import { listDistrictsByDivision } from "@/server/data";
import type { MyDivision } from "./types";

/** The eight divisions with their districts, named in the page's content language. */
export async function myMapDivisions(locale: Locale): Promise<MyDivision[]> {
  const groups = await listDistrictsByDivision(contentLocale(locale));
  return groups.map((g) => ({
    slug: g.slug,
    name: g.name,
    districts: g.districts.map((d) => ({
      id: d.id,
      slug: d.slug,
      name: d.name,
      nameBn: d.nameBn,
      nameEn: d.nameEn,
    })),
  }));
}
