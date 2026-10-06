// src/features/customers/customerSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  fetchCustomers as fetchCustomersApi,
  createCustomer as createCustomerApi,
  updateCustomer as updateCustomerApi,
  deleteCustomer as deleteCustomerApi,
} from './customerService';

export const getCustomers = createAsyncThunk('customers/getCustomers', async (_, { rejectWithValue }) => {
  try {
    return await fetchCustomersApi();
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const addCustomer = createAsyncThunk('customers/addCustomer', async (data, { rejectWithValue }) => {
  try {
    return await createCustomerApi(data);
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const editCustomer = createAsyncThunk('customers/editCustomer', async ({ id, updates }, { rejectWithValue }) => {
  try {
    return await updateCustomerApi(id, updates);
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const removeCustomer = createAsyncThunk('customers/removeCustomer', async (id, { rejectWithValue }) => {
  try {
    await deleteCustomerApi(id);
    return id;
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

const initialState = {
  customers: [],
  status: 'idle',
  error: null,
};

const customerSlice = createSlice({
  name: 'customers',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getCustomers.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(getCustomers.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.customers = action.payload;
      })
      .addCase(getCustomers.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(addCustomer.fulfilled, (state, action) => {
        state.customers.unshift(action.payload);
      })
      .addCase(editCustomer.fulfilled, (state, action) => {
        const index = state.customers.findIndex((c) => c.id === action.payload.id);
        if (index !== -1) {
          state.customers[index] = { ...state.customers[index], ...action.payload };
        }
      })
      .addCase(removeCustomer.fulfilled, (state, action) => {
        state.customers = state.customers.filter((c) => c.id !== action.payload);
      });
  },
});

export const selectAllCustomers = (state) => state.customers?.customers || [];
export const selectCustomerStatus = (state) => state.customers?.status || 'idle';
export const selectCustomerError = (state) => state.customers?.error || null;
export const selectCustomerById = (state, id) => state.customers?.customers.find((c) => c.id === id);

export default customerSlice.reducer;
