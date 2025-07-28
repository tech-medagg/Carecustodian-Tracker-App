import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FaPlay, FaStop, FaRoute, FaExclamationTriangle } from 'react-icons/fa';
import { Box, Button, Card, CardContent, Typography, CircularProgress, Alert, Paper } from '@mui/material';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import 'leaflet-defaulticon-compatibility';

// Leaflet marker icon fix
import L from 'leaflet';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const center = [20.5937, 78.9629]; // Center of India [lat, lng]

const RATE_PER_KM = 3; // ₹3 per km

// Haversine formula to calculate distance between two coordinates in kilometers
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const TripTracker = () => {
  const [isTracking, setIsTracking] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [tripData, setTripData] = useState({
    distance: 0,
    cost: 0,
    coordinates: []
  });
  const [currentPosition, setCurrentPosition] = useState(null);
  const [geoError, setGeoError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const watchId = useRef(null);

  // Clean up geolocation watcher on unmount
  useEffect(() => {
    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
  }, []);

  // Load saved trip data from localStorage on component mount
  useEffect(() => {
    try {
      const savedTrip = localStorage.getItem('salesmanTrip');
      if (savedTrip) {
        setTripData(JSON.parse(savedTrip));
      }
    } catch (error) {
      console.error('Error loading trip data:', error);
    }
    setIsLoading(false);
  }, []);

  // Save trip data to localStorage whenever it changes
  useEffect(() => {
    if (tripData.coordinates.length > 0) {
      try {
        localStorage.setItem('salesmanTrip', JSON.stringify(tripData));
      } catch (error) {
        console.error('Error saving trip data:', error);
      }
    }
  }, [tripData]);

  const updatePosition = useCallback((position) => {
    const { latitude, longitude } = position.coords;
    const newCoordinate = {
      lat: latitude,
      lng: longitude,
      timestamp: Date.now()
    };
    
    setCurrentPosition(newCoordinate);
    
    setTripData(prev => {
      const coordinates = [...prev.coordinates, newCoordinate];
      let distance = 0;
      
      // Calculate total distance
      for (let i = 1; i < coordinates.length; i++) {
        distance += calculateDistance(
          coordinates[i - 1].lat,
          coordinates[i - 1].lng,
          coordinates[i].lat,
          coordinates[i].lng
        );
      }
      
      return {
        coordinates,
        distance,
        cost: distance * RATE_PER_KM
      };
    });
  }, []);

  const stopTracking = useCallback(() => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setIsTracking(false);
  }, []);

  const startTracking = useCallback(() => {
    setGeoError(null);
    
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser');
      return;
    }

    setIsTracking(true);
    
    // Get current position first
    navigator.geolocation.getCurrentPosition(
      (position) => {
        updatePosition(position);
        
        // Start watching position
        watchId.current = navigator.geolocation.watchPosition(
          updatePosition,
          (error) => {
            console.error('Error getting location:', error);
            setGeoError('Error getting location. Please ensure location services are enabled.');
            stopTracking();
          },
          { 
            enableHighAccuracy: true, 
            maximumAge: 10000, 
            timeout: 5000 
          }
        );
      },
      (error) => {
        console.error('Error getting initial location:', error);
        setGeoError('Error getting initial location. Please ensure location services are enabled.');
        setIsTracking(false);
      },
      { 
        enableHighAccuracy: true, 
        timeout: 5000,
        maximumAge: 0 
      }
    );
  }, [updatePosition, stopTracking]);

  const resetTrip = useCallback(() => {
    if (window.confirm('Are you sure you want to reset the current trip?')) {
      try {
        localStorage.removeItem('salesmanTrip');
      } catch (error) {
        console.error('Error resetting trip:', error);
      }
      setTripData({ distance: 0, cost: 0, coordinates: [] });
      setCurrentPosition(null);
    }
  }, []);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Trip Tracker
      </Typography>
      
      {geoError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <Box display="flex" alignItems="center">
            <FaExclamationTriangle style={{ marginRight: 8 }} />
            {geoError}
          </Box>
        </Alert>
      )}
      
      <Box display="flex" gap={2} flexWrap="wrap" mb={3}>
        <Button
          variant="contained"
          color="success"
          startIcon={<FaPlay />}
          onClick={startTracking}
          disabled={isTracking}
        >
          Start Trip
        </Button>
        
        <Button
          variant="contained"
          color="error"
          startIcon={<FaStop />}
          onClick={stopTracking}
          disabled={!isTracking}
        >
          Stop Trip
        </Button>
        
        <Button
          variant="outlined"
          startIcon={<FaRoute />}
          onClick={() => setShowMap(prev => !prev)}
        >
          {showMap ? 'Hide Map' : 'Show Map'}
        </Button>
        
        {tripData.coordinates.length > 0 && (
          <Button
            variant="outlined"
            color="warning"
            onClick={resetTrip}
          >
            Reset Trip
          </Button>
        )}
      </Box>
      
      <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }} gap={3} mb={3}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Trip Summary
            </Typography>
            <Box display="grid" gap={1}>
              <Box display="flex" justifyContent="space-between">
                <Typography>Distance:</Typography>
                <Typography fontWeight="bold">{tripData.distance.toFixed(2)} km</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography>Cost:</Typography>
                <Typography fontWeight="bold">₹{tripData.cost.toFixed(2)}</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography>Points Recorded:</Typography>
                <Typography fontWeight="bold">{tripData.coordinates.length}</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" mt={1} pt={1} borderTop={1} borderColor="divider">
                <Typography>Rate:</Typography>
                <Typography>₹{RATE_PER_KM}/km</Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
        
        {showMap && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Route Map
              </Typography>
              <Box sx={{ height: 400, width: '100%', borderRadius: 1, overflow: 'hidden' }}>
                <MapContainer 
                  center={currentPosition ? [currentPosition.lat, currentPosition.lng] : center} 
                  zoom={currentPosition ? 13 : 4}
                  style={{ height: '100%', width: '100%' }}
                  scrollWheelZoom={true}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  
                  {tripData.coordinates.length > 0 && (
                    <Polyline 
                      positions={tripData.coordinates.map(coord => [coord.lat, coord.lng])} 
                      pathOptions={{ color: 'blue' }}
                    />
                  )}
                  
                  {currentPosition && (
                    <Marker position={[currentPosition.lat, currentPosition.lng]}>
                      <Popup>Your current location</Popup>
                    </Marker>
                  )}
                </MapContainer>
              </Box>
            </CardContent>
          </Card>
        )}
      </Box>
      
      <Paper elevation={0} sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
        <Box display="flex" alignItems="center" gap={1}>
          {isTracking ? (
            <>
              <CircularProgress size={16} color="primary" />
              <Typography variant="body2" color="text.secondary">
                Tracking in progress...
              </Typography>
            </>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Ready to start tracking
            </Typography>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default TripTracker;
