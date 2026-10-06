// src/features/settings/settingsSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  fetchSettings as fetchSettingsApi,
  updateSettings as updateSettingsApi,
  DEFAULT_SETTINGS,
} from './settingsService';

export const getSettings = createAsyncThunk('settings/getSettings', async (_, { rejectWithValue }) => {
  try {
    return await fetchSettingsApi();
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const saveSettings = createAsyncThunk(
  'settings/saveSettings',
  async ({ newSettings, performedBy }, { rejectWithValue }) => {
    try {
      return await updateSettingsApi(newSettings, performedBy);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  settings: DEFAULT_SETTINGS,
  status: 'idle',
  error: null,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getSettings.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(getSettings.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.settings = action.payload;
      })
      .addCase(getSettings.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(saveSettings.fulfilled, (state, action) => {
        state.settings = { ...state.settings, ...action.payload };
      });
  },
});

export const selectCurrentSettings = (state) => state.settings?.settings || DEFAULT_SETTINGS;
export const selectCostPerKm = (state) => state.settings?.settings?.costPerKm ?? DEFAULT_SETTINGS.costPerKm;
export const selectDailyAllowance = (state) => state.settings?.settings?.dailyAllowance ?? DEFAULT_SETTINGS.dailyAllowance;
export const selectFoodAllowance = (state) => state.settings?.settings?.foodAllowance ?? DEFAULT_SETTINGS.foodAllowance;
export const selectGeofenceRadius = (state) => state.settings?.settings?.geofenceRadiusMeters ?? DEFAULT_SETTINGS.geofenceRadiusMeters;

export default settingsSlice.reducer;

