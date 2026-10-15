/**
 * District ids and slugs, as in `data/districts.json` (ids 1–64). A tiny table so the browser
 * stores can turn slugs into ids without loading the district data or the map paths.
 * `districts.test.ts` checks it against the data.
 */
export const DISTRICT_SLUGS = [
  "dhaka",
  "faridpur",
  "gazipur",
  "gopalganj",
  "kishoreganj",
  "madaripur",
  "manikganj",
  "munshiganj",
  "narayanganj",
  "narsingdi",
  "rajbari",
  "shariatpur",
  "tangail",
  "bandarban",
  "brahmanbaria",
  "chandpur",
  "chattogram",
  "cumilla",
  "coxs-bazar",
  "feni",
  "khagrachhari",
  "lakshmipur",
  "noakhali",
  "rangamati",
  "habiganj",
  "moulvibazar",
  "sunamganj",
  "sylhet",
  "barguna",
  "barishal",
  "bhola",
  "jhalokathi",
  "patuakhali",
  "pirojpur",
  "bagerhat",
  "chuadanga",
  "jashore",
  "jhenaidah",
  "khulna",
  "kushtia",
  "magura",
  "meherpur",
  "narail",
  "satkhira",
  "bogura",
  "joypurhat",
  "naogaon",
  "natore",
  "chapainawabganj",
  "pabna",
  "rajshahi",
  "sirajganj",
  "dinajpur",
  "gaibandha",
  "kurigram",
  "lalmonirhat",
  "nilphamari",
  "panchagarh",
  "rangpur",
  "thakurgaon",
  "jamalpur",
  "mymensingh",
  "netrokona",
  "sherpur",
] as const;

/** 64. */
export const TOTAL_DISTRICTS = DISTRICT_SLUGS.length;

const ID_BY_SLUG = new Map<string, number>(DISTRICT_SLUGS.map((slug, i) => [slug, i + 1]));

/** True for a whole number 1–64. */
export function isDistrictId(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 1 && (value as number) <= TOTAL_DISTRICTS;
}

/** The id of a district slug, or null. */
export function districtIdOf(slug: string): number | null {
  return ID_BY_SLUG.get(slug) ?? null;
}

/** The slug of a district id, or null. */
export function districtSlugOf(id: number): string | null {
  return isDistrictId(id) ? DISTRICT_SLUGS[id - 1]! : null;
}

/** Valid ids, without duplicates, ascending. */
export function cleanDistrictIds(ids: Iterable<unknown>): number[] {
  const set = new Set<number>();
  for (const id of ids) if (isDistrictId(id)) set.add(id);
  return [...set].sort((a, b) => a - b);
}
