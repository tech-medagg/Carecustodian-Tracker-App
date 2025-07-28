// src/context/TripsContext.js
import { createContext, useContext, useState, useEffect } from 'react';

const TripsContext = createContext();

export const TripsProvider = ({ children }) => {
  const [trips, setTrips] = useState(() => {
    try {
      const savedTrips = localStorage.getItem('salesman-trips');
      return savedTrips ? JSON.parse(savedTrips) : [];
    } catch (error) {
      console.error('Error loading trips from localStorage:', error);
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('salesman-trips', JSON.stringify(trips));
    } catch (error) {
      console.error('Error saving trips to localStorage:', error);
    }
  }, [trips]);

  const saveTrip = (tripData) => {
    try {
      const newTrip = {
        id: Date.now(),
        salesman: 'Current User',
        status: 'in-progress',
        date: new Date().toISOString(),
        ...tripData
      };
      setTrips(prev => [...prev, newTrip]);
      return newTrip;
    } catch (error) {
      console.error('Error saving trip:', error);
      throw error;
    }
  };

  const updateTrip = (id, updates) => {
    setTrips(prev => 
      prev.map(trip => 
        trip.id === id ? { ...trip, ...updates } : trip
      )
    );
  };

  return (
    <TripsContext.Provider value={{ trips, saveTrip, updateTrip }}>
      {children}
    </TripsContext.Provider>
  );
};

export const useTrips = () => {
  const context = useContext(TripsContext);
  if (!context) {
    throw new Error('useTrips must be used within a TripsProvider');
  }
  return context;
};