// Geocoding service.
//
// Best-effort address → lat/lng. Used when we approve an external lead
// and need a real location on the map.
//
// Implementation choices:
//   - Nominatim (OpenStreetMap) is free and unauthenticated, with a fair-use
//     policy capped at 1 request/second. That's plenty for admin-triggered
//     approvals (a human is clicking a button); not for batch jobs.
//   - We send a real User-Agent because Nominatim refuses requests without
//     one. Set GEOCODER_USER_AGENT in production to "hone/1.0 (your-email)".
//   - On any failure (rate limit, no result, network), we fall back to
//     downtown Davis. The admin can drag the marker later.
//   - Results are capped to lat/lng + the display string. No PII.

const DAVIS_CENTER = { lat: 38.5449, lng: -121.7405 };
const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const FAIR_USE_MS = 1100; // be a touch over 1s/req

let lastCallAt = 0;

function userAgent() {
  return (
    process.env.GEOCODER_USER_AGENT ||
    'hone/1.0 (UC Davis student housing platform)'
  );
}

async function throttle() {
  const wait = lastCallAt + FAIR_USE_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCallAt = Date.now();
}

/**
 * Geocode a free-form address string. Returns { lat, lng, displayName }
 * — never throws. Falls back to Davis center on any error.
 */
async function geocode(addressText) {
  if (!addressText || !String(addressText).trim()) {
    return { ...DAVIS_CENTER, displayName: 'Davis, CA (default)', usedFallback: true };
  }

  try {
    await throttle();
    const q = encodeURIComponent(String(addressText).trim());
    const url = `${NOMINATIM}?q=${q}&format=json&limit=1&addressdetails=0&countrycodes=us`;

    const res = await fetch(url, {
      headers: { 'User-Agent': userAgent(), Accept: 'application/json' },
      // Don't hang the request; geocode is opportunistic.
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`nominatim ${res.status}`);
    const arr = await res.json();
    if (!Array.isArray(arr) || arr.length === 0)
      return { ...DAVIS_CENTER, displayName: addressText, usedFallback: true };

    const hit = arr[0];
    return {
      lat: Number(hit.lat),
      lng: Number(hit.lon),
      displayName: hit.display_name || addressText,
      usedFallback: false,
    };
  } catch (err) {
    console.warn('[geocode] fallback to Davis center:', err.message);
    return { ...DAVIS_CENTER, displayName: addressText, usedFallback: true };
  }
}

module.exports = { geocode, DAVIS_CENTER };
