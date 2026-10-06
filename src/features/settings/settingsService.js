// src/features/settings/settingsService.js
// Firestore service for dynamic application settings and business rules

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { DEFAULT_COST_PER_KM } from '../../constants/salesConstants';

const SETTINGS_COLLECTION = 'settings';
const GENERAL_SETTINGS_DOC = 'general';

export const DEFAULT_SETTINGS = {
  costPerKm: DEFAULT_COST_PER_KM, // ₹3.0 / km strictly
  bikeRatePerKm: 3.0,
  carRatePerKm: 3.0,
  dailyAllowance: 0, // No daily allowance provided
  foodAllowance: 0, // No food allowance provided
  geofenceRadiusMeters: 250, // 250 meters max radius for GPS verified check-in
  currency: 'INR',
  currencySymbol: '₹',
  companyName: 'Medagg Carecustodian',
  workingHoursStart: '09:00',
  workingHoursEnd: '18:00',
  maxSpeedThresholdKmh: 120,
};

/**
 * Fetch general application settings from Firestore.
 */
export const fetchSettings = async () => {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, GENERAL_SETTINGS_DOC);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      return { ...DEFAULT_SETTINGS, ...snap.data() };
    }

    // Initialize with defaults if doesn't exist
    return DEFAULT_SETTINGS;
  } catch (error) {
    console.warn('Could not fetch settings from Firestore, using defaults:', error);
    return DEFAULT_SETTINGS;
  }
};

/**
 * Update general application settings (Admin only).
 */
export const updateSettings = async (newSettings, performedBy) => {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, GENERAL_SETTINGS_DOC);
    const payload = {
      ...DEFAULT_SETTINGS,
      ...newSettings,
      costPerKm: Number(newSettings.costPerKm ?? DEFAULT_SETTINGS.costPerKm),
      bikeRatePerKm: Number(newSettings.bikeRatePerKm ?? DEFAULT_SETTINGS.bikeRatePerKm),
      carRatePerKm: Number(newSettings.carRatePerKm ?? DEFAULT_SETTINGS.carRatePerKm),
      dailyAllowance: Number(newSettings.dailyAllowance ?? DEFAULT_SETTINGS.dailyAllowance),
      foodAllowance: Number(newSettings.foodAllowance ?? DEFAULT_SETTINGS.foodAllowance),
      geofenceRadiusMeters: Number(newSettings.geofenceRadiusMeters ?? DEFAULT_SETTINGS.geofenceRadiusMeters),
      updatedAt: serverTimestamp(),
      updatedBy: performedBy?.email || 'admin',
    };

    await setDoc(docRef, payload, { merge: true });
    return payload;
  } catch (error) {
    console.error('Failed to update settings:', error);
    throw error;
  }
};

