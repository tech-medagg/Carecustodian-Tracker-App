// src/utils/mapIcons.js
// Centralised, crash-proof Leaflet icon definitions & coordinate helpers.

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/**
 * Creates a valid Leaflet icon with complete anchor and retina specifications.
 * Ensures popupAnchor and tooltipAnchor are always valid numeric tuples so
 * Leaflet's internal Point._add never encounters null/undefined.
 *
 * @param {string} color Marker color variant ('blue' | 'green' | 'red' | 'orange' | 'gold' | 'violet' | 'grey' | 'black')
 * @returns {L.Icon}
 */
export const createMarkerIcon = (color = 'blue') =>
  L.icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    tooltipAnchor: [16, -28],
    shadowSize: [41, 41],
    shadowAnchor: [12, 41],
  });

// Pre-instantiated icons
export const blueIcon = createMarkerIcon('blue');
export const greenIcon = createMarkerIcon('green');
export const redIcon = createMarkerIcon('red');
export const orangeIcon = createMarkerIcon('orange');

// Set safe global fallback default icon for any unstyled Leaflet Marker
L.Marker.prototype.options.icon = blueIcon;

/**
 * Validates that coordinates are valid non-NaN numbers.
 * Supports both [lat, lng] array format and { lat, lng } object format.
 *
 * @param {any} coords
 * @returns {boolean}
 */
export const isValidCoords = (coords) => {
  if (!coords) return false;

  if (Array.isArray(coords)) {
    if (coords.length < 2) return false;
    const lat = Number(coords[0]);
    const lng = Number(coords[1]);
    return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  }

  if (typeof coords === 'object') {
    const lat = Number(coords.lat ?? coords.latitude);
    const lng = Number(coords.lng ?? coords.longitude);
    return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  }

  return false;
};

/**
 * Normalizes any coordinate representation into a standard [lat, lng] array.
 * Returns null if coordinates are invalid.
 *
 * @param {any} coords
 * @returns {[number, number] | null}
 */
export const normalizeCoords = (coords) => {
  if (!coords) return null;

  if (Array.isArray(coords) && coords.length >= 2) {
    const lat = Number(coords[0]);
    const lng = Number(coords[1]);
    return !isNaN(lat) && !isNaN(lng) ? [lat, lng] : null;
  }

  if (typeof coords === 'object') {
    const lat = Number(coords.lat ?? coords.latitude);
    const lng = Number(coords.lng ?? coords.longitude);
    return !isNaN(lat) && !isNaN(lng) ? [lat, lng] : null;
  }

  return null;
};
