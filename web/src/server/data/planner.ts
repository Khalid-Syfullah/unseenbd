import type { PlannerDistrict, PlannerPlace } from "@/lib/planner/types";
import { listDistrictsByDivision } from "./districts";
import type { Lang } from "./lang";
import { allPlaces } from "./places";

export type PlannerDistrictInfo = PlannerDistrict & { name: string; division: string };

export type PlannerPlaceInfo = PlannerPlace & {
  slug: string;
  name: string;
  kind: string;
  kindLabel: string;
};

export type PlannerDivision = { slug: string; name: string; districts: PlannerDistrictInfo[] };

export type PlannerData = {
  divisions: PlannerDivision[];
  districts: PlannerDistrictInfo[];
  places: PlannerPlaceInfo[];
};

/** Everything the trip planner and the trip cost calculator need, small enough to ship to the page. */
export async function getPlannerData(lang: Lang = "bn"): Promise<PlannerData> {
  const [groups, places] = await Promise.all([listDistrictsByDivision(lang), allPlaces({ lang })]);
  const divisions = groups.map((g) => ({
    slug: g.slug,
    name: g.name,
    districts: g.districts.map((d) => ({
      id: d.id,
      slug: d.slug,
      name: d.name,
      division: d.division,
      lat: d.lat,
      lng: d.lng,
    })),
  }));
  return {
    divisions,
    districts: divisions.flatMap((d) => d.districts).sort((a, b) => a.id - b.id),
    places: places.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      districtId: p.district.id,
      kind: p.kind.key,
      kindLabel: p.kind.label,
      popular: p.popular,
      visitHours: p.visitHours,
      stars: p.stars,
    })),
  };
}
