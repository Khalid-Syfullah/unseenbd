/**
 * Shapes of the structured JSON stored in the database (and of the seed files they come from).
 * Field names follow `data/*.json` so the seed can copy them as they are.
 */

export type Confidence = "high" | "medium" | "low";

/** Photographer credit for a place photo (`places.json` → `image_credit`). */
export type ImageCredit = {
  by: string;
  license: string;
  source: string;
};

/** Illustrated cover of a place (`assets/places/index.json`), with public URLs. */
export type PlaceCover = {
  /** Public URL of the SVG original, e.g. `/places/svg/nilgiri-hill.svg`. */
  svg: string;
  /** Public URL of the 640 px WebP (cards). */
  w640: string;
  /** Public URL of the 1200 px WebP (detail pages). */
  w1200: string;
  scene: string;
  variant: string;
  mood: string;
};

/**
 * A real Wikimedia Commons photo of a place (`data/content/photos.json`, files made by
 * `npm run photos`). Shown with its credit; places without one keep the illustrated cover.
 */
export type PlacePhoto = {
  /** Public URL of the 1200 px WebP (place pages), e.g. `/photos/w1200/nilgiri-hill.webp`. */
  src: string;
  /** Public URL of the 640 px WebP (cards). */
  w640: string;
  width?: number;
  height?: number;
  alt_bn?: string;
  alt_en?: string;
  author: string;
  license: string;
  license_url: string;
  /** The Commons file page. */
  source: string;
};

/** Distance and fares from Dhaka to a place's district (`places.json` → `from_dhaka`). */
export type PlaceFromDhaka = {
  road_km: number;
  bus_hours: [number, number] | null;
  bus_fare_from_bdt: number | null;
  direct_trains: number;
};

export type FareRange = { min: number; max: number; asOf: string };

/** Government fare chart for the bus leg. */
export type BusChart = {
  seat40: number | null;
  seat51: number | null;
  flat: number | null;
  from: string;
  km: number;
  asOf: string;
};

export type BusOperator = { name: string; ac: "ac" | "non" | "both" | null };

/** `routes.json` → `bus`. Bengali text in the plain fields, English in the `_en` ones. */
export type RouteBus = {
  km: number;
  hours: [number, number] | null;
  terminals: string[];
  terminals_en: string[];
  arrives: string | null;
  arrives_en: string | null;
  chart: BusChart | null;
  nonAc: FareRange | null;
  ac: FareRange | null;
  operators: BusOperator[];
  operators_en: string[];
  confidence: Confidence;
  asOf: string;
  sources: string[];
};

/** One launch or steamer service (`routes.json` → `water[]` and `water_en[]`). */
export type RouteWater = {
  from: string;
  to: string;
  status: "daily" | "irregular" | "festival_only" | string;
  departs: string | null;
  hours: [number, number] | null;
  deck: [number, number] | null;
  single: [number, number] | null;
  double: [number, number] | null;
  km: number | null;
  vessels: string[];
  confidence: Confidence;
  asOf: string;
  sources: string[];
};

export type Airport = { code: string; name: string; districtId: number; own: boolean };

/** `routes.json` → `flight` and `flight_en`. */
export type RouteFlight = {
  fromAirport: Airport;
  airport: Airport;
  onwardKm: number | null;
  airlines: string[];
  minutes: number;
  perDay: [number, number] | number | null;
  perWeek: number | null;
  asOf: string;
  sources: string[];
};

export type TrainClass =
  "shovon" | "shovon_chair" | "snigdha" | "first_seat" | "first_berth" | "ac_seat" | "ac_berth";

export const TRAIN_CLASSES: readonly TrainClass[] = [
  "shovon",
  "shovon_chair",
  "snigdha",
  "first_seat",
  "first_berth",
  "ac_seat",
  "ac_berth",
];

/** A photo attached to a post (stored under `/media/`, made by the browser pipeline). */
export type PostPhoto = {
  src: string;
  thumb: string | null;
  width: number;
  height: number;
};
