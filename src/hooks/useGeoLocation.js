// src/hooks/useGeoLocation.js
import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook for managing browser Geolocation (current position & live tracking)
 * @param {object} [options] Geolocation options
 * @returns {object} Geolocation state and actions
 */
export const useGeoLocation = (options = {}) => {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const watchIdRef = useRef(null);

  const formatError = (err) => {
    switch (err?.code) {
      case 1: // PERMISSION_DENIED
        return 'Location permission denied by user.';
      case 2: // POSITION_UNAVAILABLE
        return 'Location information unavailable.';
      case 3: // TIMEOUT
        return 'Location request timed out.';
      default:
        return err?.message || 'An unknown location error occurred.';
    }
  };

  // Get current position once
  const getCurrentLocation = useCallback(() => {
    setLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      const errMsg = 'Geolocation is not supported by your browser.';
      setError(errMsg);
      setLoading(false);
      return Promise.reject(new Error(errMsg));
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = [pos.coords.latitude, pos.coords.longitude];
          setLocation(coords);
          setLoading(false);
          resolve(coords);
        },
        (err) => {
          const errMsg = formatError(err);
          setError(errMsg);
          setLoading(false);
          reject(new Error(errMsg));
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0, ...options }
      );
    });
  }, [options]);

  // Start live location watching
  const startWatching = useCallback(
    (onLocationUpdate) => {
      if (!navigator.geolocation) return;

      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }

      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const coords = [pos.coords.latitude, pos.coords.longitude];
          setLocation(coords);
          setLoading(false);
          if (onLocationUpdate) onLocationUpdate(coords);
        },
        (err) => {
          setError(formatError(err));
          setLoading(false);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000, ...options }
      );
    },
    [options]
  );

  // Stop watching position
  const stopWatching = useCallback(() => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  useEffect(() => {
    getCurrentLocation().catch(() => {});
    return () => {
      stopWatching();
    };
  }, []); // Run on mount

  return {
    location,
    loading,
    error,
    getCurrentLocation,
    startWatching,
    stopWatching,
  };
};

export default useGeoLocation;
