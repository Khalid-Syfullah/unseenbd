import type {
  BusChart,
  Confidence,
  FareRange,
  ImageCredit,
  PlaceCover,
  PlacePhoto,
  RouteFlight,
  RouteWater,
  TrainClass,
} from "../db/json-types";
import type { Lang } from "./lang";

export type { Lang };

/* Names are always resolved for the requested language (`name`) and also given in both
 * languages (`nameBn`, `nameEn`) for alternates, search and mixed-language labels. */

export type DivisionRef = { slug: string; name: string; nameBn: string; nameEn: string };

export type DistrictRef = {
  id: number;
  slug: string;
  name: string;
  nameBn: string;
  nameEn: string;
  division: string;
};

export type KindRef = { key: string; label: string; labelBn: string; labelEn: string };

export type PlaceSummary = {
  id: number;
  slug: string;
  name: string;
  nameBn: string;
  nameEn: string;
  district: DistrictRef;
  division: DivisionRef;
  kind: KindRef;
  popular: boolean;
  unseen: boolean;
  bestFromMonth: number;
  bestToMonth: number;
  visitHours: number;
  lat: number | null;
  lng: number | null;
  /** Editorial score 0–1000. */
  stars: number;
  cover: PlaceCover | null;
  imageCredit: ImageCredit | null;
  /** Description in `lang` (English fallback); null until written. */
  description: string | null;
};

export type FromDhaka = {
  roadKm: number;
  busHours: [number, number] | null;
  busFareFromBdt: number | null;
  directTrains: number;
  /** `dhaka-to-…` route page, when there is one. */
  routeSlug: string | null;
};

export type PlaceDetail = PlaceSummary & {
  howToGetThere: string | null;
  warnings: string[];
  tips: string[];
  accessibility: string | null;
  entryFee: string | null;
  openingHours: string | null;
  photo: PlacePhoto | null;
  fromDhaka: FromDhaka | null;
  nearby: PlaceSummary[];
};

export type PlacePage = {
  items: PlaceSummary[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export type PlaceFilters = {
  /** District slug or id. */
  district?: string | number | null;
  division?: string | null;
  kind?: string | null;
  /** 1–12; places whose best season includes this month. */
  month?: number | null;
  unseen?: boolean | null;
  popular?: boolean | null;
  /** Text search over place and district names (bn/en) and slugs. */
  q?: string | null;
  /** 1-based. */
  page?: number | null;
  pageSize?: number | null;
  lang?: Lang;
};

export type PlacePoint = {
  slug: string;
  name: string;
  kind: string;
  districtId: number;
  lat: number;
  lng: number;
  unseen: boolean;
};

export type NearbyPlace = PlaceSummary & { distanceKm: number };

export type DistrictListItem = DistrictRef & { lat: number; lng: number; placeCount: number };

export type DivisionWithDistricts = DivisionRef & {
  position: number;
  districts: DistrictListItem[];
};

export type DistrictDetail = DistrictListItem & {
  divisionRef: DivisionRef;
  famousFor: string[];
  intro: string | null;
  howToReach: string | null;
  communityPhotoCount: number;
  places: PlaceSummary[];
  fromDhaka: FromDhaka | null;
  nearbyDistricts: (DistrictRef & { distanceKm: number })[];
};

export type FamousEntry = { district: DistrictRef; items: string[] };

export type KindWithCount = KindRef & { position: number; count: number };
export type MonthWithCount = {
  month: number;
  slug: string;
  name: string;
  nameBn: string;
  nameEn: string;
  count: number;
};

export type TrendingItem = {
  place: PlaceSummary;
  votes: number;
  likes: number;
  comments: number;
  stars: number;
};

export type UnseenByDivision = DivisionRef & { count: number; places: PlaceSummary[] };

/* Routes ------------------------------------------------------------------------------------ */

export type BusInfo = {
  km: number;
  hours: [number, number] | null;
  terminals: string[];
  arrives: string | null;
  chart: BusChart | null;
  nonAc: FareRange | null;
  ac: FareRange | null;
  operators: { name: string; ac: "ac" | "non" | "both" | null }[];
  confidence: Confidence;
  asOf: string;
  sources: string[];
};

export type RouteSummary = {
  slug: string;
  from: DistrictRef;
  to: DistrictRef;
  roadKm: number;
};

export type RouteDetail = RouteSummary & {
  bus: BusInfo | null;
  trains: TrainSummary[];
  trainsBack: TrainSummary[];
  water: RouteWater[];
  flight: RouteFlight | null;
  placesAtDestination: PlaceSummary[];
  /** The route in the other direction, when it exists. */
  reverseSlug: string | null;
};

/** A route page for a pair that has no curated guide: an estimated distance and the direct trains. */
export type ComputedRoute = RouteSummary & {
  trains: TrainSummary[];
  trainsBack: TrainSummary[];
  placesAtDestination: PlaceSummary[];
  /** Bus time and cheapest fare, known for routes from Dhaka. */
  busHours: [number, number] | null;
  busFareFromBdt: number | null;
  /** True when `roadKm` comes from the straight-line estimate rather than the data. */
  estimated: boolean;
};

export type BookingLinks = {
  train: string;
  bus: { name: string; url: string };
  air: { name: string; url: string }[];
};

export type DhakaRouteSummary = FromDhaka & { district: DistrictRef; divisionRef: DivisionRef };

/* Trains ------------------------------------------------------------------------------------ */

export type TrainEnd = { station: string; districtId: number };

export type TrainSummary = {
  slug: string;
  no: number;
  name: string;
  nameBn: string;
  nameEn: string;
  from: TrainEnd;
  to: TrainEnd;
  /** "HH:MM", 24-hour. */
  dep: string;
  arr: string;
  minutes: number;
  /** 0 = Sunday … 6 = Saturday; null = no off day. */
  offDay: number | null;
  /** Seat classes sold on this train, in fare-table order. */
  classes: TrainClass[];
  /** Every station on the way (in `lang`) and their district ids, for filtering. */
  stations: string[];
  districtIds: number[];
  confidence: Confidence;
  asOf: string;
  sources: string[];
};

export type TrainStop = {
  position: number;
  station: string;
  stationBn: string;
  stationEn: string;
  district: DistrictRef | null;
  arr: string | null;
  dep: string | null;
  minutes: number | null;
};

export type TrainFare = { from: string; to: string; cls: TrainClass; fare: number };

export type TrainDetail = TrainSummary & {
  stops: TrainStop[];
  fares: TrainFare[];
  timetable: string | null;
  returnTrain: { slug: string; no: number; name: string } | null;
};

/* Community ---------------------------------------------------------------------------------- */

export type CommunityPhoto = {
  id: number;
  src: string;
  width: number;
  height: number;
  uploader: string;
  caption: string | null;
  district: { slug: string; name: string };
  likes: number;
  createdAt: string;
};

export type CommunityListing = {
  id: number;
  kind: "business" | "food" | "product";
  category: string | null;
  name: string;
  area: string | null;
  description: string | null;
  phone: string | null;
  sponsored: boolean;
};

export type CommunityPost = {
  id: number;
  author: string;
  body: string;
  photos: string[];
  likes: number;
  comments: number;
  /** 0–1000 (shown ★ x/10); null when nobody has rated the post. */
  stars: number | null;
  createdAt: string;
};

export type CommunitySuggestion = {
  id: number;
  kind: "place" | "food" | "product";
  name: string;
  body: string | null;
  district: { slug: string; name: string } | null;
  likes: number;
  votes: number;
  stars: number | null;
};

/* Search ------------------------------------------------------------------------------------- */

export type SearchResults = {
  /** The cleaned query. */
  query: string;
  districts: DistrictListItem[];
  places: PlaceSummary[];
  photos: CommunityPhoto[];
  posts: CommunityPost[];
  /** Matches before the lists were cut to their limits. */
  totalPlaces: number;
  totalPhotos: number;
  totalPosts: number;
};
