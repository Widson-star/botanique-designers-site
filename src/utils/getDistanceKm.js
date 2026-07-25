// Consultation site-visit distance from Nairobi CBD.
//
// The consultation fee depends on how far the site is from Nairobi CBD. Geocoding
// is done with OpenStreetMap Nominatim (no API key, no new dependency), but it must
// be **Kenya-constrained and confidence-safe**: a bare "Karen" once resolved to the
// first unrestricted worldwide result, producing an implausible distance and an
// alarming payable fee. This module now:
//   * normalises the query and biases it to Kenya,
//   * restricts Nominatim to Kenya (`countrycodes=ke`) and a small result set,
//   * requests address details and accepts a candidate only when its returned
//     country code is Kenya AND its numeric coordinates also fall within Kenya
//     (the bounding box is an extra guard, never a fallback for missing country
//     evidence),
//   * returns an explicit { status, km } so the caller can distinguish a confidently
//     resolved distance from one that needs manual entry — instead of silently
//     falling back to a misleading 0 km.
//
// The pure helpers below (no network) are exported so the selection/rejection logic
// can be unit-tested deterministically with fixture responses.

// Nairobi CBD origin (unchanged).
export const NAIROBI_CBD = { lat: -1.286389, lon: 36.817223 };

// Generous Kenya bounding box — a coarse geographic guard so a non-Kenyan candidate
// can never drive the fee even if the country filter is ever bypassed. Kenya spans
// roughly lat -4.7..5.0, lon 33.9..41.9; padded slightly here.
export const KENYA_BOUNDS = { minLat: -5.2, maxLat: 5.6, minLon: 33.8, maxLon: 42.1 };

// True only when a Nominatim candidate is CONFIDENTLY Kenyan: the returned country
// code must be Kenya AND the coordinates must also fall within the Kenya bounding
// box. The bounding box is an additional guard, never a fallback for missing
// country evidence — a candidate with no `address`, no/empty `country_code`, or any
// non-`ke` code is rejected even if its coordinates happen to be inside Kenya, and a
// `ke` candidate whose coordinates fall outside Kenya is also rejected.
export function isKenyanCandidate(candidate) {
  if (!candidate || typeof candidate !== "object") return false;

  // 1) Require an address object with a string country_code that normalises to "ke".
  const address = candidate.address;
  if (!address || typeof address !== "object") return false;
  if (typeof address.country_code !== "string") return false;
  if (address.country_code.trim().toLowerCase() !== "ke") return false;

  // 2) Require finite numeric coordinates.
  const lat = Number(candidate.lat);
  const lon = Number(candidate.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;

  // 3) Coordinates must ALSO fall inside the Kenya bounding box (extra guard).
  return (
    lat >= KENYA_BOUNDS.minLat &&
    lat <= KENYA_BOUNDS.maxLat &&
    lon >= KENYA_BOUNDS.minLon &&
    lon <= KENYA_BOUNDS.maxLon
  );
}

// Pick the first usable Kenyan candidate from a Nominatim response array, or null.
export function selectKenyanCandidate(results) {
  if (!Array.isArray(results)) return null;
  return results.find(isKenyanCandidate) || null;
}

// Haversine distance in whole km between two lat/lon points.
export function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// Distance in whole km from Nairobi CBD to the given point.
export function distanceFromNairobiKm(lat, lon) {
  return haversineKm(NAIROBI_CBD.lat, NAIROBI_CBD.lon, lat, lon);
}

// Pure resolver: turn a Nominatim response (already-parsed JSON) into an explicit
// result. Never returns a foreign, NaN, negative or infinite distance.
// Returns { status: "ok", km } or { status: "uncertain", km: null }.
export function resolveDistanceFromResults(results) {
  const candidate = selectKenyanCandidate(results);
  if (!candidate) return { status: "uncertain", km: null };
  const km = distanceFromNairobiKm(Number(candidate.lat), Number(candidate.lon));
  if (!Number.isFinite(km) || km < 0) return { status: "uncertain", km: null };
  return { status: "ok", km };
}

// Kenya-constrained geocode + distance. Always resolves (never throws) to an
// explicit { status, km }: "ok" with a confident Kenyan distance, or "uncertain"
// (empty input, no Kenyan match, network/parse failure) so the caller asks the
// visitor to enter the distance manually rather than showing a misleading fee.
export async function getDistanceKm(address) {
  const normalized = typeof address === "string" ? address.trim() : "";
  if (!normalized) return { status: "uncertain", km: null };

  // Bias the free-text query to Kenya unless the visitor already said so.
  const query = /kenya/i.test(normalized) ? normalized : `${normalized}, Kenya`;

  try {
    const url =
      "https://nominatim.openstreetmap.org/search" +
      "?format=json&addressdetails=1&limit=5&countrycodes=ke" +
      `&q=${encodeURIComponent(query)}`;
    const response = await fetch(url);
    if (!response.ok) return { status: "uncertain", km: null };
    const data = await response.json();
    return resolveDistanceFromResults(data);
  } catch (err) {
    console.error("Distance lookup failed:", err);
    return { status: "uncertain", km: null };
  }
}
