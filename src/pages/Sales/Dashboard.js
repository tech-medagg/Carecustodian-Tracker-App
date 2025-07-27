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
import { GoogleMap, LoadScript, DirectionsService, DirectionsRenderer, Autocomplete, Marker } from '@react-google-maps/api';

// Map container style
const containerStyle = {
  width: '100%',
  height: '400px',
  borderRadius: '8px'
};

// Default center (will be overridden by user's current location)
const defaultCenter = {
  lat: 20.5937, // Default to India's center
  lng: 78.9629
};

// Cost per kilometer in INR
const COST_PER_KM = 8;

const SalesDashboard = () => {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [destination, setDestination] = useState('');
  const [tripStarted, setTripStarted] = useState(false);
  const [directions, setDirections] = useState(null);
  const [distance, setDistance] = useState(0);
  const [cost, setCost] = useState(0);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const autocompleteRef = useRef(null);

  // Get current location on component mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentLocation({ lat: latitude, lng: longitude });
          setLoading(false);
        },
        (error) => {
          console.error('Error getting location:', error);
          setSnackbar({ open: true, message: 'Error getting your location', severity: 'error' });
          setLoading(false);
        }
      );
    } else {
      setSnackbar({ open: true, message: 'Geolocation is not supported by your browser', severity: 'error' });
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

  // Handle start trip
  const handleStartTrip = useCallback(() => {
    if (!destination) {
      setSnackbar({ open: true, message: 'Please enter a destination', severity: 'warning' });
      return;
    }
    setTripStarted(true);
  }, [destination]);

  // Handle end trip
  const handleEndTrip = useCallback(() => {
    setTripStarted(false);
    setSnackbar({ open: true, message: 'Trip completed successfully!', severity: 'success' });
  }, []);

  // Handle directions response
  const directionsCallback = useCallback((response) => {
    if (response !== null) {
      if (response.status === 'OK') {
        setDirections(response);
        const distanceInKm = response.routes[0].legs[0].distance.value / 1000; // Convert to km
        setDistance(distanceInKm.toFixed(2));
        setCost((distanceInKm * COST_PER_KM).toFixed(2));
      } else {
        setSnackbar({ open: true, message: 'Could not calculate route', severity: 'error' });
      }
    }
  }, []);

  // Handle export trip details as CSV
  const handleExportCsv = useCallback(() => {
    if (!directions) return;
    
    try {
      const tripDetails = {
        'From': `"${directions.routes[0].legs[0].start_address}"`,
        'To': `"${directions.routes[0].legs[0].end_address}"`,
        'Distance (km)': `"${distance} km"`,
        'Cost (₹)': `"₹${cost}"`,
        'Duration': `"${directions.routes[0].legs[0].duration.text}"`,
        'Date': `"${new Date().toLocaleDateString()}"`,
        'Time': `"${new Date().toLocaleTimeString()}"`
      };

      // Create CSV content
      const csvContent = [
        Object.keys(tripDetails),
        Object.values(tripDetails)
      ].map(row => row.join(',')).join('\n');

      // Create and trigger download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `trip-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setSnackbar({ open: true, message: 'Trip exported as CSV successfully!', severity: 'success' });
    } catch (error) {
      console.error('Error exporting CSV:', error);
      setSnackbar({ open: true, message: 'Error exporting trip details', severity: 'error' });
    }
  }, [directions, distance, cost]);

  // Handle export trip details as PDF
  const handleExportPdf = useCallback(() => {
    if (!directions) return;
    
    // In a real app, you would use a PDF generation library like jspdf or pdfmake
    // This is a simplified version that shows a preview of what would be exported
    const pdfContent = `
      Trip Details
      ============
      
      From: ${directions.routes[0].legs[0].start_address}
      To: ${directions.routes[0].legs[0].end_address}
      Distance: ${distance} km
      Estimated Cost: ₹${cost}
      Duration: ${directions.routes[0].legs[0].duration.text}
      
      Trip Date: ${new Date().toLocaleDateString()}
      Trip Time: ${new Date().toLocaleTimeString()}
      
      Generated on: ${new Date().toLocaleString()}
    `;
    
    // In a real implementation, you would generate and download a PDF here
    // For now, we'll show the content in an alert
    alert(`PDF Export for Trip\n\n${pdfContent}`);
  }, [directions, distance, cost]);

  // Close snackbar
  const handleCloseSnackbar = useCallback(() => {
    setSnackbar({ ...snackbar, open: false });
  }, [snackbar]);

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
    directions: directions,
    suppressMarkers: false
  }), [directions]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Trip Tracker
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Trip Details
              </Typography>
              
              <Box mb={2}>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  Current Location
                </Typography>
                <TextField
                  fullWidth
                  variant="outlined"
                  value={currentLocation ? 'Your current location' : 'Unable to detect location'}
                  disabled
                  InputProps={{
                    startAdornment: <MyLocationIcon color="primary" sx={{ mr: 1 }} />
                  }}
                />
              </Box>
              
              <Box mb={3}>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  Destination
                </Typography>
                {!process.env.REACT_APP_GOOGLE_MAPS_API_KEY ? (
                  <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="Enter destination address (Google Maps API key not configured)"
                    value={destination}
                    onChange={handleDestinationChange}
                    InputProps={{
                      startAdornment: <LocationIcon color="primary" sx={{ mr: 1 }} />
                    }}
                  />
                ) : (
                  <LoadScript
                    googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY}
                    libraries={['places']}
                    onError={(error) => {
                      console.error('Google Maps LoadScript error:', error);
                      setSnackbar({ 
                        open: true, 
                        message: 'Failed to load Google Maps. Please check your API key configuration.', 
                        severity: 'error' 
                      });
                    }}
                  >
                    <Autocomplete
                      onLoad={autocomplete => autocompleteRef.current = autocomplete}
                      onPlaceChanged={onPlaceChanged}
                    >
                      <TextField
                        fullWidth
                        variant="outlined"
                        placeholder="Enter destination address"
                        value={destination}
                        onChange={handleDestinationChange}
                        InputProps={{
                          startAdornment: <LocationIcon color="primary" sx={{ mr: 1 }} />
                        }}
                      />
                    </Autocomplete>
                  </LoadScript>
                )}
              </Box>

              {!tripStarted ? (
                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  size="large"
                  startIcon={<StartIcon />}
                  onClick={handleStartTrip}
                  disabled={!destination}
                >
                  Start Trip
                </Button>
              ) : (
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Button
                      fullWidth
                      variant="contained"
                      color="error"
                      size="large"
                      startIcon={<StopIcon />}
                      onClick={handleEndTrip}
                    >
                      End Trip
                    </Button>
                  </Grid>
                  <Grid item xs={6}>
                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <Button
                          fullWidth
                          variant="outlined"
                          color="primary"
                          size="large"
                          startIcon={<SaveIcon />}
                          onClick={handleExportCsv}
                          disabled={!directions}
                          sx={{ whiteSpace: 'nowrap' }}
                        >
                          Export CSV
                        </Button>
                      </Grid>
                      <Grid item xs={6}>
                        <Button
                          fullWidth
                          variant="contained"
                          color="primary"
                          size="large"
                          startIcon={<SaveIcon />}
                          onClick={handleExportPdf}
                          disabled={!directions}
                          sx={{ whiteSpace: 'nowrap' }}
                        >
                          Export PDF
                        </Button>
                      </Grid>
                    </Grid>
                  </Grid>
                </Grid>
              )}
            </CardContent>
          </Card>

          {tripStarted && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Trip Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="textSecondary">Distance</Typography>
                    <Typography variant="h6">{distance} km</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="textSecondary">Estimated Cost</Typography>
                    <Typography variant="h6">₹{cost}</Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          )}
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ height: '100%', minHeight: '500px', position: 'relative' }}>
            {!process.env.REACT_APP_GOOGLE_MAPS_API_KEY ? (
              <Box 
                display="flex" 
                justifyContent="center" 
                alignItems="center" 
                height="400px"
                sx={{ 
                  backgroundColor: '#f5f5f5', 
                  borderRadius: '8px',
                  flexDirection: 'column',
                  gap: 2
                }}
              >
                <LocationIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
                <Typography variant="h6" color="text.secondary">
                  Google Maps API Key Required
                </Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  Please configure REACT_APP_GOOGLE_MAPS_API_KEY in your environment variables to display the map.
                </Typography>
              </Box>
            ) : (
              <LoadScript
                googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY}
                libraries={['places']}
              >
                <GoogleMap
                  mapContainerStyle={containerStyle}
                  center={mapOptions.center}
                  zoom={mapOptions.zoom}
                >
                  {currentLocation && (
                    <Marker position={currentLocation} />
                  )}
                  
                  {tripStarted && currentLocation && destination && (
                    <DirectionsService
                      options={directionsServiceOptions}
                      callback={directionsCallback}
                    />
                  )}
                  
                  {directions && (
                    <DirectionsRenderer
                      options={directionsRendererOptions}
                    />
                  )}
                </GoogleMap>
              </LoadScript>
            )}
          </Paper>
        </Grid>
      </Grid>
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SalesDashboard;
