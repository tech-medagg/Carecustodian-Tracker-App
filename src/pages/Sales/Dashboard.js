import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Button, 
  TextField, 
  Card, 
  CircularProgress, 
  Snackbar, 
  Alert, 
  Grid, 
  List, 
  ListItem, 
  ListItemText, 
  ClickAwayListener, 
  Stack, 
  Container, 
  Chip 
} from '@mui/material';
import { 
  LocationOn as LocationIcon, 
  PlayArrow as StartIcon, 
  Stop as StopIcon, 
  Directions as DirectionsIcon, 
  Refresh as RefreshIcon 
} from '@mui/icons-material';
import OlaMap from '../../components/Map/OlaMap';
import { useTrips } from '../../hooks/useTrips';
import { useSelector, useDispatch } from 'react-redux';
import { selectCurrentUser } from '../../store/authSlice';
import { selectActiveVisit, clearActiveVisit } from '../../features/visits/visitSlice';
import { selectCostPerKm, getSettings } from '../../features/settings/settingsSlice';
import { searchLocation, reverseGeocode } from '../../services/geocodingService';

import { calculateRoute } from '../../services/routingService';
import {
  computeHaversineDistance,
  isRealisticGpsMovement,
  isValidCoordinates,
} from '../../utils/validators';
import { isValidCoords } from '../../utils/mapIcons';

function debounce(func, delay) {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), delay);
  };
}

const SalesDashboard = () => {
  // Redux Trip Management
  const {
    currentTrip,
    isTripInProgress,
    createTrip,
    updateTripById,
    loadActiveTrip,
    setActiveTrip,
    clearActiveTrip,
  } = useTrips();

  // Get the logged-in user and active field visit
  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);
  const activeVisit = useSelector(selectActiveVisit);

  // Component State
  const [currentLocation, setCurrentLocation] = useState(null);
  const [destination, setDestination] = useState('');
  const [destinationCoords, setDestinationCoords] = useState(null);

  const [route, setRoute] = useState(null);
  const [distance, setDistance] = useState(0);
  const [cost, setCost] = useState(0);
  const [locationLoading, setLocationLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  
  // Refs
  const mapRef = useRef(null);
  const destinationInputRef = useRef(null);
  const lastLocationRef = useRef(null);
  const lastUpdateTimeRef = useRef(0);
  // Active Completing Guard Ref
  const isCompletingRef = useRef(false);
  const settingsCostPerKm = useSelector(selectCostPerKm);
  const COST_PER_KM = Number(settingsCostPerKm || 3);



  // Fetch dynamic settings from Firestore
  useEffect(() => {
    dispatch(getSettings());
  }, [dispatch]);

  // 1. Instant Cache Hydration & Firestore Active Trip Sync on Refresh / Open
  useEffect(() => {
    if (!user?.uid) return;


    const cachedStr = localStorage.getItem(`active_trip_${user.uid}`);
    let cachedTrip = null;
    if (cachedStr) {
      try {
        cachedTrip = JSON.parse(cachedStr);
        if (cachedTrip && cachedTrip.status === 'In Progress' && (!currentTrip || currentTrip.id !== cachedTrip.id)) {
          setActiveTrip(cachedTrip);
        }
      } catch (e) {
        console.warn('Failed to parse cached active trip:', e);
      }
    }

    // Also synchronize with Firestore
    loadActiveTrip(user.uid).then((active) => {
      if (!cachedTrip && active) {
        // If localStorage has NO active trip (user stopped or completed the trip),
        // mark any dangling in-progress trip in Firestore completed so it never reappears on reload
        updateTripById(active.id, {
          status: 'Completed',
          endedAt: new Date().toISOString(),
        });
        clearActiveTrip();
        return;
      }

      if (active && active.status === 'In Progress' && cachedTrip && cachedTrip.id === active.id) {
        setActiveTrip(active);
        try {
          localStorage.setItem(`active_trip_${user.uid}`, JSON.stringify(active));
        } catch (e) {
          console.warn('Failed to cache active trip:', e);
        }
      } else if (!active) {
        // If Firestore confirms no active trip, clear local cached state
        localStorage.removeItem(`active_trip_${user.uid}`);
      }
    });
  }, [user?.uid, loadActiveTrip, setActiveTrip, updateTripById, clearActiveTrip]);

  // Sync with Redux state
  useEffect(() => {
    if (currentTrip && currentTrip.status === 'In Progress') {
      let initialLocation = null;
      if (Array.isArray(currentTrip.currentLocation)) {
        initialLocation = currentTrip.currentLocation;
      } else if (currentTrip.currentLocation?.lat !== undefined) {
        initialLocation = [currentTrip.currentLocation.lat, currentTrip.currentLocation.lng];
      } else if (currentTrip.startLocation?.lat !== undefined) {
        initialLocation = [currentTrip.startLocation.lat, currentTrip.startLocation.lng];
      }

      if (initialLocation) {
        setCurrentLocation(initialLocation);
      }

      const destName = currentTrip.to || currentTrip.endLocation?.name || '';
      let destCoords = currentTrip.destinationCoords;
      if (!destCoords && currentTrip.endLocation?.lat !== undefined) {
        destCoords = [currentTrip.endLocation.lat, currentTrip.endLocation.lng];
      }

      setDestination(destName);
      setDestinationCoords(destCoords);
      setDistance(currentTrip.distance || 0);
      setCost(currentTrip.cost || 0);

      // Restore route polyline or regenerate if missing
      if (currentTrip.route && Array.isArray(currentTrip.route) && currentTrip.route.length > 0) {
        setRoute(currentTrip.route);
      } else if (initialLocation && destCoords) {
        calculateRoute(initialLocation, destCoords, COST_PER_KM)
          .then((res) => {
            setRoute(res.route);
          })
          .catch((err) => console.warn('Route recovery failed:', err));
      }

      // Keep localStorage updated
      if (user?.uid) {
        try {
          localStorage.setItem(`active_trip_${user.uid}`, JSON.stringify(currentTrip));
        } catch (e) {
          console.warn('Failed to cache active trip:', e);
        }
      }
    } else {
      // Reset local state if no active trip
      if (user?.uid) {
        localStorage.removeItem(`active_trip_${user.uid}`);
      }
      setRoute(null);
      setDistance(0);
      setCost(0);
      setDestination('');
      setDestinationCoords(null);
    }
  }, [currentTrip, user?.uid]);

  // If arriving with an active planned visit, prefill the destination
  useEffect(() => {
    if (activeVisit && !currentTrip && !destination) {
      setDestination(activeVisit.customerAddress || activeVisit.customerName || '');
    }
  }, [activeVisit, currentTrip, destination]);

  // Handler functions
  const handleCloseSnackbar = useCallback(() => {
    setSnackbar(prev => ({ ...prev, open: false }));
  }, []);

  const showMessage = useCallback((message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const handleWatchError = useCallback((error) => {
    let errorMessage = 'Error getting location';
    switch (error.code) {
      case error.PERMISSION_DENIED: errorMessage = 'Location permission denied.'; break;
      case error.POSITION_UNAVAILABLE: errorMessage = 'Location information unavailable.'; break;
      case error.TIMEOUT: errorMessage = 'Location request timed out.'; break;
      default: errorMessage = 'An unknown error occurred.';
    }
    return errorMessage;
  }, []);

  const fetchInitialLocation = useCallback(() => {
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCurrentLocation([latitude, longitude]);
        setLocationLoading(false);
      },
      (err) => {
        console.error(err);
        setLocationLoading(false);
        setSnackbar({ open: true, message: 'Location Error: ' + err.message, severity: 'error' });
      },
      { enableHighAccuracy: true }
    );
  }, []);

  // Initial fetch for location
  useEffect(() => {
    fetchInitialLocation();
  }, [fetchInitialLocation]);

  const handleDestinationChange = useCallback(debounce(async (query) => {
    setDestination(query);
    setDestinationCoords(null);
    setRoute(null);

    if (query.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const results = await searchLocation(query, currentLocation);
      if (results && results.length > 0) {
        setSuggestions(results);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
        if (query.length >= 5) {
          showMessage('No locations found. Try a different search term.', 'warning');
        }
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      setSuggestions([]);
      setShowSuggestions(false);
      showMessage('Unable to search locations. Please check your internet connection.', 'error');
    }
  }, 600), [currentLocation, showMessage]);

  const handleDestinationInputChange = (value) => {
    setDestination(value);
    setDestinationCoords(null);
    setRoute(null);
    
    if (value.length >= 3) {
      handleDestinationChange(value);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = useCallback((suggestion) => {
    const coords = [parseFloat(suggestion.lat), parseFloat(suggestion.lon)];
    setDestination(suggestion.display_name);
    setDestinationCoords(coords);
    setSuggestions([]);
    setShowSuggestions(false);
    
    setRoute(null);
    setDistance(0);
    setCost(0);
    
    showMessage('Destination selected successfully!', 'success');
  }, [showMessage]);

  const handleGetDirections = useCallback(async () => {
    if (!currentLocation) {
      showMessage('Current location is not available. Please wait or refresh location.', 'error');
      return;
    }

    let targetCoords = destinationCoords;

    if (!targetCoords && destination && destination.trim().length >= 3) {
      setIsRouteLoading(true);
      try {
        const results = await searchLocation(destination.trim(), currentLocation);
        if (results && results.length > 0) {
          const first = results[0];
          targetCoords = [parseFloat(first.lat), parseFloat(first.lon)];
          setDestinationCoords(targetCoords);
          setDestination(first.display_name);
        }
      } catch (searchErr) {
        console.warn('Auto search destination failed:', searchErr);
      }
    }

    if (!targetCoords) {
      showMessage('Please select a valid start and destination.', 'error');
      setIsRouteLoading(false);
      return;
    }

    setIsRouteLoading(true);

    try {
      const { route: routeCoords, distance: distKm, cost: estCost } = await calculateRoute(
        currentLocation,
        targetCoords,
        COST_PER_KM
      );

      setRoute(routeCoords);
      setDistance(distKm);
      setCost(estCost);
      showMessage(`Route calculated: ${distKm} km (₹${estCost})`, 'success');
    } catch (error) {
      console.error('Routing error:', error);
      showMessage(error.message || 'Could not calculate the route. Please try again.', 'error');
    } finally {
      setIsRouteLoading(false);
    }
  }, [currentLocation, destination, destinationCoords, showMessage]);

  const handleStartTrip = async () => {
    if (isTripInProgress || (currentTrip && currentTrip.status === 'In Progress')) {
      showMessage('A trip is already in progress. Please stop the active trip first.', 'warning');
      return;
    }

    if (!destinationCoords || !route) {
      showMessage('Please get directions before starting a trip.', 'error');
      return;
    }

    let startAddress = '';
    try {
      startAddress = await reverseGeocode(currentLocation[0], currentLocation[1]);
    } catch (e) {
      startAddress = `Start Location (${currentLocation[0].toFixed(4)}, ${currentLocation[1].toFixed(4)})`;
    }

    const tripData = {
      userId: user.uid,
      salesman: user.displayName || user.email,
      salesmanEmail: user.email,
      startTime: new Date().toISOString(),
      startLocation: {
        name: startAddress || `Start (${currentLocation[0].toFixed(4)}, ${currentLocation[1].toFixed(4)})`,
        lat: currentLocation[0],
        lng: currentLocation[1],
      },
      endLocation: {
        name: destination,
        lat: destinationCoords[0],
        lng: destinationCoords[1],
      },
      to: destination,
      destinationCoords: destinationCoords,
      route: route,
      distance: distance,
      cost: cost,
      ratePerKm: COST_PER_KM,
      status: 'In Progress',
      currentLocation: [currentLocation[0], currentLocation[1]],
      visitId: activeVisit?.id || null,
      customerName: activeVisit?.customerName || null,
    };

    try {
      const newTrip = await createTrip(tripData);
      if (user?.uid) {
        try {
          localStorage.setItem(`active_trip_${user.uid}`, JSON.stringify(newTrip));
        } catch (e) {
          console.warn('Failed to cache active trip:', e);
        }
      }
      setActiveTrip(newTrip);
      showMessage('Trip started successfully! Live GPS navigation active.', 'success');
    } catch (error) {
      showMessage(`Failed to start trip: ${error.message}`, 'error');
    }
  };

  // Automatic Arrival when driver reaches destination (<= 60m)
  const handleAutoArrival = useCallback(async (arrivalCoords) => {
    if (!currentTrip || isCompletingRef.current) return;
    isCompletingRef.current = true;

    try {
      const destName = destination || currentTrip.endLocation?.name || currentTrip.to || 'Destination';
      const finalUpdates = {
        status: 'Completed',
        endedAt: new Date().toISOString(),
        endLocation: {
          name: destName,
          lat: arrivalCoords[0],
          lng: arrivalCoords[1],
        },
        distance: distance || currentTrip.distance || 0,
        cost: cost || currentTrip.cost || 0,
        autoCompleted: true,
        isEarlyTermination: false,
      };

      await updateTripById(currentTrip.id, finalUpdates);
      if (user?.uid) {
        localStorage.removeItem(`active_trip_${user.uid}`);
      }
      clearActiveTrip();
      showMessage(`🎉 Destination reached (${destName})! Trip marked as completed successfully.`, 'success');
    } catch (error) {
      console.error('Failed to auto complete trip:', error);
      showMessage(`Destination reached, but failed to save status: ${error.message}`, 'error');
    } finally {
      isCompletingRef.current = false;
    }
  }, [currentTrip, destination, distance, cost, user?.uid, updateTripById, clearActiveTrip, showMessage]);

  // Manual Early Stop (Before reaching destination) with Stop Address & Recalculated Fare
  const handleStopTrip = useCallback(async () => {
    if (!currentTrip || isCompletingRef.current) return;
    isCompletingRef.current = true;

    try {
      const stopCoords = currentLocation || [
        currentTrip.startLocation?.lat || 20.5937,
        currentTrip.startLocation?.lng || 78.9629,
      ];

      // 1. Reverse geocode the exact stop coordinates where the user stopped
      let stopAddress = '';
      try {
        stopAddress = await reverseGeocode(stopCoords[0], stopCoords[1]);
      } catch (geoErr) {
        console.warn('Reverse geocode failed:', geoErr);
      }
      if (!stopAddress) {
        stopAddress = `Stopped near (${stopCoords[0].toFixed(4)}, ${stopCoords[1].toFixed(4)})`;
      }

      // 2. Calculate actual distance traveled from startLocation to stopCoords
      const startCoords = [
        currentTrip.startLocation?.lat ?? stopCoords[0],
        currentTrip.startLocation?.lng ?? stopCoords[1],
      ];

      const effectiveRate = Number(currentTrip.ratePerKm || COST_PER_KM);
      const directKm = computeHaversineDistance(startCoords, stopCoords);
      const isSameLocation = directKm < 0.05 || (
        stopAddress && currentTrip.startLocation?.name &&
        stopAddress.trim().toLowerCase() === currentTrip.startLocation.name.trim().toLowerCase()
      );

      let actualDistanceKm = 0;
      if (!isSameLocation && directKm >= 0.05) {
        try {
          const routeRes = await calculateRoute(startCoords, stopCoords, effectiveRate);
          actualDistanceKm = routeRes.distance;
        } catch (routeErr) {
          actualDistanceKm = Math.round(directKm * 1.25 * 100) / 100;
        }
      }

      actualDistanceKm = Math.round(actualDistanceKm * 100) / 100;

      // 3. Calculate actual fare based on actual traveled distance (0 if not traveled)
      const actualCost = actualDistanceKm > 0 ? parseFloat((actualDistanceKm * effectiveRate).toFixed(2)) : 0;


      const finalUpdates = {
        status: 'Completed',
        endedAt: new Date().toISOString(),
        endLocation: {
          name: stopAddress,
          lat: stopCoords[0],
          lng: stopCoords[1],
        },
        distance: actualDistanceKm,
        cost: actualCost,
        isEarlyTermination: true,
      };

      if (user?.uid) {
        localStorage.removeItem(`active_trip_${user.uid}`);
      }
      await updateTripById(currentTrip.id, finalUpdates);
      clearActiveTrip();

      setRoute(null);
      setDistance(0);
      setCost(0);
      setDestination('');
      setDestinationCoords(null);

      showMessage(
        `Trip stopped early at: ${stopAddress}. Actual Distance: ${actualDistanceKm} km | Amount: ₹${actualCost}`,
        'info'
      );
    } catch (error) {
      console.error('Failed to stop trip:', error);
      showMessage(`Failed to stop trip: ${error.message}`, 'error');
    } finally {
      isCompletingRef.current = false;
    }
  }, [currentTrip, currentLocation, user?.uid, updateTripById, clearActiveTrip, showMessage]);

  const handleRefreshLocation = useCallback(() => {
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation([latitude, longitude]);
        if (mapRef.current) mapRef.current.flyTo([latitude, longitude], 15);
        setLocationLoading(false);
        showMessage('Location refreshed.', 'success');
      },
      (error) => {
        setLocationLoading(false);
        showMessage(handleWatchError(error), 'error');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [showMessage, handleWatchError]);

  // Real-time GPS Watcher with Auto-Arrival Proximity Check
  useEffect(() => {
    let watchId;
    if (isTripInProgress && currentTrip) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          if (!isValidCoordinates(latitude, longitude)) return;

          const newLocation = [latitude, longitude];
          const now = Date.now();
          const prevLocation = lastLocationRef.current || currentLocation;
          const timeElapsedSeconds = (now - lastUpdateTimeRef.current) / 1000;

          // Outlier jump rejection (> 150 km/h)
          if (prevLocation && !isRealisticGpsMovement(prevLocation, newLocation, timeElapsedSeconds, 150)) {
            console.warn('GPS outlier jump discarded:', prevLocation, '->', newLocation);
            return;
          }

          // Check for Destination Arrival (Threshold: 60 meters = 0.06 km)
          const targetCoords = destinationCoords || currentTrip.destinationCoords ||
            (currentTrip.endLocation?.lat !== undefined ? [currentTrip.endLocation.lat, currentTrip.endLocation.lng] : null);

          if (targetCoords && isValidCoordinates(targetCoords[0], targetCoords[1])) {
            const distToDestKm = computeHaversineDistance(newLocation, targetCoords);
            if (distToDestKm <= 0.06) {
              handleAutoArrival(newLocation);
              return;
            }
          }

          // Throttle writes: write if moved >= 10m OR if >= 10s passed
          const distanceMovedKm = prevLocation ? computeHaversineDistance(prevLocation, newLocation) : 1;
          const shouldWriteFirestore = distanceMovedKm >= 0.01 || timeElapsedSeconds >= 10;

          setCurrentLocation(newLocation);
          if (shouldWriteFirestore) {
            lastLocationRef.current = newLocation;
            lastUpdateTimeRef.current = now;
            updateTripById(currentTrip.id, { currentLocation: newLocation });
            if (user?.uid) {
              try {
                localStorage.setItem(`active_trip_${user.uid}`, JSON.stringify({
                  ...currentTrip,
                  currentLocation: newLocation
                }));
              } catch (e) {
                console.warn('Failed to update cached active trip:', e);
              }
            }
          }
        },
        (err) => {
          console.error("Error watching position:", err);
          showMessage('Could not get real-time location. Please check GPS settings.', 'error');
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    }

    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [isTripInProgress, currentTrip, destinationCoords, user?.uid, updateTripById, handleAutoArrival, showMessage]);

  return (
    <Container maxWidth="lg" sx={{ mt: { xs: 1, md: 2 }, mb: { xs: 1, md: 2 }, px: { xs: 1, md: 3 } }}>
      <Grid container spacing={{ xs: 1, md: 2 }}>
        <Grid item xs={12} md={4} order={{ xs: 2, md: 1 }}>
          <Paper sx={{ p: { xs: 1.5, md: 2 }, height: 'fit-content' }}>
            <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1.1rem', md: '1.25rem' } }}>
              Trip Control
            </Typography>

            {/* Active Planned Visit Alert Banner */}
            {activeVisit && (
              <Alert
                severity="info"
                onClose={() => dispatch(clearActiveVisit())}
                sx={{ mb: 2, borderRadius: 2 }}
              >
                <Typography variant="subtitle2" fontWeight={700}>
                  Active Visit: {activeVisit.customerName}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  {activeVisit.customerAddress || 'Assigned healthcare destination'}
                </Typography>
              </Alert>
            )}

            {/* Current Location Display */}
            <Card variant="outlined" sx={{ mb: 2, p: { xs: 1.5, md: 2 } }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ fontSize: { xs: '0.8rem', md: '0.875rem' } }}>
                Current Location
              </Typography>
              {locationLoading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={20} />
                  <Typography variant="body2" sx={{ fontSize: { xs: '0.8rem', md: '0.875rem' } }}>Getting location...</Typography>
                </Box>
              ) : currentLocation ? (
                <Box>
                  <Typography variant="body2" sx={{ mb: 1, fontSize: { xs: '0.75rem', md: '0.875rem' }, wordBreak: 'break-all' }}>
                    📍 {currentLocation[0].toFixed(4)}, {currentLocation[1].toFixed(4)}
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={handleRefreshLocation}
                    startIcon={<RefreshIcon />}
                    fullWidth
                    sx={{ mt: 1, fontSize: { xs: '0.75rem', md: '0.875rem' } }}
                  >
                    Refresh Location
                  </Button>
                </Box>
              ) : (
                <Alert severity="warning" sx={{ mt: 1, fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                  Location not available. Please enable GPS.
                </Alert>
              )}
            </Card>

            {/* Destination Input */}
            <ClickAwayListener onClickAway={() => setShowSuggestions(false)}>
              <Box sx={{ position: 'relative', mb: 2 }}>
                <TextField
                  ref={destinationInputRef}
                  fullWidth
                  label="Enter Destination"
                  value={destination}
                  onChange={(e) => handleDestinationInputChange(e.target.value)}
                  variant="outlined"
                  size="small"
                  InputProps={{
                    startAdornment: <LocationIcon color="action" sx={{ mr: 1 }} />,

                    sx: { fontSize: { xs: '0.875rem', md: '1rem' } }
                  }}
                  InputLabelProps={{
                    sx: { fontSize: { xs: '0.875rem', md: '1rem' } }
                  }}
                />
                
                {/* Suggestions Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <Paper
                    sx={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      zIndex: 1000,
                      maxHeight: { xs: 200, md: 300 },
                      overflow: 'auto',
                      mt: 0.5,
                      border: '1px solid #e0e0e0'
                    }}
                  >
                    <List dense>
                      {suggestions.map((suggestion, index) => (
                        <ListItem
                          key={index}
                          button
                          onClick={() => handleSuggestionClick(suggestion)}
                          sx={{ 
                            py: { xs: 0.5, md: 1 },
                            '&:hover': { backgroundColor: '#f5f5f5' }
                          }}
                        >
                          <ListItemText
                            primary={suggestion.display_name}
                            primaryTypographyProps={{
                              fontSize: { xs: '0.8rem', md: '0.875rem' },
                              sx: { wordBreak: 'break-word' }
                            }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                )}
              </Box>
            </ClickAwayListener>

            {/* Action Buttons */}
            <Stack spacing={{ xs: 1, md: 1.5 }}>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<DirectionsIcon />}
                onClick={handleGetDirections}
                disabled={!currentLocation || isRouteLoading}
                fullWidth
                size={window.innerWidth < 600 ? "medium" : "large"}
                sx={{ fontSize: { xs: '0.8rem', md: '0.875rem' } }}
              >
                {isRouteLoading ? <CircularProgress size={24} color="inherit" /> : 'Get Directions'}
              </Button>

              <Button
                variant="contained"
                color="success"
                startIcon={<StartIcon />}
                onClick={handleStartTrip}
                disabled={!route || isTripInProgress}
                fullWidth
                size={window.innerWidth < 600 ? "medium" : "large"}
                sx={{ fontSize: { xs: '0.8rem', md: '0.875rem' } }}
              >
                Start Trip
              </Button>

              <Button
                variant="contained"
                color="error"
                startIcon={<StopIcon />}
                onClick={handleStopTrip}
                disabled={!isTripInProgress}
                fullWidth
                size={window.innerWidth < 600 ? "medium" : "large"}
                sx={{ fontSize: { xs: '0.8rem', md: '0.875rem' } }}
              >
                Stop Trip
              </Button>
            </Stack>

            {/* Trip Details Card */}
            <Card variant="outlined" sx={{ mt: 2, p: { xs: 1.5, md: 2 } }}>
              <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1rem', md: '1.25rem' } }}>Trip Details</Typography>
              <Typography variant="body2" sx={{ fontSize: { xs: '0.8rem', md: '0.875rem' } }}>Distance: {distance} km</Typography>
              <Typography variant="body2" sx={{ fontSize: { xs: '0.8rem', md: '0.875rem' } }}>Est. Cost: ₹{cost}</Typography>
              {isTripInProgress && (
                <Typography variant="body2" color="primary" sx={{ fontSize: { xs: '0.8rem', md: '0.875rem' } }}>
                  Status: {currentTrip?.status}
                </Typography>
              )}
            </Card>
          </Paper>
        </Grid>

        {/* Map Panel */}
        <Grid item xs={12} md={8} order={{ xs: 1, md: 2 }}>
          <Paper elevation={2} sx={{ p: { xs: 1, md: 1.5 }, display: 'flex', flexDirection: 'column', height: { xs: '52vh', sm: 460, md: 600 }, minHeight: { xs: 340, sm: 420, md: 540 }, borderRadius: 3, overflow: 'hidden' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, px: 0.5 }}>
              <Typography variant="h6" sx={{ fontSize: { xs: '0.95rem', md: '1.15rem' }, fontWeight: 700 }}>
                Live Map View
              </Typography>
              {isTripInProgress && (
                <Chip 
                  label="🔴 LIVE GPS TRACKING" 
                  color="success" 
                  size="small" 
                  sx={{ fontWeight: 700, fontSize: '0.68rem', height: 22 }} 
                />
              )}
            </Box>
            {locationLoading ? (
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: { xs: 'calc(100% - 40px)', md: '90%' }
              }}>
                <CircularProgress />
              </Box>
            ) : isValidCoords(currentLocation) ? (
              <Box className="ola-map-responsive-wrapper" sx={{ flex: 1, minHeight: 0, position: 'relative', width: '100%', borderRadius: 2, overflow: 'hidden' }}>
                <OlaMap
                  center={currentLocation}
                  currentLocation={currentLocation}
                  destinationCoords={destinationCoords}
                  destinationName={destination}
                  route={route}
                  isTripInProgress={isTripInProgress}
                  style={{ height: '100%', width: '100%' }}
                />
              </Box>
            ) : (
              <Alert severity="error" sx={{ m: { xs: 1, md: 2 }, fontSize: { xs: '0.8rem', md: '0.875rem' } }}>
                Unable to load map. Please enable location services.
              </Alert>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ bottom: { xs: 80, md: 24 } }} // Adjust for mobile bottom navigation
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default SalesDashboard;