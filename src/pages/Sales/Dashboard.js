import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Button,
  TextField,
  Card,
  CardContent,
  CircularProgress,
  Snackbar,
  Alert,
  Grid
} from '@mui/material';
import { 
  LocationOn as LocationIcon,
  MyLocation as MyLocationIcon,
  Save as SaveIcon,
  PlayArrow as StartIcon,
  Stop as StopIcon
} from '@mui/icons-material';
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

// Default center (will be overridden by user's current location)
const defaultCenter = [20.5937, 78.9629]; // [lat, lng] format for Leaflet

// Cost per kilometer in INR
const COST_PER_KM = 3;

const SalesDashboard = () => {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [destination, setDestination] = useState('');
  const [tripStarted, setTripStarted] = useState(false);
  const [route, setRoute] = useState(null);
  const [distance, setDistance] = useState(0);
  const [cost, setCost] = useState(0);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [destinationCoords, setDestinationCoords] = useState(null);
  const mapRef = useRef(null);
  const autocompleteRef = useRef(null);

  // Get current location on component mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const location = [latitude, longitude];
          setCurrentLocation(location);
          setLoading(false);
        },
        (error) => {
          console.error('Error getting location:', error);
          setSnackbar({ 
            open: true, 
            message: 'Error getting your location', 
            severity: 'error' 
          });
          setLoading(false);
        }
      );
    } else {
      setSnackbar({ 
        open: true, 
        message: 'Geolocation is not supported by your browser', 
        severity: 'error' 
      });
      setLoading(false);
    }
  }, []);

  // Handle destination change
  const handleDestinationChange = useCallback((e) => {
    setDestination(e.target.value);
  }, []);

  // Handle place selection from Autocomplete
  const onPlaceChanged = useCallback(() => {
    if (autocompleteRef.current !== null) {
      const place = autocompleteRef.current.getPlace();
      // Add proper null checks to prevent the geometry error
      if (place && place.geometry && place.formatted_address) {
        setDestination(place.formatted_address);
      } else if (place && place.name) {
        // Fallback to place name if formatted_address is not available
        setDestination(place.name);
      }
    }
  }, []);

  // Geocode address using OpenStreetMap Nominatim
  const geocodeAddress = async (address) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        return [parseFloat(lat), parseFloat(lon)];
      }
      return null;
    } catch (error) {
      console.error('Error geocoding address:', error);
      return null;
    }
  };

  // Calculate distance between two points using Haversine formula
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in km
  };

  // Convert degrees to radians
  const toRad = (value) => {
    return value * Math.PI / 180;
  };

  // Handle starting a trip
  const handleStartTrip = useCallback(async () => {
    if (!destination) {
      setSnackbar({ open: true, message: 'Please enter a destination', severity: 'warning' });
      return;
    }
    
    setLoading(true);
    try {
      const coords = await geocodeAddress(destination);
      if (coords) {
        setDestinationCoords(coords);
        
        // Get route using OSRM (Open Source Routing Machine)
        const [startLng, startLat] = currentLocation;
        const [destLng, destLat] = coords;
        
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${destLng},${destLat}?overview=full&geometries=geojson`
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            setRoute({
              geometry: route.geometry,
              distance: route.distance / 1000, // Convert to km
              duration: route.duration / 60, // Convert to minutes
              waypoints: []
            });
            
            setDistance((route.distance / 1000).toFixed(2));
            setCost(((route.distance / 1000) * COST_PER_KM).toFixed(2));
            setTripStarted(true);
          }
        } else {
          throw new Error('Failed to get route');
        }
      } else {
        setSnackbar({ open: true, message: 'Could not find the destination address', severity: 'error' });
      }
    } catch (error) {
      console.error('Error starting trip:', error);
      setSnackbar({ open: true, message: 'Error starting trip', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [currentLocation, destination]);

  // Handle stopping a trip
  const handleStopTrip = useCallback(() => {
    setTripStarted(false);
    setSnackbar({ open: true, message: 'Trip stopped', severity: 'success' });
  }, []);

  // Handle saving the trip
  const handleSaveTrip = useCallback(() => {
    // In a real app, you would save the trip to your backend
    setSnackbar({ open: true, message: 'Trip saved successfully', severity: 'success' });
  }, []);

  // Handle export trip details as CSV
  const handleExportCsv = useCallback(() => {
    if (!route) return;
    
    try {
      const tripDetails = [
        ['From', 'To', 'Distance (km)', 'Cost (₹)', 'Duration (min)', 'Date', 'Time'],
        [
          'Current Location', // In a real app, you would have the actual address
          destination || 'Destination',
          distance,
          `₹${cost}`,
          Math.round(route.duration),
          new Date().toLocaleDateString(),
          new Date().toLocaleTimeString()
        ]
      ];

      // Convert to CSV string
      const csvContent = tripDetails.map(row => 
        row.map(field => `"${field}"`).join(',')
      ).join('\n');

      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `trip_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      setSnackbar({ open: true, message: 'Error exporting trip details', severity: 'error' });
    }
  }, [route, distance, cost, destination]);

  // Handle export trip details as PDF
  const handleExportPdf = useCallback(() => {
    if (!route) return;
    
    // In a real app, you would use a PDF generation library like jspdf or pdfmake
    // This is a simplified version that shows a preview of what would be exported
    const pdfContent = `
      Trip Details
      ============
      
      From: Current Location
      To: ${destination || 'Destination'}
      Distance: ${distance} km
      Estimated Cost: ₹${cost}
      Duration: ${Math.round(route.duration)} minutes
      
      Trip Date: ${new Date().toLocaleDateString()}
      Trip Time: ${new Date().toLocaleTimeString()}
    `;

    // In a real implementation, you would generate and download a PDF here
    // For now, we'll show the content in an alert
    alert(`PDF Export for Trip\n\n${pdfContent}`);
    
    // Example of how you might implement PDF generation with jspdf:
    // const doc = new jsPDF();
    // doc.text(pdfContent, 10, 10);
    // doc.save(`trip_${new Date().toISOString().split('T')[0]}.pdf`);
  }, [route, distance, cost, destination]);

  // Close snackbar
  const handleCloseSnackbar = useCallback(() => {
    setSnackbar(prev => ({ ...prev, open: false }));
  }, []);

  // Memoize map options for better performance
  const mapOptions = useMemo(() => ({
    center: currentLocation || defaultCenter,
    zoom: currentLocation ? 15 : 5,
  }), [currentLocation]);

  // Memoize directions service options
  const directionsServiceOptions = useMemo(() => ({
    destination: destination,
    origin: currentLocation,
    travelMode: 'DRIVING',
  }), [destination, currentLocation]);

  // Memoize directions renderer options
  const directionsRendererOptions = useMemo(() => ({
    directions: route,
    suppressMarkers: false
  }), [route]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={3}>
        {/* Left side - Controls */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Sales Dashboard
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <TextField
                fullWidth
                label="Destination"
                variant="outlined"
                value={destination}
                onChange={handleDestinationChange}
                onKeyPress={(e) => e.key === 'Enter' && handleStartTrip()}
                placeholder="Enter destination address"
                InputProps={{
                  startAdornment: <LocationIcon color="primary" sx={{ mr: 1 }} />
                }}
                disabled={tripStarted}
              />
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Trip Details
              </Typography>
              <Card variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="textSecondary">Distance</Typography>
                    <Typography variant="h6">{distance} km</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="textSecondary">Estimated Cost</Typography>
                    <Typography variant="h6">₹{cost}</Typography>
                  </Grid>
                  {route?.duration && (
                    <Grid item xs={12}>
                      <Typography variant="caption" color="textSecondary">Estimated Duration</Typography>
                      <Typography variant="body1">{Math.round(route.duration)} minutes</Typography>
                    </Grid>
                  )}
                </Grid>
              </Card>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {!tripStarted ? (
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  startIcon={<StartIcon />}
                  onClick={handleStartTrip}
                  disabled={!destination || loading}
                >
                  {loading ? 'Starting...' : 'Start Trip'}
                </Button>
              ) : (
                <>
                  <Button
                    variant="contained"
                    color="error"
                    size="large"
                    startIcon={<StopIcon />}
                    onClick={handleStopTrip}
                  >
                    Stop Trip
                  </Button>
                  <Button
                    variant="outlined"
                    color="primary"
                    size="large"
                    startIcon={<SaveIcon />}
                    onClick={handleSaveTrip}
                  >
                    Save Trip
                  </Button>
                </>
              )}
              
              <Button
                variant="outlined"
                color="primary"
                size="large"
                startIcon={<SaveIcon />}
                onClick={handleExportCsv}
                disabled={!route}
              >
                Export CSV
              </Button>
              
              <Button
                variant="outlined"
                color="primary"
                size="large"
                startIcon={<SaveIcon />}
                onClick={handleExportPdf}
                disabled={!route}
              >
                Export PDF
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Right side - Map */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ height: '100%', minHeight: '500px', position: 'relative' }}>
            {loading ? (
              <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                <CircularProgress />
              </Box>
            ) : (
              <MapContainer 
                center={currentLocation || defaultCenter} 
                zoom={13} 
                style={{ height: '100%', width: '100%' }}
                ref={mapRef}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                
                {currentLocation && (
                  <Marker position={currentLocation}>
                    <Popup>Your Location</Popup>
                  </Marker>
                )}
                
                {destinationCoords && (
                  <Marker position={destinationCoords}>
                    <Popup>Destination</Popup>
                  </Marker>
                )}
                
                {route?.geometry && (
                  <Polyline 
                    positions={route.geometry.coordinates.map(coord => [coord[1], coord[0]])} 
                    color="blue"
                  />
                )}
              </MapContainer>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SalesDashboard;
