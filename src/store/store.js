import { configureStore, combineReducers } from '@reduxjs/toolkit';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import tripReducer from './tripSlice';
import authReducer from './authSlice';
import customerReducer from '../features/customers/customerSlice';
import visitReducer from '../features/visits/visitSlice';
import followUpReducer from '../features/followUps/followUpSlice';
import leadReducer from '../features/leads/leadSlice';
import settingsReducer from '../features/settings/settingsSlice';

// Persist ONLY the 'user' field in auth — never transient state like 'status' or 'error'
const authPersistConfig = {
  key: 'auth',
  storage,
  whitelist: ['user'],
};

const rootReducer = combineReducers({
  trip: tripReducer,
  auth: persistReducer(authPersistConfig, authReducer),
  customers: customerReducer,
  visits: visitReducer,
  followUps: followUpReducer,
  leads: leadReducer,
  settings: settingsReducer,
});


export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);


