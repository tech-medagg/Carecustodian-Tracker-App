import { useDispatch, useSelector } from 'react-redux';
import { useCallback, useMemo } from 'react';
import {
  addTrip,
  updateTrip,
  fetchTrips,
  fetchActiveTrip,
  setCurrentTrip,
  clearCurrentTrip,
  updateTripLocally,
  selectAllTrips,
  selectCurrentTrip,
  selectTripStatus,
  selectTripError,
} from '../store/tripSlice';

export const useTrips = () => {
  const dispatch = useDispatch();
  
  // Selectors
  const trips = useSelector(selectAllTrips);
  const currentTrip = useSelector(selectCurrentTrip);
  const status = useSelector(selectTripStatus);
  const error = useSelector(selectTripError);

  // Derived Selectors
  const isTripInProgress = useMemo(() => currentTrip?.status === 'In Progress', [currentTrip]);

  // Actions
  const createTrip = useCallback(async (tripData) => {
    try {
      const newTrip = {
        ...tripData,
        id: Date.now().toString(),
        date: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
      };
      
      const result = await dispatch(addTrip(newTrip)).unwrap();
      return result;
    } catch (error) {
      throw new Error(`Failed to create trip: ${error.message}`);
    }
  }, [dispatch]);

  const updateTripById = useCallback(async (id, updates) => {
    if (!id) return null;
    try {
      const result = await dispatch(updateTrip({ id, updates })).unwrap();
      return result;
    } catch (error) {
      console.warn(`[Trip Service] Background sync note: ${error.message}`);
      return null;
    }
  }, [dispatch]);

  const loadTrips = useCallback(async () => {
    try {
      await dispatch(fetchTrips()).unwrap();
    } catch (error) {
      throw new Error(`Failed to load trips: ${error.message}`);
    }
  }, [dispatch]);

  const loadActiveTrip = useCallback(async (userId) => {
    try {
      const result = await dispatch(fetchActiveTrip(userId)).unwrap();
      return result;
    } catch (error) {
      console.error('Failed to load active trip:', error);
      return null;
    }
  }, [dispatch]);

  const setActiveTrip = useCallback((trip) => {
    dispatch(setCurrentTrip(trip));
  }, [dispatch]);

  const clearActiveTrip = useCallback(() => {
    dispatch(clearCurrentTrip());
  }, [dispatch]);

  const updateTripData = useCallback((id, updates) => {
    dispatch(updateTripLocally({ id, updates }));
  }, [dispatch]);

  const getTripById = useCallback((tripId) => {
    return trips.find(trip => trip.id === tripId);
  }, [trips]);

  const getActiveTripsByStatus = useCallback((status) => {
    return trips.filter(trip => trip.status === status);
  }, [trips]);

  const getTripStats = useCallback(() => {
    const totalTrips = trips.length;
    const completedTrips = trips.filter(trip => trip.status === 'Completed').length;
    const inProgressTrips = trips.filter(trip => trip.status === 'In Progress').length;
    const plannedTrips = trips.filter(trip => trip.status === 'Planned').length;
    
    const totalDistance = trips.reduce((sum, trip) => sum + (trip.distance || 0), 0);
    const totalCost = trips.reduce((sum, trip) => sum + (trip.cost || 0), 0);

    return {
      totalTrips,
      completedTrips,
      inProgressTrips,
      plannedTrips,
      totalDistance: Math.round(totalDistance * 100) / 100,
      totalCost
    };
  }, [trips]);

  return {
    // Data
    trips,
    currentTrip,
    status,
    error,
    
    // Actions
    createTrip,
    updateTripById,
    loadTrips,
    loadActiveTrip,
    setActiveTrip,
    clearActiveTrip,
    updateTripData,
    
    // Utilities
    getTripById,
    getActiveTripsByStatus,
    getTripStats,
    
    // Status checks
    isLoading: status === 'loading',
    isIdle: status === 'idle',
    hasError: status === 'failed',
    isTripInProgress,
  };
};

export default useTrips;
