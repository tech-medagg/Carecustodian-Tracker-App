// src/features/leads/leadSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  fetchLeads as fetchLeadsApi,
  createLead as createLeadApi,
  updateLead as updateLeadApi,
  deleteLead as deleteLeadApi,
} from './leadService';

export const getLeads = createAsyncThunk('leads/getLeads', async (salesmanUid = null, { rejectWithValue }) => {
  try {
    return await fetchLeadsApi(salesmanUid);
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const addLead = createAsyncThunk('leads/addLead', async (data, { rejectWithValue }) => {
  try {
    return await createLeadApi(data);
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const editLead = createAsyncThunk('leads/editLead', async ({ id, updates }, { rejectWithValue }) => {
  try {
    return await updateLeadApi(id, updates);
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const removeLead = createAsyncThunk('leads/removeLead', async (id, { rejectWithValue }) => {
  try {
    await deleteLeadApi(id);
    return id;
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

const initialState = {
  leads: [],
  status: 'idle',
  error: null,
};

const leadSlice = createSlice({
  name: 'leads',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getLeads.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(getLeads.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.leads = action.payload;
      })
      .addCase(getLeads.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(addLead.fulfilled, (state, action) => {
        state.leads.unshift(action.payload);
      })
      .addCase(editLead.fulfilled, (state, action) => {
        const index = state.leads.findIndex((l) => l.id === action.payload.id);
        if (index !== -1) {
          state.leads[index] = { ...state.leads[index], ...action.payload };
        }
      })
      .addCase(removeLead.fulfilled, (state, action) => {
        state.leads = state.leads.filter((l) => l.id !== action.payload);
      });
  },
});

export const selectAllLeads = (state) => state.leads?.leads || [];
export const selectLeadStatus = (state) => state.leads?.status || 'idle';
export const selectLeadError = (state) => state.leads?.error || null;
export const selectLeadsBySalesman = (state, salesmanId) =>
  (state.leads?.leads || []).filter((l) => l.salesmanId === salesmanId);

export default leadSlice.reducer;
