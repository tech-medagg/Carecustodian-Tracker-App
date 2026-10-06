import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { db } from '../firebase'; // Corrected import path
import {
  collection,
  getDocs,
  setDoc,
  doc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';

// Helper: Safely prepare trip data for Firestore
// 1. Nested 2D arrays (like route = [[lat, lng], ...]) are JSON stringified because Firestore rejects nested arrays.
// 2. Undefined keys are omitted because Firestore rejects undefined values.
const serializeTripForFirestore = (tripData) => {
  const result = {};
  for (const [key, value] of Object.entries(tripData)) {
    if (value === undefined) continue;
    if (key === 'route' && Array.isArray(value)) {
      result[key] = JSON.stringify(value);
    } else {
      result[key] = value;
    }
  }
  return result;
};

// Helper: Safely parse trip data from Firestore for Redux & UI
const deserializeTripFromFirestore = (id, data) => {
  let parsedRoute = data.route;
  if (typeof parsedRoute === 'string') {
    try {
      parsedRoute = JSON.parse(parsedRoute);
    } catch (e) {
      parsedRoute = null;
    }
  }
  return {
    id,
    ...data,
    route: parsedRoute,
    startTime: data.startTime?.toDate ? data.startTime.toDate().toISOString() : data.startTime,
    endedAt: data.endedAt?.toDate ? data.endedAt.toDate().toISOString() : data.endedAt,
  };
};

// Async thunk for fetching trips from Firestore
export const fetchTrips = createAsyncThunk('trips/fetchTrips', async () => {
  const tripsCollectionRef = collection(db, 'trips');
  const querySnapshot = await getDocs(tripsCollectionRef);
  const trips = querySnapshot.docs.map(doc => deserializeTripFromFirestore(doc.id, doc.data()));
  return trips;
});

// Async thunk for fetching active in-progress trip for a specific user
export const fetchActiveTrip = createAsyncThunk('trips/fetchActiveTrip', async (userId) => {
  if (!userId) return null;
  try {
    const tripsCollectionRef = collection(db, 'trips');
    const q = query(
      tripsCollectionRef,
      where('userId', '==', userId),
      where('status', '==', 'In Progress')
    );
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const activeTrips = querySnapshot.docs.map(doc => deserializeTripFromFirestore(doc.id, doc.data()));
      // Sort newest first to ensure the latest trip is returned
      activeTrips.sort((a, b) => new Date(b.startTime || 0) - new Date(a.startTime || 0));
      return activeTrips[0];
    }
    return null;
  } catch (error) {
    console.error('Error fetching active trip:', error);
    return null;
  }
});

// Async thunk for adding a new trip to Firestore
export const addTrip = createAsyncThunk('trips/addTrip', async (tripData) => {
  const sanitized = serializeTripForFirestore(tripData);
  const dataWithTimestamps = {
    ...sanitized,
    startTime: tripData.startTime ? new Date(tripData.startTime) : new Date(),
    createdAt: serverTimestamp(),
  };

  const docId = tripData.id || doc(collection(db, 'trips')).id;
  const docRef = doc(db, 'trips', docId);
  await setDoc(docRef, dataWithTimestamps, { merge: true });
  return { ...tripData, id: docId };
});

// Async thunk for updating a trip in Firestore
export const updateTrip = createAsyncThunk('trips/updateTrip', async ({ id, updates }) => {
  if (!id) return { id, ...updates };
  const tripDocRef = doc(db, 'trips', id);
  const dataToUpdate = serializeTripForFirestore(updates);

  if (dataToUpdate.endedAt) {
    dataToUpdate.endedAt = new Date(dataToUpdate.endedAt);
  }

  // setDoc with merge: true creates or merges document seamlessly without throwing "No document to update"
  await setDoc(tripDocRef, dataToUpdate, { merge: true });
  return { id, ...updates };
});

const initialState = {
  trips: [],
  currentTrip: null, // Holds the currently active trip object for the salesman
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
};

const tripSlice = createSlice({
  name: 'trips',
  initialState,
  reducers: {
    setTrips: (state, action) => {
      state.trips = action.payload;
      state.status = 'succeeded';
      state.error = null;
    },
    setCurrentTrip: (state, action) => {
      state.currentTrip = action.payload;
    },
    clearCurrentTrip: (state) => {
      state.currentTrip = null;
    },
    // This can be used for optimistic UI updates if needed
    updateTripLocally: (state, action) => {
      const { id, ...data } = action.payload;
      const existingTrip = state.trips.find(trip => trip.id === id);
      if (existingTrip) {
        Object.assign(existingTrip, data);
      }
      if (state.currentTrip && state.currentTrip.id === id) {
        state.currentTrip = { ...state.currentTrip, ...data };
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Trips
      .addCase(fetchTrips.pending, (state) => {
        // Only set to loading if we have no trips yet, so background refreshes don't flicker or unmount UI
        if (state.trips.length === 0) {
          state.status = 'loading';
        }
      })
      .addCase(fetchTrips.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.trips = action.payload;
        state.error = null;
      })
      .addCase(fetchTrips.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })
      // Add Trip
      .addCase(addTrip.fulfilled, (state, action) => {
        state.trips.push(action.payload);
        // Optionally set as current trip upon creation
        state.currentTrip = action.payload;
      })
      // Fetch Active Trip for User
      .addCase(fetchActiveTrip.fulfilled, (state, action) => {
        if (action.payload) {
          state.currentTrip = action.payload;
        }
      })
      // Update Trip
      .addCase(updateTrip.fulfilled, (state, action) => {
        const index = state.trips.findIndex(trip => trip.id === action.payload.id);
        if (index !== -1) {
          state.trips[index] = { ...state.trips[index], ...action.payload };
        }
        if (state.currentTrip && state.currentTrip.id === action.payload.id) {
          if (action.payload.status && action.payload.status !== 'In Progress') {
            state.currentTrip = null;
          } else {
            state.currentTrip = { ...state.currentTrip, ...action.payload };
          }
        }
      });
  },
});

export const { setTrips, setCurrentTrip, clearCurrentTrip, updateTripLocally } = tripSlice.actions;

// Selectors
export const selectAllTrips = (state) => state.trip.trips;
export const selectCurrentTrip = (state) => state.trip.currentTrip;
export const selectTripById = (state, tripId) => state.trip.trips.find((trip) => trip.id === tripId);
export const selectTripStatus = (state) => state.trip.status;
export const selectTripError = (state) => state.trip.error;

export default tripSlice.reducer;
