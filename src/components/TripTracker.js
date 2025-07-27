import React, { useState, useEffect, useRef } from 'react';
import { GoogleMap, LoadScript, Polyline, Marker } from '@react-google-maps/api';
import { FaPlay, FaStop, FaRoute } from 'react-icons/fa';

const containerStyle = {
  width: '100%',
  height: '400px'
};

const center = {
  lat: 20.5937, // Center of India
  lng: 78.9629
};

const RATE_PER_KM = 10; // ₹10 per km

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
  const [tripData, setTripData] = useState({
    distance: 0,
    cost: 0,
    coordinates: []
  });
  const [currentPosition, setCurrentPosition] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const watchId = useRef(null);
  
  // Button classes
  const buttonBase = 'btn px-4 py-2 rounded-md font-medium';
  const buttonPrimary = `${buttonBase} bg-blue-500 text-white hover:bg-blue-600`;
  const buttonDanger = `${buttonBase} bg-red-500 text-white hover:bg-red-600`;
  const buttonSuccess = `${buttonBase} bg-green-500 text-white hover:bg-green-600`;
  const buttonWarning = `${buttonBase} bg-yellow-500 text-white hover:bg-yellow-600`;
  const buttonDisabled = 'opacity-50 cursor-not-allowed';

  // Load saved trip data from localStorage on component mount
  useEffect(() => {
    const savedTrip = localStorage.getItem('salesmanTrip');
    if (savedTrip) {
      setTripData(JSON.parse(savedTrip));
    }
  }, []);

  // Save trip data to localStorage whenever it changes
  useEffect(() => {
    if (tripData.coordinates.length > 0) {
      localStorage.setItem('salesmanTrip', JSON.stringify(tripData));
    }
  }, [tripData]);

  const startTracking = () => {
    if (navigator.geolocation) {
      setIsTracking(true);
      setShowMap(true);
      
      // Get current position first
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const newCoordinate = {
            lat: latitude,
            lng: longitude,
            timestamp: Date.now()
          };
          
          setCurrentPosition(newCoordinate);
          setTripData(prev => ({
            ...prev,
            coordinates: [newCoordinate]
          }));
          
          // Start watching position
          watchId.current = navigator.geolocation.watchPosition(
            (position) => {
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
            },
            (error) => {
              console.error('Error getting location:', error);
              alert('Error getting location. Please ensure location services are enabled.');
              stopTracking();
            },
            { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
          );
        },
        (error) => {
          console.error('Error getting initial location:', error);
          alert('Error getting initial location. Please ensure location services are enabled.');
          setIsTracking(false);
        }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  };

  const stopTracking = () => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setIsTracking(false);
  };

  const toggleMap = () => {
    setShowMap(!showMap);
  };

  const resetTrip = () => {
    if (window.confirm('Are you sure you want to reset the current trip?')) {
      localStorage.removeItem('salesmanTrip');
      setTripData({ distance: 0, cost: 0, coordinates: [] });
      setCurrentPosition(null);
    }
  };

  const pathCoordinates = tripData.coordinates.map(coord => ({
    lat: coord.lat,
    lng: coord.lng
  }));

  return (
    <div className="app-container">
      <div className="main-content">
        <h1 className="app-title">Medagg Tracker</h1>
        
        <div className="button-group">
          <button
            onClick={startTracking}
            disabled={isTracking}
            className={`${buttonBase} ${isTracking ? buttonDisabled : buttonSuccess}`}
          >
            <FaPlay /> Start Trip
          </button>
          
          <button
            onClick={stopTracking}
            disabled={!isTracking}
            className={`${buttonBase} ${!isTracking ? buttonDisabled : buttonDanger}`}
          >
            <FaStop /> End Trip
          </button>
          
          <button
            onClick={toggleMap}
            className={`${buttonBase} ${buttonPrimary} flex items-center`}
          >
            <FaRoute /> {showMap ? 'Hide Map' : 'Show Map'}
          </button>
          
          {tripData.coordinates.length > 0 && (
            <button
              onClick={resetTrip}
              className={`${buttonBase} ${buttonWarning}`}
            >
              Reset Trip
            </button>
          )}
        </div>

        <div className="content-grid">
          <div className="summary-card">
            <h2 className="section-title">Trip Summary</h2>
            <div className="summary-content">
              <p className="summary-item">
                <span className="font-medium">Distance:</span>{' '}
                {tripData.distance.toFixed(2)} km
              </p>
              <p className="summary-item">
                <span className="font-medium">Cost:</span>{' '}
                ₹{tripData.cost.toFixed(2)} (@ ₹{RATE_PER_KM}/km)
              </p>
              <p className="summary-item">
                <span className="font-medium">Points Recorded:</span>{' '}
                {tripData.coordinates.length}
              </p>
            </div>
          </div>
          
          {showMap && (
            <div className="map-container">
              <h2 className="section-title">Route Map</h2>
              <div className="map-wrapper">
                <LoadScript
                  googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY}
                >
                  <GoogleMap
                    mapContainerStyle={containerStyle}
                    center={currentPosition || center}
                    zoom={currentPosition ? 14 : 4}
                  >
                    {pathCoordinates.length > 0 && (
                      <Polyline
                        path={pathCoordinates}
                        options={{
                          strokeColor: '#3B82F6',
                          strokeOpacity: 1.0,
                          strokeWeight: 4
                        }}
                      />
                    )}
                    {currentPosition && (
                      <Marker
                        position={currentPosition}
                        icon={{
                          url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
                        }}
                      />
                    )}
                  </GoogleMap>
                </LoadScript>
              </div>
  
            </div>
          )}
        </div>
        
        <div className="status-message">
          <p>
            {isTracking ? 'Tracking in progress...' : 'Ready to start tracking'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default TripTracker;
