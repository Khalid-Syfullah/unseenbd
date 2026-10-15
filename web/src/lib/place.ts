/** Pure helpers for the place page: map links, embed code, checklist group, one-day trip. */

export type Essential = {
  key: "hotels" | "food" | "worship" | "hospital" | "police" | "atm" | "toilets";
  /** What Google Maps is asked to find (English, which Maps understands everywhere). */
  query: string;
};

/** The seven "nearby essentials" searches. */
export const ESSENTIALS: readonly Essential[] = [
  { key: "hotels", query: "hotels" },
  { key: "food", query: "restaurants" },
  { key: "worship", query: "mosques and places of worship" },
  { key: "hospital", query: "hospitals and pharmacies" },
  { key: "police", query: "police station" },
  { key: "atm", query: "ATMs and banks" },
  { key: "toilets", query: "public toilets and parking" },
];

/** Google Maps search for `query` around a point. */
export function mapsSearchUrl(query: string, lat: number, lng: number): string {
  return `https://www.google.com/maps/search/${encodeURIComponent(query)}/@${lat},${lng},15z`;
}

/** Google Maps embed address for a point (works without a key). */
export function mapsEmbedUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}&z=14&output=embed`;
}

const escapeAttr = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** The iframe snippet visitors copy to show the place on their own page. */
export function embedSnippet(name: string, lat: number, lng: number): string {
  return (
    `<iframe src="${escapeAttr(mapsEmbedUrl(lat, lng))}" width="600" height="450" ` +
    `style="border:0" loading="lazy" referrerpolicy="no-referrer-when-downgrade" ` +
    `title="${escapeAttr(name)}"></iframe>`
  );
}

export type ChecklistGroup = "water" | "trek" | "culture" | "town";

/** Which type-specific checklist a place kind gets. */
export function checklistGroup(kind: string): ChecklistGroup {
  switch (kind) {
    case "beach":
    case "island":
    case "river":
      return "water";
    case "hill":
    case "waterfall":
    case "forest":
      return "trek";
    case "heritage":
    case "spiritual":
      return "culture";
    default:
      return "town";
  }
}

export type DayStop = { slug: string; name: string; visitHours: number };

/**
 * A one-day trip: the place plus up to two of its nearest neighbours, skipping any that would push
 * the day past `maxHours` of sightseeing. Empty when there is nobody to add.
 */
export function oneDayTrip(
  place: DayStop,
  neighbours: readonly DayStop[],
  maxHours = 10,
): { stops: DayStop[]; hours: number } {
  const stops = [place];
  let hours = place.visitHours;
  for (const n of neighbours) {
    if (stops.length >= 3) break;
    if (n.slug === place.slug || stops.some((s) => s.slug === n.slug)) continue;
    if (hours + n.visitHours > maxHours) continue;
    stops.push(n);
    hours += n.visitHours;
  }
  return stops.length > 1 ? { stops, hours } : { stops: [], hours: 0 };
}
