// src/services/routingService.js
/**
 * Routing Service — Ola Krutrim Maps (Primary) + OSRM (Fallback)
 *
 * API Docs: https://maps.olakrutrim.com/apidocs
 * Auth: api_key as query param + Origin/Referer header for domain whitelisting.
 *
 * Working Ola Maps endpoints:
 *   - Directions (POST): /routing/v1/directions — accurate turn-by-turn routing & polyline
 *   - Distance Matrix:   /routing/v1/distanceMatrix — distance + duration
 *   - Snap To Road:      /routing/v1/snapToRoad — GPS trace snapping
 */

const OLA_MAPS_API_KEY = process.env.REACT_APP_OLA_MAPS_API_KEY || '';
const OLA_BASE_URL = 'https://api.olamaps.io';
const DEFAULT_COST_PER_KM = 3; // ₹3 / km

// ─── Helpers ──────────────────────────────────────────────────────────────────

const withKey = (url) =>
  `${url}${url.includes('?') ? '&' : '?'}api_key=${OLA_MAPS_API_KEY}`;

/**
 * Headers for Ola Maps REST requests.
 */
const olaHeaders = () => ({
  'Accept': 'application/json',
  'X-Request-Id': `st-route-${Date.now()}`,
});

/**
 * Decode Google-style encoded polyline string into [[lat,lng], ...] array.
 */
const decodePolyline = (str, precision = 5) => {
  let index = 0, lat = 0, lng = 0, coordinates = [];
  const factor = Math.pow(10, precision);
  while (index < str.length) {
    let b, shift = 0, result = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
    lat += dlat;
    shift = 0; result = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
    lng += dlng;
    coordinates.push([lat / factor, lng / factor]);
  }
  return coordinates;
};

// ─── Ola Maps Directions API ──────────────────────────────────────────────────

/**
 * Fetch directions directly from Ola Maps (POST)
 */
const getOlaDirections = async (startCoords, endCoords) => {
  if (!OLA_MAPS_API_KEY) return null;
  try {
    const [lat1, lon1] = startCoords;
    const [lat2, lon2] = endCoords;
    const url = withKey(
      `${OLA_BASE_URL}/routing/v1/directions?origin=${lat1},${lon1}&destination=${lat2},${lon2}`
    );
    const res = await fetch(url, {
      method: 'POST',
      headers: olaHeaders(),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const route = data?.routes?.[0];
    if (!route) return null;

    const leg = route.legs?.[0];
    const distanceM = leg?.distance || 0;
    const durationS = leg?.duration || null;
    let coordinates = [];

    if (route.overview_polyline) {
      try {
        coordinates = decodePolyline(route.overview_polyline, 5);
      } catch (err) {
        console.warn('[Ola Maps] Polyline decode error:', err);
      }
    }

    return {
      distanceM,
      durationS,
      route: coordinates.length > 0 ? coordinates : [[lat1, lon1], [lat2, lon2]],
    };
  } catch (err) {
    console.warn('[Ola Maps] Directions API failed:', err.message);
    return null;
  }
};

/**
 * Fallback distance check via Ola Distance Matrix API
 */
const getOlaDistanceMatrix = async (startCoords, endCoords) => {
  if (!OLA_MAPS_API_KEY) return null;
  try {
    const [lat1, lon1] = startCoords;
    const [lat2, lon2] = endCoords;
    const url = withKey(
      `${OLA_BASE_URL}/routing/v1/distanceMatrix?origins=${lat1},${lon1}&destinations=${lat2},${lon2}`
    );
    const res = await fetch(url, { headers: olaHeaders() });
    if (!res.ok) return null;
    const data = await res.json();
    const element = data?.rows?.[0]?.elements?.[0];
    if (!element || !element.distance) return null;

    let coordinates = [];
    if (element.polyline) {
      try {
        coordinates = decodePolyline(element.polyline, 5);
      } catch (_) {}
    }

    return {
      distanceM: element.distance,
      durationS: element.duration,
      route: coordinates.length > 0 ? coordinates : [[lat1, lon1], [lat2, lon2]],
    };
  } catch (err) {
    console.warn('[Ola Maps] distanceMatrix failed:', err.message);
    return null;
  }
};

// ─── Snap GPS Trace to Road (Ola Maps) ───────────────────────────────────────

/**
 * Snap an array of raw GPS coordinates to the nearest road using Ola Maps.
 *
 * @param {Array<[number, number]>} points  Array of [lat, lng] GPS points
 * @returns {Promise<Array<[number, number]>>}  Snapped points, or original if service fails
 */
export const snapToRoad = async (points) => {
  if (!OLA_MAPS_API_KEY || !points || points.length === 0) return points;
  try {
    const pointsParam = points.slice(0, 100).map(([lat, lng]) => `${lat},${lng}`).join('|');
    const url = withKey(`${OLA_BASE_URL}/routing/v1/snapToRoad?points=${encodeURIComponent(pointsParam)}`);
    const res = await fetch(url, { headers: olaHeaders() });
    if (!res.ok) return points;
    const data = await res.json();
    const snapped = data?.snapped_points;
    if (!Array.isArray(snapped) || snapped.length === 0) return points;
    return snapped.map((p) => [p.location.lat, p.location.lng]);
  } catch (err) {
    console.warn('[Ola Maps] snapToRoad failed:', err.message);
    return points;
  }
};

// ─── Calculate Driving Route ──────────────────────────────────────────────────

/**
 * Calculate a driving route between two coordinates.
 *
 * Strategy:
 *   1. Use Ola Maps Directions API (accurate Indian road routing + polyline + ETA)
 *   2. If Ola Directions fails, try Ola Distance Matrix
 *   3. If Ola unavailable, fall back to OSRM
 *
 * @param {Array<number>} startCoords  [lat, lng]
 * @param {Array<number>} endCoords    [lat, lng]
 * @param {number} [costPerKm]         ₹ per km (default ₹3)
 * @returns {Promise<{route, distance, cost, duration, provider}>}
 */
export const calculateRoute = async (startCoords, endCoords, costPerKm = DEFAULT_COST_PER_KM) => {
  if (!startCoords || !endCoords) {
    throw new Error('Start and destination coordinates are required.');
  }

  const [lat1, lon1] = startCoords;
  const [lat2, lon2] = endCoords;

  // If origin and destination are the same or within 50 meters, distance and cost are 0
  const straightLineKm = computeStraightLineKm(lat1, lon1, lat2, lon2);
  if (straightLineKm < 0.05) {
    return {
      route: [[lat1, lon1], [lat2, lon2]],
      distance: 0,
      cost: 0,
      duration: 0,
      provider: 'Zero-Distance',
    };
  }

  // Step 1: Try Ola Maps Directions API (POST)
  let olaResult = null;
  if (OLA_MAPS_API_KEY) {
    olaResult = await getOlaDirections(startCoords, endCoords);
    if (!olaResult || olaResult.route.length <= 2) {
      const dmResult = await getOlaDistanceMatrix(startCoords, endCoords);
      if (dmResult) {
        olaResult = dmResult;
      }
    }
  }

  if (olaResult && olaResult.distanceM > 0) {
    const distanceInKm = parseFloat((olaResult.distanceM / 1000).toFixed(2));
    const estimatedCost = parseFloat((distanceInKm * costPerKm).toFixed(2));
    return {
      route: olaResult.route,
      distance: distanceInKm,
      cost: estimatedCost,
      duration: olaResult.durationS ? Math.round(olaResult.durationS / 60) : null,
      provider: 'Ola Maps',
    };
  }

  // Step 2: Fallback to OSRM
  let routeCoordinates = [];
  let osrmDistanceM = 0;
  try {
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=full&geometries=geojson`;
    const res = await fetch(osrmUrl);
    if (res.ok) {
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        routeCoordinates = data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
        osrmDistanceM = data.routes[0].distance || 0;
      }
    }
  } catch (err) {
    console.warn('[OSRM] Route polyline failed:', err.message);
  }

  const distanceInKm = parseFloat((osrmDistanceM / 1000).toFixed(2));
  const estimatedCost = parseFloat((distanceInKm * costPerKm).toFixed(2));

  return {
    route: routeCoordinates.length > 0 ? routeCoordinates : [[lat1, lon1], [lat2, lon2]],
    distance: distanceInKm,
    cost: estimatedCost,
    duration: null,
    provider: 'OSRM-Fallback',
  };
};

// ─── Utilities ────────────────────────────────────────────────────────────────

/**
 * Haversine straight-line distance between two lat/lng points (km).
 */
export const computeStraightLineKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return parseFloat((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2));
};

export { DEFAULT_COST_PER_KM };
