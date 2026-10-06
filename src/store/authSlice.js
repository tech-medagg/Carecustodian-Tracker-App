// src/store/authSlice.js
// Redux slice for authentication state.
// All Firebase Auth + Firestore calls are delegated to authService.js —
// this file contains only Redux logic (state shape, reducers, selectors).

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { REHYDRATE } from 'redux-persist';
import {
  signInWithEmail,
  registerWithEmail,
  signInWithGoogle as googleSignIn,
  signOutUser,
} from '../features/auth/authService';

// ── Async Thunks ──────────────────────────────────────────────────────────────

/**
 * Sign in with email + password.
 * After Firebase Auth succeeds, fetches the user's role from Firestore.
 */
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      return await signInWithEmail(email, password);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

/**
 * Register with email + password.
 */
export const registerUser = createAsyncThunk(
  'auth/registerUser',
  async ({ email, password, role }, { rejectWithValue }) => {
    try {
      return await registerWithEmail(email, password, role);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

/**
 * Sign in with Google OAuth popup.
 * After Firebase Auth succeeds, fetches/creates the user's Firestore profile.
 */
export const loginWithGoogle = createAsyncThunk(
  'auth/loginWithGoogle',
  async (_, { rejectWithValue }) => {
    try {
      return await googleSignIn();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

/**
 * Sign out the current user and clear Redux auth state.
 */
export const logoutUser = createAsyncThunk('auth/logoutUser', async () => {
  await signOutUser();
});

// ── Slice ─────────────────────────────────────────────────────────────────────

/**
 * User state shape:
 * {
 *   uid:         string,
 *   email:       string,
 *   displayName: string,
 *   photoURL:    string | null,
 *   provider:    'email' | 'google',
 *   role:        'super_admin' | 'admin' | 'salesman',
 *   teamId:      string | null,
 *   territory:   string | null,
 *   status:      'active' | 'inactive',
 * }
 */
const initialState = {
  user: null,
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /** Clear the error field (used to reset error state before a new attempt) */
    clearAuthError: (state) => {
      state.error = null;
    },
    /** Reset the auth status and error to idle (prevents stuck buffering state) */
    resetAuthStatus: (state) => {
      state.status = 'idle';
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // ── Rehydration (redux-persist) ──────────────────────────────────
      .addCase(REHYDRATE, (state, action) => {
        // Ensure state.status is never persisted or stuck as 'loading'
        state.status = 'idle';
        state.error = null;
        if (action.payload?.auth?.user) {
          state.user = action.payload.auth.user;
        }
      })

      // ── Email/Password Login ─────────────────────────────────────────
      .addCase(loginUser.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload; // Includes role from Firestore
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      // ── Email/Password Registration ──────────────────────────────────
      .addCase(registerUser.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      // ── Google OAuth Login ───────────────────────────────────────────
      .addCase(loginWithGoogle.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loginWithGoogle.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload; // Includes role from Firestore
      })
      .addCase(loginWithGoogle.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      // ── Logout ───────────────────────────────────────────────────────
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.status = 'idle';
        state.error = null;
      });
  },
});

// ── Actions ───────────────────────────────────────────────────────────────────
export const { clearAuthError, resetAuthStatus } = authSlice.actions;

// ── Selectors ─────────────────────────────────────────────────────────────────
export const selectCurrentUser = (state) => state.auth.user;
export const selectAuthStatus  = (state) => state.auth.status;
export const selectAuthError   = (state) => state.auth.error;
/** Convenience selector — returns the user's role string or null */
export const selectUserRole    = (state) => state.auth.user?.role ?? null;

export default authSlice.reducer;

