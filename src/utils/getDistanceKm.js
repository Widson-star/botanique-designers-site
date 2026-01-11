export async function getDistanceKm(address) {
  try {
    // 1️⃣ Geocode address using OpenStreetMap (Nominatim)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        address
      )}`
    );
    const data = await response.json();
    if (!data.length) return null;

    const { lat, lon } = data[0];

    // 2️⃣ Nairobi CBD coordinates (approx)
    const nairobiCBD = { lat: -1.286389, lon: 36.817223 };

    return haversine(nairobiCBD.lat, nairobiCBD.lon, lat, lon);
  } catch (err) {
    console.error("Distance lookup failed:", err);
    return null;
  }
}

// Haversine formula for km between 2 GPS points
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;

  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}
