// Shared geographic helpers for coordinate validation/normalization around Ho Chi Minh City

export type LatLng = { lat: number; lng: number };

// HCM center (near District 1: Ben Thanh Market)
export const HCM_CENTER: LatLng = { lat: 10.776, lng: 106.700 };
const EARTH_RADIUS_KM = 6371;
const MAX_RADIUS_KM = 2; // clamp within 2km

export const isValidCoord = (lat?: number, lng?: number) => {
  return Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);
};

// Normalize potential [lng, lat] pair into {lat, lng}
export const normalizePair = (a?: number, b?: number): LatLng | null => {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  const lat = Number(a);
  const lng = Number(b);
  // If first value looks like longitude (> 90 magnitude), swap
  if (Math.abs(lat) > 90 && Math.abs(lng) <= 180) {
    return { lat: lng, lng: lat };
  }
  return { lat, lng };
};

const toRad = (deg: number) => (deg * Math.PI) / 180;

// Clamp a coordinate into a circle of MAX_RADIUS_KM around HCM_CENTER
export const clampToHcmRadius = (p: LatLng | null): LatLng | null => {
  if (!p || !isValidCoord(p.lat, p.lng)) return null;
  const dist = haversineKm(HCM_CENTER, p);
  if (dist <= MAX_RADIUS_KM) return p;
  // Project along the bearing from center to point, to the circle boundary
  const lat1 = toRad(HCM_CENTER.lat);
  const lng1 = toRad(HCM_CENTER.lng);
  const lat2 = toRad(p.lat);
  const lng2 = toRad(p.lng);
  const dLng = lng2 - lng1;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  const bearing = Math.atan2(y, x); // radians

  const angularDistance = MAX_RADIUS_KM / EARTH_RADIUS_KM; // radians
  const sinAd = Math.sin(angularDistance);
  const cosAd = Math.cos(angularDistance);

  const sinLat1 = Math.sin(lat1);
  const cosLat1 = Math.cos(lat1);

  const latClamped = Math.asin(
    sinLat1 * cosAd + cosLat1 * sinAd * Math.cos(bearing)
  );
  const lngClamped =
    lng1 +
    Math.atan2(
      Math.sin(bearing) * sinAd * cosLat1,
      cosAd - sinLat1 * Math.sin(latClamped)
    );

  return { lat: (latClamped * 180) / Math.PI, lng: (lngClamped * 180) / Math.PI };
};

export const haversineKm = (a: LatLng, b: LatLng) => {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const la1 = toRad(a.lat);
  const la2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return EARTH_RADIUS_KM * c;
};