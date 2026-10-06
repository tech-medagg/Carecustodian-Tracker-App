// src/features/visits/visitSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  fetchVisits as fetchVisitsApi,
  createVisit as createVisitApi,
  updateVisit as updateVisitApi,
  checkInVisit as checkInVisitApi,
  completeVisit as completeVisitApi,
  deleteVisit as deleteVisitApi,
} from './visitService';

export const getVisits = createAsyncThunk('visits/getVisits', async (salesmanUid, { rejectWithValue }) => {
  try {
    return await fetchVisitsApi(salesmanUid);
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const addVisit = createAsyncThunk('visits/addVisit', async (data, { rejectWithValue }) => {
  try {
    return await createVisitApi(data);
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const checkIn = createAsyncThunk('visits/checkIn', async ({ id, ...payload }, { rejectWithValue }) => {
  try {
    return await checkInVisitApi(id, payload);
  } catch (error) {
    return rejectWithValue(error.message);
  }
});


export const finishVisit = createAsyncThunk('visits/finishVisit', async ({ id, completionData }, { rejectWithValue }) => {
  try {
    return await completeVisitApi(id, completionData);
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const editVisit = createAsyncThunk('visits/editVisit', async ({ id, updates }, { rejectWithValue }) => {
  try {
    return await updateVisitApi(id, updates);
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const removeVisit = createAsyncThunk('visits/removeVisit', async (id, { rejectWithValue }) => {
  try {
    await deleteVisitApi(id);
    return id;
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

const initialState = {
  visits: [],
  activeVisit: null,
  status: 'idle',
  error: null,
};

const visitSlice = createSlice({
  name: 'visits',
  initialState,
  reducers: {
    setActiveVisit: (state, action) => {
      state.activeVisit = action.payload;
    },
    clearActiveVisit: (state) => {
      state.activeVisit = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getVisits.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(getVisits.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.visits = action.payload;
      })
      .addCase(getVisits.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(addVisit.fulfilled, (state, action) => {
        state.visits.unshift(action.payload);
      })
      .addCase(checkIn.fulfilled, (state, action) => {
        const index = state.visits.findIndex((v) => v.id === action.payload.id);
        if (index !== -1) {
          state.visits[index] = { ...state.visits[index], ...action.payload };
        }
        if (state.activeVisit && state.activeVisit.id === action.payload.id) {
          state.activeVisit = { ...state.activeVisit, ...action.payload };
        }
      })
      .addCase(finishVisit.fulfilled, (state, action) => {
        const index = state.visits.findIndex((v) => v.id === action.payload.id);
        if (index !== -1) {
          state.visits[index] = { ...state.visits[index], ...action.payload };
        }
        if (state.activeVisit && state.activeVisit.id === action.payload.id) {
          state.activeVisit = null;
        }
      })
      .addCase(editVisit.fulfilled, (state, action) => {
        const index = state.visits.findIndex((v) => v.id === action.payload.id);
        if (index !== -1) {
          state.visits[index] = { ...state.visits[index], ...action.payload };
        }
      })
      .addCase(removeVisit.fulfilled, (state, action) => {
        state.visits = state.visits.filter((v) => v.id !== action.payload);
      });
  },
});

export const { setActiveVisit, clearActiveVisit } = visitSlice.actions;

export const selectAllVisits = (state) => state.visits?.visits || [];
export const selectActiveVisit = (state) => state.visits?.activeVisit || null;
export const selectVisitStatus = (state) => state.visits?.status || 'idle';
export const selectVisitError = (state) => state.visits?.error || null;
export const selectVisitById = (state, id) => state.visits?.visits.find((v) => v.id === id);

export default visitSlice.reducer;
