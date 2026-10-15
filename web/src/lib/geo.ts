const EARTH_RADIUS_KM = 6371;

const rad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in kilometres between two points (haversine). */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Google Maps directions to a point (opens in the Maps app or site; the start is the visitor's own position). */
export function directionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

/** Roads in Bangladesh wind: the median real road distance between district pairs is about 1.3x the straight line. */
const ROAD_FACTOR = 1.3;

/** Estimated road distance in whole kilometres between two points (the planner's distance function). */
export function estimateRoadKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  return Math.max(1, Math.round(haversineKm(lat1, lng1, lat2, lng2) * ROAD_FACTOR));
}
