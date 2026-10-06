// src/services/geocodingService.js
/**
 * Geocoding Service — Ola Krutrim Maps (Primary) + OSM Nominatim (Fallback)
 *
 * API Docs: https://maps.olakrutrim.com/apidocs
 * Auth: api_key passed as query param to all Ola Maps REST endpoints.
 *
 * Priority:
 *   1. Ola Maps Places Autocomplete  (best Indian accuracy)
 *   2. Ola Maps Geocode              (structured address → coordinates)
 *   3. OSM Nominatim                 (always-free fallback, no key needed)
 */

const OLA_MAPS_API_KEY = process.env.REACT_APP_OLA_MAPS_API_KEY || '';
const OLA_BASE_URL = 'https://api.olamaps.io';

// Simple in-memory cache to avoid repeat hits for the same query
const cache = new Map();

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build default headers for every Ola Maps REST request.
 * Ola Maps accepts the api_key as a query param OR as a Bearer token.
 * Using the query param approach keeps requests simple and cache-friendly.
 */
const olaHeaders = () => ({
  'Accept': 'application/json',
  'X-Request-Id': `st-${Date.now()}`,
});

/**
 * Append the api_key query param to any URL string.
 */
const withKey = (url) =>
  `${url}${url.includes('?') ? '&' : '?'}api_key=${OLA_MAPS_API_KEY}`;

// ─── Forward Geocoding (text search → list of locations) ─────────────────────

/**
 * Search for locations matching a text query.
 *
 * @param {string} query          Search text (e.g. "AIIMS New Delhi")
 * @param {Array<number>} [currentLocation]  [lat, lng] for proximity bias
 * @returns {Promise<Array<{lat, lon, display_name, place_id}>>}
 */
export const searchLocation = async (query, currentLocation = null) => {
  if (!query || query.trim().length < 2) return [];

  const cacheKey = `fwd_${query.trim().toLowerCase()}_${currentLocation ? currentLocation.join(',') : ''}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  let results = [];
  let success = false;

  // ── 1. PRIMARY: Ola Maps Places Autocomplete ─────────────────────────────
  if (OLA_MAPS_API_KEY) {
    try {
      let autocompleteUrl = `${OLA_BASE_URL}/places/v1/autocomplete?input=${encodeURIComponent(query.trim())}&language=en`;
      if (currentLocation) {
        autocompleteUrl += `&location=${currentLocation[0]},${currentLocation[1]}&radius=50000`;
      }

      const res = await fetch(withKey(autocompleteUrl), { headers: olaHeaders() });

      if (res.ok) {
        const data = await res.json();
        // Ola autocomplete returns { predictions: [...] }
        const predictions = data.predictions || data.results || [];

        if (Array.isArray(predictions) && predictions.length > 0) {
          // Each prediction has a place_id but no coords yet — fetch geocode for top results
          const geocoded = await Promise.allSettled(
            predictions.slice(0, 6).map(async (pred) => {
              const geocodeUrl = withKey(
                `${OLA_BASE_URL}/places/v1/geocode?address=${encodeURIComponent(pred.description || pred.structured_formatting?.main_text || query)}`
              );
              const gRes = await fetch(geocodeUrl, { headers: olaHeaders() });
              if (!gRes.ok) return null;
              const gData = await gRes.json();
              const loc = gData.geocodingResults?.[0]?.geometry?.location
                || gData.results?.[0]?.geometry?.location;
              if (!loc) return null;
              return {
                lat: parseFloat(loc.lat),
                lon: parseFloat(loc.lng),
                display_name: pred.description
                  || pred.structured_formatting?.main_text
                  || gData.geocodingResults?.[0]?.formatted_address
                  || query,
                place_id: pred.place_id || gData.geocodingResults?.[0]?.place_id || String(Math.random()),
              };
            })
          );

          const valid = geocoded
            .filter((r) => r.status === 'fulfilled' && r.value && !isNaN(r.value.lat))
            .map((r) => r.value);

          if (valid.length > 0) {
            results = valid;
            success = true;
          }
        }
      }
    } catch (err) {
      console.warn('[Ola Maps] Autocomplete failed:', err.message);
    }

    // ── 2. SECONDARY: Ola Maps Direct Geocode (if autocomplete had no results) ─
    if (!success) {
      try {
        const geocodeUrl = withKey(
          `${OLA_BASE_URL}/places/v1/geocode?address=${encodeURIComponent(query.trim())}`
        );
        const res = await fetch(geocodeUrl, { headers: olaHeaders() });

        if (res.ok) {
          const data = await res.json();
          const items = data.geocodingResults || data.results || [];

          if (Array.isArray(items) && items.length > 0) {
            results = items
              .filter((item) => item.geometry?.location?.lat)
              .map((item) => ({
                lat: parseFloat(item.geometry.location.lat),
                lon: parseFloat(item.geometry.location.lng),
                display_name: item.formatted_address || item.name || query,
                place_id: item.place_id || String(Math.random()),
              }));

            if (results.length > 0) success = true;
          }
        }
      } catch (err) {
        console.warn('[Ola Maps] Geocode fallback failed:', err.message);
      }
    }
  }

  // ── 3. FALLBACK: OpenStreetMap Nominatim ─────────────────────────────────
  if (!success) {
    try {
      let nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=in&limit=6&addressdetails=1`;
      if (currentLocation) {
        nominatimUrl += `&viewbox=${currentLocation[1] - 0.5},${currentLocation[0] + 0.5},${currentLocation[1] + 0.5},${currentLocation[0] - 0.5}&bounded=0`;
      }

      const res = await fetch(nominatimUrl, {
        headers: {
          'User-Agent': 'SalesmanTracker/2.0',
          Accept: 'application/json',
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          results = data.map((item) => ({
            lat: parseFloat(item.lat),
            lon: parseFloat(item.lon),
            display_name: item.display_name,
            place_id: item.place_id ? String(item.place_id) : String(Math.random()),
          }));
          success = true;
        }
      }
    } catch (err) {
      console.warn('[Nominatim] Geocoding fallback failed:', err.message);
    }
  }

  // Filter, trim long names, limit to 6 results
  const formatted = results
    .filter((r) => !isNaN(r.lat) && !isNaN(r.lon) && r.display_name)
    .map((r) => ({
      ...r,
      display_name:
        r.display_name.length > 100
          ? r.display_name.substring(0, 100) + '…'
          : r.display_name,
    }))
    .slice(0, 6);

  cache.set(cacheKey, formatted);
  return formatted;
};

// ─── Reverse Geocoding (coordinates → address string) ─────────────────────────

/**
 * Convert GPS coordinates into a human-readable address string.
 *
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<string>}
 */
export const reverseGeocode = async (lat, lng) => {
  if (!lat || !lng) return 'Unknown location';

  const cacheKey = `rev_${Number(lat).toFixed(4)}_${Number(lng).toFixed(4)}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  // ── 1. PRIMARY: Ola Maps Reverse Geocode ──────────────────────────────────
  if (OLA_MAPS_API_KEY) {
    try {
      const url = withKey(`${OLA_BASE_URL}/places/v1/reverse-geocode?latlng=${lat},${lng}`);
      const res = await fetch(url, { headers: olaHeaders() });

      if (res.ok) {
        const data = await res.json();
        // Response shape: { results: [{ formatted_address, name, ... }] }
        const address =
          data.results?.[0]?.formatted_address ||
          data.results?.[0]?.name ||
          data.geocodingResults?.[0]?.formatted_address;

        if (address) {
          cache.set(cacheKey, address);
          return address;
        }
      }
    } catch (err) {
      console.warn('[Ola Maps] Reverse geocoding failed:', err.message);
    }
  }

  // ── 2. FALLBACK: Nominatim Reverse ────────────────────────────────────────
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      {
        headers: {
          'User-Agent': 'SalesmanTracker/2.0',
          Accept: 'application/json',
        },
      }
    );
    if (res.ok) {
      const data = await res.json();
      const address = data.display_name || `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`;
      cache.set(cacheKey, address);
      return address;
    }
  } catch (err) {
    console.warn('[Nominatim] Reverse geocoding fallback failed:', err.message);
  }

  return `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`;
};

// Export the API key and base URL so map components can use them directly
export { OLA_MAPS_API_KEY, OLA_BASE_URL };
