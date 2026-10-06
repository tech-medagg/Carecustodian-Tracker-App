// src/features/followUps/followUpSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  fetchFollowUps as fetchFollowUpsApi,
  createFollowUp as createFollowUpApi,
  completeFollowUp as completeFollowUpApi,
  rescheduleFollowUp as rescheduleFollowUpApi,
  deleteFollowUp as deleteFollowUpApi,
} from './followUpService';

export const getFollowUps = createAsyncThunk('followUps/getFollowUps', async (salesmanUid, { rejectWithValue }) => {
  try {
    return await fetchFollowUpsApi(salesmanUid);
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const addFollowUp = createAsyncThunk('followUps/addFollowUp', async (data, { rejectWithValue }) => {
  try {
    return await createFollowUpApi(data);
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const markFollowUpDone = createAsyncThunk('followUps/markFollowUpDone', async ({ id, completionNote }, { rejectWithValue }) => {
  try {
    return await completeFollowUpApi(id, completionNote);
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const changeFollowUpDate = createAsyncThunk('followUps/changeFollowUpDate', async ({ id, newDueDate, newDueTime, reason }, { rejectWithValue }) => {
  try {
    return await rescheduleFollowUpApi(id, newDueDate, newDueTime, reason);
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const removeFollowUp = createAsyncThunk('followUps/removeFollowUp', async (id, { rejectWithValue }) => {
  try {
    await deleteFollowUpApi(id);
    return id;
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

const initialState = {
  followUps: [],
  status: 'idle',
  error: null,
};

const followUpSlice = createSlice({
  name: 'followUps',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getFollowUps.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(getFollowUps.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.followUps = action.payload;
      })
      .addCase(getFollowUps.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(addFollowUp.fulfilled, (state, action) => {
        state.followUps.push(action.payload);
      })
      .addCase(markFollowUpDone.fulfilled, (state, action) => {
        const index = state.followUps.findIndex((f) => f.id === action.payload.id);
        if (index !== -1) {
          state.followUps[index] = { ...state.followUps[index], ...action.payload };
        }
      })
      .addCase(changeFollowUpDate.fulfilled, (state, action) => {
        const index = state.followUps.findIndex((f) => f.id === action.payload.id);
        if (index !== -1) {
          state.followUps[index] = { ...state.followUps[index], ...action.payload };
        }
      })
      .addCase(removeFollowUp.fulfilled, (state, action) => {
        state.followUps = state.followUps.filter((f) => f.id !== action.payload);
      });
  },
});

export const selectAllFollowUps = (state) => state.followUps?.followUps || [];
export const selectFollowUpStatus = (state) => state.followUps?.status || 'idle';
export const selectFollowUpError = (state) => state.followUps?.error || null;

export default followUpSlice.reducer;
