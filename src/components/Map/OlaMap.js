// src/components/Map/OlaMap.js
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { OlaMaps } from 'olamaps-web-sdk';
import 'maplibre-gl/dist/maplibre-gl.css';
import './OlaMap.css';
import { Box, Alert } from '@mui/material';

const OLA_MAPS_API_KEY = process.env.REACT_APP_OLA_MAPS_API_KEY || '';
const DEFAULT_CENTER = [77.2090, 28.6139]; // New Delhi [lng, lat]

/**
 * Calculates bearing angle (in degrees) between two [lng, lat] coordinates
 */
const calculateBearing = (start, end) => {
  if (!start || !end) return 0;
  const startLng = (start[0] * Math.PI) / 180;
  const startLat = (start[1] * Math.PI) / 180;
  const endLng = (end[0] * Math.PI) / 180;
  const endLat = (end[1] * Math.PI) / 180;

  const y = Math.sin(endLng - startLng) * Math.cos(endLat);
  const x =
    Math.cos(startLat) * Math.sin(endLat) -
    Math.sin(startLat) * Math.cos(endLat) * Math.cos(endLng - startLng);

  let bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
};

/**
 * Normalizes input coords (array [lat, lng] or [lng, lat] or object {lat, lng}) to MapLibre [lng, lat]
 */
const toLngLat = (coords) => {
  if (!coords) return null;

  // Object format { lat, lng } or { lat, lon } or { latitude, longitude }
  if (typeof coords === 'object' && !Array.isArray(coords)) {
    const lat = Number(coords.lat ?? coords.latitude);
    const lng = Number(coords.lng ?? coords.lon ?? coords.longitude);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return [lng, lat];
    }
  }

  // Array format [a, b]
  if (Array.isArray(coords) && coords.length >= 2) {
    const a = Number(coords[0]);
    const b = Number(coords[1]);
    if (isNaN(a) || isNaN(b)) return null;

    // If first element is > 45 (Longitude for India ~68-98) and second <= 45 (Latitude ~8-37)
    // Then it's ALREADY [lng, lat]
    if (Math.abs(a) > 45 && Math.abs(b) <= 45) {
      return [a, b];
    }

    // If first element is <= 45 (Latitude) and second is > 45 (Longitude)
    // Then it's [lat, lng], convert to [lng, lat]
    if (Math.abs(a) <= 45 && Math.abs(b) > 45) {
      return [b, a];
    }

    // Generic fallback: check if coords[0] is in lat range [-90, 90]
    if (a >= -90 && a <= 90 && b >= -180 && b <= 180) {
      return [b, a];
    }
  }

  return null;
};

/**
 * Creates custom styled HTML marker elements for MapLibre / Ola Maps
 */
const createMarkerElement = (type, isLive = false) => {
  const el = document.createElement('div');
  el.className = `ola-map-pin-container ola-pin-${type}`;
  el.style.width = '32px';
  el.style.height = '42px';
  el.style.cursor = 'pointer';
  el.style.position = 'relative';
  el.style.display = 'flex';
  el.style.alignItems = 'center';
  el.style.justifyContent = 'center';

  const color = type === 'red' ? '#e53935' : type === 'green' ? '#2e7d32' : '#1976d2';

  el.innerHTML = `
    <svg width="32" height="42" viewBox="0 0 32 42" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0px 3px 5px rgba(0,0,0,0.35)); transition: transform 0.2s ease;">
      <path d="M16 0C7.163 0 0 7.163 0 16c0 11.2 14.4 24.6 15.01 25.17a1.49 1.49 0 001.98 0C17.6 40.6 32 27.2 32 16 32 7.163 24.837 0 16 0z" fill="${color}"/>
      <circle cx="16" cy="15" r="9" fill="#ffffff" />
      <circle cx="16" cy="15" r="6" fill="${color}" />
    </svg>
    ${isLive ? '<div class="ola-marker-pulse"></div>' : ''}
  `;

  return el;
};

const FLEET_COLORS = ['#00C853', '#2979FF', '#FF9100', '#AA00FF', '#FF1744', '#00B0FF', '#E040FB', '#00E676'];

/**
 * Creates Rapido/Ola-style live Motorcycle Rider marker with rotating orientation
 */
const createRiderMarkerElement = (bearing = 0) => {
  const el = document.createElement('div');
  el.className = 'ola-rider-container';

  el.innerHTML = `
    <div class="ola-rider-beacon"></div>
    <div class="ola-rider-bike" style="transform: rotate(${bearing}deg);">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="#00C853">
        <path d="M19 7c0-1.1-.9-2-2-2h-3v2h3v2.65L13.52 14H10V9H6c-2.21 0-4 1.79-4 4 0 2.21 1.79 4 4 4 1.74 0 3.22-1.11 3.78-2.67l3.66.67H19c1.1 0 2-.9 2-2v-4c0-.55-.45-1-1-1zm-13 8c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm13-2h-3.48l2-3.48c.84.28 1.48 1.07 1.48 2.03v1.45z"/>
        <circle cx="12" cy="4" r="2" fill="#00C853"/>
      </svg>
    </div>
    <div class="ola-rider-tag">Live Rider</div>
  `;

  return el;
};

/**
 * Creates custom multi-color fleet member rider marker for Admin Live Fleet view
 */
const createFleetRiderElement = (salesmanName = 'Rider', color = '#00C853', bearing = 0) => {
  const el = document.createElement('div');
  el.className = 'ola-fleet-rider-container';

  el.innerHTML = `
    <div class="ola-fleet-beacon" style="border-color: ${color}; background: ${color}26;"></div>
    <div class="ola-fleet-bike" style="transform: rotate(${bearing}deg); background: ${color};">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="#ffffff">
        <path d="M19 7c0-1.1-.9-2-2-2h-3v2h3v2.65L13.52 14H10V9H6c-2.21 0-4 1.79-4 4 0 2.21 1.79 4 4 4 1.74 0 3.22-1.11 3.78-2.67l3.66.67H19c1.1 0 2-.9 2-2v-4c0-.55-.45-1-1-1zm-13 8c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm13-2h-3.48l2-3.48c.84.28 1.48 1.07 1.48 2.03v1.45z"/>
        <circle cx="12" cy="4" r="2" fill="#ffffff"/>
      </svg>
    </div>
    <div class="ola-fleet-tag" style="background: ${color}; color: #ffffff;">
      ${salesmanName}
    </div>
  `;

  return el;
};

/**
 * Safely fits map bounds to a list of [lng, lat] points
 */
const fitPointsBounds = (map, points, options = { padding: 50, maxZoom: 16 }) => {
  if (!map || !Array.isArray(points) || points.length === 0) return;

  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  let validCount = 0;

  points.forEach((pt) => {
    const lngLat = toLngLat(pt);
    if (lngLat && typeof lngLat[0] === 'number' && typeof lngLat[1] === 'number' && !isNaN(lngLat[0]) && !isNaN(lngLat[1])) {
      minLng = Math.min(minLng, lngLat[0]);
      minLat = Math.min(minLat, lngLat[1]);
      maxLng = Math.max(maxLng, lngLat[0]);
      maxLat = Math.max(maxLat, lngLat[1]);
      validCount++;
    }
  });

  if (validCount === 0 || minLng === Infinity || maxLng === -Infinity) return;

  try {
    if (minLng === maxLng && minLat === maxLat) {
      map.flyTo({ center: [minLng, minLat], zoom: options.maxZoom || 15 });
    } else {
      map.fitBounds(
        [
          [minLng, minLat],
          [maxLng, maxLat],
        ],
        options
      );
    }
  } catch (err) {
    console.warn('[Ola Maps] fitBounds notice:', err);
  }
};

const OlaMap = ({
  center,
  zoom = 13,
  currentLocation,
  destinationCoords,
  destinationName = 'Destination',
  route,
  isTripInProgress = false,
  selectedTrip = null,
  fleetMembers = [],
  focusedFleetMember = null,
  style = {},
  className = '',
}) => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const olaSdkRef = useRef(null);

  // Markers refs
  const currentMarkerRef = useRef(null);
  const destMarkerRef = useRef(null);
  const startMarkerRef = useRef(null);
  const endMarkerRef = useRef(null);
  const fleetMarkersRef = useRef({});

  const prevLocationRef = useRef(null);
  const [bearing, setBearing] = useState(0);
  const [cameraMode, setCameraMode] = useState('overview'); // 'rider' | 'overview'

  const [mapLoaded, setMapLoaded] = useState(false);
  const [initError, setInitError] = useState(null);

  // Dynamic ETA and Traffic Estimation
  const [liveMetrics, setLiveMetrics] = useState({
    distanceKm: '0.0',
    etaMins: 0,
    arrivalTime: '',
    speedKmh: 35,
    trafficCondition: 'Free Flow',
  });

  // Calculate live ETA and arrival time
  useEffect(() => {
    if (route && Array.isArray(route) && route.length > 0) {
      // Rough distance estimation in km
      let totalDist = 0;
      for (let i = 0; i < route.length - 1; i++) {
        const p1 = toLngLat(route[i]);
        const p2 = toLngLat(route[i + 1]);
        if (p1 && p2) {
          const dx = (p2[0] - p1[0]) * 111.32 * Math.cos((p1[1] * Math.PI) / 180);
          const dy = (p2[1] - p1[1]) * 110.57;
          totalDist += Math.sqrt(dx * dx + dy * dy);
        }
      }

      const dist = totalDist > 0 ? totalDist : 5.0;
      const speed = isTripInProgress ? 32 : 35; // avg urban speed in km/h
      const durationMins = Math.max(1, Math.round((dist / speed) * 60));

      const arrivalDate = new Date(Date.now() + durationMins * 60 * 1000);
      const arrivalFormatted = arrivalDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      setLiveMetrics({
        distanceKm: dist.toFixed(1),
        etaMins: durationMins,
        arrivalTime: arrivalFormatted,
        speedKmh: speed,
        trafficCondition: dist > 10 ? 'Moderate Traffic' : 'Free Flow',
      });
    }
  }, [route, isTripInProgress]);

  // 1. Initialize Ola Maps Web SDK & MapLibre instance
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let isMounted = true;

    const setupMap = async () => {
      try {
        const initialCenter = toLngLat(currentLocation) || toLngLat(center) || DEFAULT_CENTER;

        // Initialize Ola Maps Web SDK
        const olaMaps = new OlaMaps({
          apiKey: OLA_MAPS_API_KEY,
        });
        olaSdkRef.current = olaMaps;

        const mapInstance = await olaMaps.init({
          container: containerRef.current,
          style: 'https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard/style.json',
          center: initialCenter,
          zoom: zoom,
        });

        if (!isMounted) {
          try {
            mapInstance.remove();
          } catch (_) {}
          return;
        }

        mapRef.current = mapInstance;

        // Add navigation controls using OlaMaps SDK
        try {
          if (typeof olaMaps.addNavigationControls === 'function') {
            const nav = olaMaps.addNavigationControls({
              showCompass: true,
              showZoom: true,
              visualizePitch: true,
            });
            if (nav && typeof mapInstance.addControl === 'function') {
              mapInstance.addControl(nav, 'top-right');
            }
          }
        } catch (ctrlErr) {
          console.warn('[Ola Maps] Navigation controls notice:', ctrlErr);
        }

        mapInstance.on('load', () => {
          if (!isMounted) return;
          setMapLoaded(true);
        });

        mapInstance.on('error', (e) => {
          const msg = e?.error?.message || '';
          if (msg.includes('3d_model') || msg.includes('Source layer') || msg.includes('vectordata')) {
            // Benign vector tile styling warning from Ola tile server
            return;
          }
          console.warn('[Ola Maps] Map notice:', e);
        });

        // If style loaded before event listener attached
        if (mapInstance.isStyleLoaded && mapInstance.isStyleLoaded()) {
          setMapLoaded(true);
        }
      } catch (err) {
        console.error('[Ola Maps] Initialization failed:', err);
        if (isMounted) setInitError(err.message || 'Failed to initialize Ola Maps.');
      }
    };

    setupMap();

    return () => {
      isMounted = false;
      [currentMarkerRef, destMarkerRef, startMarkerRef, endMarkerRef].forEach((ref) => {
        if (ref.current) {
          try { ref.current.remove(); } catch (_) {}
          ref.current = null;
        }
      });
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (_) {}
        mapRef.current = null;
      }
    };
  }, []); // Run once on mount

  // 2. Handle Container Resizing
  useEffect(() => {
    const handleResize = () => {
      if (mapRef.current) {
        try {
          mapRef.current.resize();
        } catch (_) {}
      }
    };
    window.addEventListener('resize', handleResize);
    const timer = setTimeout(handleResize, 300);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, []);

  // 3. Update Current / Rider Location Marker with Bearing
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !olaSdkRef.current) return;
    const lngLat = toLngLat(currentLocation);

    if (lngLat) {
      try {
        // Compute heading angle if moved
        if (prevLocationRef.current) {
          const prevLngLat = toLngLat(prevLocationRef.current);
          if (prevLngLat && (prevLngLat[0] !== lngLat[0] || prevLngLat[1] !== lngLat[1])) {
            const calculatedBearing = calculateBearing(prevLngLat, lngLat);
            setBearing(calculatedBearing);
          }
        }
        prevLocationRef.current = currentLocation;

        // Clean existing marker if switched modes (pin vs bike rider)
        if (currentMarkerRef.current) {
          try { currentMarkerRef.current.remove(); } catch (_) {}
          currentMarkerRef.current = null;
        }

        const el = isTripInProgress
          ? createRiderMarkerElement(bearing)
          : createMarkerElement('blue', false);

        const popup = typeof olaSdkRef.current.addPopup === 'function'
          ? olaSdkRef.current.addPopup({ offset: 25 }).setHTML(`
              <strong>${isTripInProgress ? '🛵 Live Rider Location' : '📍 Current Location'}</strong>
              <br /><small>${isTripInProgress ? 'Active trip on road' : 'Your current position'}</small>
            `)
          : null;

        const marker = olaSdkRef.current.addMarker({
          element: el,
          anchor: isTripInProgress ? 'center' : 'bottom',
        }).setLngLat(lngLat);

        if (popup) marker.setPopup(popup);
        marker.addTo(mapRef.current);
        currentMarkerRef.current = marker;

        // Camera movement logic
        if (isTripInProgress && cameraMode === 'rider') {
          mapRef.current.easeTo({
            center: lngLat,
            zoom: 16,
            pitch: 45,
            bearing: bearing,
            duration: 800,
          });
        } else if (!route && !selectedTrip) {
          mapRef.current.flyTo({
            center: lngLat,
            zoom: 14,
            speed: 1.2,
          });
        }
      } catch (err) {
        console.warn('[Ola Maps] Current location marker notice:', err);
      }
    } else if (currentMarkerRef.current) {
      try {
        currentMarkerRef.current.remove();
      } catch (_) {}
      currentMarkerRef.current = null;
    }
  }, [currentLocation, isTripInProgress, mapLoaded, route, selectedTrip, bearing, cameraMode]);

  // 4. Update Destination Marker
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !olaSdkRef.current) return;
    const lngLat = toLngLat(destinationCoords);

    if (lngLat) {
      try {
        if (!destMarkerRef.current) {
          const el = createMarkerElement('red');
          const popup = typeof olaSdkRef.current.addPopup === 'function'
            ? olaSdkRef.current.addPopup({ offset: 25 }).setHTML(`
                <strong>🏁 ${destinationName || 'Destination'}</strong>
              `)
            : null;

          const marker = olaSdkRef.current.addMarker({ element: el, anchor: 'bottom' })
            .setLngLat(lngLat);

          if (popup) marker.setPopup(popup);
          marker.addTo(mapRef.current);
          destMarkerRef.current = marker;
        } else {
          destMarkerRef.current.setLngLat(lngLat);
        }
      } catch (err) {
        console.warn('[Ola Maps] Destination marker notice:', err);
      }
    } else if (destMarkerRef.current) {
      try {
        destMarkerRef.current.remove();
      } catch (_) {}
      destMarkerRef.current = null;
    }
  }, [destinationCoords, destinationName, mapLoaded]);

  // 5. Update Selected Trip (Admin Dashboard)
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !selectedTrip || !olaSdkRef.current) {
      if (startMarkerRef.current) {
        try { startMarkerRef.current.remove(); } catch (_) {}
        startMarkerRef.current = null;
      }
      if (endMarkerRef.current) {
        try { endMarkerRef.current.remove(); } catch (_) {}
        endMarkerRef.current = null;
      }
      return;
    }

    const startLngLat = toLngLat(selectedTrip.startLocation);
    const endLngLat = toLngLat(selectedTrip.endLocation);

    try {
      // Start marker
      if (startLngLat) {
        if (!startMarkerRef.current) {
          const el = createMarkerElement('green');
          const popup = typeof olaSdkRef.current.addPopup === 'function'
            ? olaSdkRef.current.addPopup({ offset: 25 }).setHTML(`
                <strong>🟢 Start Location</strong>
                <br />${selectedTrip.startLocation?.name || 'Start Point'}
                <br /><small>${selectedTrip.startTime ? new Date(selectedTrip.startTime).toLocaleString() : ''}</small>
              `)
            : null;

          const marker = olaSdkRef.current.addMarker({ element: el, anchor: 'bottom' })
            .setLngLat(startLngLat);

          if (popup) marker.setPopup(popup);
          marker.addTo(mapRef.current);
          startMarkerRef.current = marker;
        } else {
          startMarkerRef.current.setLngLat(startLngLat);
        }
      }

      // End marker
      if (endLngLat) {
        if (!endMarkerRef.current) {
          const el = createMarkerElement('red');
          const popup = typeof olaSdkRef.current.addPopup === 'function'
            ? olaSdkRef.current.addPopup({ offset: 25 }).setHTML(`
                <strong>🔴 End Location</strong>
                <br />${selectedTrip.endLocation?.name || 'End Point'}
                <br /><small>${selectedTrip.endTime ? new Date(selectedTrip.endTime).toLocaleString() : ''}</small>
              `)
            : null;

          const marker = olaSdkRef.current.addMarker({ element: el, anchor: 'bottom' })
            .setLngLat(endLngLat);

          if (popup) marker.setPopup(popup);
          marker.addTo(mapRef.current);
          endMarkerRef.current = marker;
        } else {
          endMarkerRef.current.setLngLat(endLngLat);
        }
      }

      // Safe fit bounds for admin trip
      const boundsPoints = [];
      if (startLngLat) boundsPoints.push(startLngLat);
      if (endLngLat) boundsPoints.push(endLngLat);
      if (Array.isArray(selectedTrip.route)) {
        selectedTrip.route.forEach((pt) => {
          const p = toLngLat(pt);
          if (p) boundsPoints.push(p);
        });
      }

      if (boundsPoints.length >= 2) {
        fitPointsBounds(mapRef.current, boundsPoints, { padding: 40, maxZoom: 15 });
      } else if (startLngLat) {
        mapRef.current.flyTo({ center: startLngLat, zoom: 14 });
      }
    } catch (err) {
      console.warn('[Ola Maps] Trip marker notice:', err);
    }
  }, [selectedTrip, mapLoaded]);

  // 6. Update Multi-Salesman Fleet Markers (Admin Live Fleet Monitoring)
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !olaSdkRef.current) return;

    const currentMarkers = fleetMarkersRef.current;
    const newMemberIds = new Set();

    if (Array.isArray(fleetMembers) && fleetMembers.length > 0) {
      const boundsPoints = [];

      fleetMembers.forEach((member, index) => {
        const memberId = member.id || member.userId || `member-${index}`;
        newMemberIds.add(memberId);

        const lngLat = toLngLat(member.currentLocation || member.startLocation);
        if (!lngLat) return;

        boundsPoints.push(lngLat);
        const color = member.color || FLEET_COLORS[index % FLEET_COLORS.length];

        if (currentMarkers[memberId]) {
          currentMarkers[memberId].setLngLat(lngLat);
        } else {
          const el = createFleetRiderElement(member.salesman || `Rider ${index + 1}`, color, 0);
          const popup = typeof olaSdkRef.current.addPopup === 'function'
            ? olaSdkRef.current.addPopup({ offset: 25 }).setHTML(`
                <div style="font-family: inherit; font-size: 13px; line-height: 1.45; min-width: 170px; padding: 2px;">
                  <strong style="color: ${color}; font-size: 14px;">🛵 ${member.salesman || 'Salesman'}</strong>
                  <div style="margin-top: 4px; font-size: 12px;"><strong>Status:</strong> <span style="color: #00C853; font-weight: 700;">🔴 Live Tracking</span></div>
                  <div style="font-size: 12px; margin-top: 2px;"><strong>Destination:</strong> ${member.endLocation?.name || member.to || 'On Route'}</div>
                  <div style="font-size: 12px; margin-top: 2px;"><strong>Distance:</strong> ${Number(member.distance || 0).toFixed(1)} km (₹${Number(member.cost || 0).toFixed(0)})</div>
                  <div style="font-size: 11px; color: #888; margin-top: 4px;">Started: ${member.startTime ? new Date(member.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</div>
                </div>
              `)
            : null;

          const marker = olaSdkRef.current.addMarker({ element: el, anchor: 'center' }).setLngLat(lngLat);
          if (popup) marker.setPopup(popup);
          marker.addTo(mapRef.current);
          currentMarkers[memberId] = marker;
        }
      });

      // Remove stale markers
      Object.keys(currentMarkers).forEach((id) => {
        if (!newMemberIds.has(id)) {
          try { currentMarkers[id].remove(); } catch (_) {}
          delete currentMarkers[id];
        }
      });

      // Auto-fit bounds across entire fleet if overview mode and no single trip is actively selected
      if (!selectedTrip && !focusedFleetMember && boundsPoints.length > 0) {
        if (boundsPoints.length === 1) {
          mapRef.current.easeTo({ center: boundsPoints[0], zoom: 14, duration: 1000 });
        } else {
          try {
            const bounds = boundsPoints.reduce(
              (acc, coord) => [
                [Math.min(acc[0][0], coord[0]), Math.min(acc[0][1], coord[1])],
                [Math.max(acc[1][0], coord[0]), Math.max(acc[1][1], coord[1])],
              ],
              [boundsPoints[0], boundsPoints[0]]
            );
            mapRef.current.fitBounds(bounds, { padding: 60, maxZoom: 15, duration: 1200 });
          } catch (e) {
            console.warn('Fit bounds error:', e);
          }
        }
      }
    } else {
      // Clear all fleet markers if empty
      Object.keys(currentMarkers).forEach((id) => {
        try { currentMarkers[id].remove(); } catch (_) {}
        delete currentMarkers[id];
      });
    }
  }, [fleetMembers, mapLoaded, selectedTrip, focusedFleetMember]);

  // Focus on selected fleet member when clicked
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !focusedFleetMember) return;
    const lngLat = toLngLat(focusedFleetMember.currentLocation || focusedFleetMember.startLocation);
    if (lngLat) {
      mapRef.current.flyTo({
        center: lngLat,
        zoom: 16,
        pitch: 40,
        speed: 1.4,
      });
      const marker = fleetMarkersRef.current[focusedFleetMember.id || focusedFleetMember.userId];
      if (marker && marker.getPopup) {
        try { marker.togglePopup(); } catch (_) {}
      }
    }
  }, [focusedFleetMember, mapLoaded]);

  // 7. Draw / Update Route Polyline with Traffic Accents
  const drawRoute = useCallback(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const activeRoute = route || selectedTrip?.route;

    if (activeRoute && Array.isArray(activeRoute) && activeRoute.length > 0) {
      const geojsonCoordinates = activeRoute
        .map((pt) => toLngLat(pt))
        .filter(Boolean);

      if (geojsonCoordinates.length < 2) return;

      const geojsonData = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: geojsonCoordinates,
        },
      };

      try {
        if (map.getSource('route-line-source')) {
          map.getSource('route-line-source').setData(geojsonData);
        } else {
          map.addSource('route-line-source', {
            type: 'geojson',
            data: geojsonData,
          });

          // Outer Glow / Road Casing
          map.addLayer({
            id: 'route-line-casing',
            type: 'line',
            source: 'route-line-source',
            layout: {
              'line-join': 'round',
              'line-cap': 'round',
            },
            paint: {
              'line-color': isTripInProgress ? '#004D40' : '#0D47A1',
              'line-width': 10,
              'line-opacity': 0.35,
            },
          });

          // Secondary Traffic Border
          map.addLayer({
            id: 'route-line-border',
            type: 'line',
            source: 'route-line-source',
            layout: {
              'line-join': 'round',
              'line-cap': 'round',
            },
            paint: {
              'line-color': '#FFFFFF',
              'line-width': 7,
              'line-opacity': 0.9,
            },
          });

          // Main Traffic Route Line (Rapido / Ola Emerald Green or Vibrant Navigation Blue)
          map.addLayer({
            id: 'route-line-main',
            type: 'line',
            source: 'route-line-source',
            layout: {
              'line-join': 'round',
              'line-cap': 'round',
            },
            paint: {
              'line-color': isTripInProgress ? '#00C853' : '#1976D2',
              'line-width': 5,
              'line-opacity': 1.0,
            },
          });
        }

        // Auto fit map bounds to the route
        if (!selectedTrip && geojsonCoordinates.length >= 2 && cameraMode !== 'rider') {
          fitPointsBounds(map, geojsonCoordinates, { padding: 60, maxZoom: 16 });
        }
      } catch (routeErr) {
        console.warn('[Ola Maps] Route render notice:', routeErr);
      }
    } else {
      // Clear route layers if route is removed
      try {
        if (map.getLayer('route-line-main')) map.removeLayer('route-line-main');
        if (map.getLayer('route-line-border')) map.removeLayer('route-line-border');
        if (map.getLayer('route-line-casing')) map.removeLayer('route-line-casing');
        if (map.getSource('route-line-source')) map.removeSource('route-line-source');
      } catch (_) {}
    }
  }, [route, selectedTrip, isTripInProgress, mapLoaded, cameraMode]);

  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    drawRoute();
  }, [mapLoaded, drawRoute]);

  // Handler to toggle camera follow view
  const handleFollowRider = () => {
    setCameraMode('rider');
    const lngLat = toLngLat(currentLocation);
    if (mapRef.current && lngLat) {
      mapRef.current.easeTo({
        center: lngLat,
        zoom: 16,
        pitch: 45,
        bearing: bearing,
        duration: 800,
      });
    }
  };

  const handleOverviewRoute = () => {
    setCameraMode('overview');
    const activeRoute = route || selectedTrip?.route;
    if (mapRef.current) {
      mapRef.current.easeTo({ pitch: 0, bearing: 0, duration: 600 });
      if (activeRoute) {
        fitPointsBounds(mapRef.current, activeRoute, { padding: 60, maxZoom: 16 });
      }
    }
  };

  return (
    <Box
      className={`ola-map-container ${className}`}
      sx={{
        width: '100%',
        height: '100%',
        position: 'relative',
        minHeight: 350,
        ...style,
      }}
    >
      <div
        ref={containerRef}
        className="ola-map-canvas"
        id="ola-map-root"
        style={{ width: '100%', height: '100%', minHeight: 350 }}
      />

      {/* Rapido / Live Navigation Floating Top HUD */}
      {route && (
        <div className="ola-nav-top-card">
          <div className="ola-nav-header">
            <div className="ola-live-badge">
              <span className="ola-live-dot"></span>
              {isTripInProgress ? 'Live Trip In Progress' : 'Optimal Route'}
            </div>
            <div className="ola-traffic-chip">
              <span className={`ola-traffic-dot ${liveMetrics.trafficCondition.includes('Heavy') ? 'red' : liveMetrics.trafficCondition.includes('Moderate') ? 'orange' : 'green'}`}></span>
              {liveMetrics.trafficCondition}
            </div>
          </div>

          <div className="ola-nav-metrics">
            <div>
              <div className="ola-metric-val">{liveMetrics.etaMins} mins</div>
              <div className="ola-metric-lbl">ETA ({liveMetrics.arrivalTime || 'Now'})</div>
            </div>
            <div>
              <div className="ola-metric-val">{liveMetrics.distanceKm} km</div>
              <div className="ola-metric-lbl">Remaining</div>
            </div>
            <div>
              <div className="ola-metric-val">~{liveMetrics.speedKmh} km/h</div>
              <div className="ola-metric-lbl">Est. Speed</div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Camera Navigation Controls Dock */}
      {route && (
        <div className="ola-map-actions-dock">
          <button
            className={`ola-dock-btn ${cameraMode === 'rider' ? 'active' : ''}`}
            onClick={handleFollowRider}
            title="Follow rider live in 3D perspective"
          >
            🛵 3D Rider
          </button>
          <button
            className={`ola-dock-btn ${cameraMode === 'overview' ? 'active' : ''}`}
            onClick={handleOverviewRoute}
            title="View entire route overview"
          >
            🗺️ Overview
          </button>
        </div>
      )}

      {initError && (
        <Alert
          severity="warning"
          sx={{ position: 'absolute', top: 12, left: 12, right: 12, zIndex: 10 }}
        >
          {initError}
        </Alert>
      )}
    </Box>
  );
};

export default OlaMap;

