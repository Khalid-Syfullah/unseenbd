/**
 * Typed data access for pages and API routes. Every function takes the content language
 * (`bn` | `en`; use `toLang(locale)` for interface locales) and resolves bilingual fields to it,
 * falling back to English. Functions are async so the storage can change without touching callers.
 */
export { toLang, type Lang } from "./lang";
export {
  allPlaces,
  DEFAULT_PAGE_SIZE,
  getPlace,
  listPlacePoints,
  listPlaces,
  MAX_PAGE_SIZE,
  nearby,
  placesByKind,
  placesInMonth,
} from "./places";
export {
  getDistrict,
  getDistrictRef,
  listDistricts,
  listDistrictsByDivision,
  listDivisions,
  listFamous,
} from "./districts";
export {
  getKind,
  getMonth,
  getTrendVotes,
  listKinds,
  listMonths,
  listPopular,
  listTrending,
  listUnseenByDivision,
} from "./catalog";
export {
  listApprovedSuggestions,
  listDistrictListings,
  listDistrictPhotos,
  listLatestPhotos,
  listLatestPosts,
  listPlacePhotos,
} from "./community";
export { cleanQuery, matchPlaceIds, searchAll, MAX_QUERY_LENGTH } from "./search";
export { findRouteSlug, getRoute, listRoutes, listRoutesFromDhaka } from "./routes";
export { getTrain, listTrains } from "./trains";
export type * from "./types";
