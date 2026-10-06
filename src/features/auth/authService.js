// src/features/auth/authService.js
// Centralised Firebase Auth + Firestore user-profile service.
// All authentication calls go through this file — no Firebase SDK calls
// should exist directly in slices or components.

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  signInWithPopup,
  GoogleAuthProvider,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { ROLES } from '../../constants/roles';

// ── Google Provider ───────────────────────────────────────────────────────────
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

/**
 * Format Firebase Auth errors into clear, actionable messages
 */
export const formatAuthError = (err) => {
  const code = err.code || err.message || '';
  if (code.includes('auth/invalid-credential') || code.includes('auth/wrong-password') || code.includes('auth/user-not-found')) {
    return 'Invalid email or password. Please check your credentials or contact your administrator.';
  }

  if (code.includes('auth/email-already-in-use')) {
    return 'This email address is already registered. Please sign in with your password.';
  }
  if (code.includes('auth/weak-password')) {
    return 'Password must be at least 6 characters long.';
  }
  if (code.includes('auth/invalid-email')) {
    return 'Please enter a valid email address.';
  }
  if (code.includes('auth/too-many-requests')) {
    return 'Account temporarily locked due to many failed attempts. Please try again later.';
  }
  if (code.includes('auth/popup-closed-by-user')) {
    return 'Google sign-in popup was closed before finishing.';
  }
  return err.message?.replace(/^Firebase:\s*(Error\s*)?/, '').replace(/\(auth\/.*?\)/, '').trim() || 'Authentication failed.';
};

// ── User Profile ──────────────────────────────────────────────────────────────

/**
 * Fetch the Firestore user document for a Firebase Auth user.
 * If no document exists, a new one is created with the default 'salesman' role.
 *
 * @param {import('firebase/auth').User} firebaseUser
 * @param {string} [defaultRole=ROLES.SALESMAN]
 * @returns {Promise<Object>} Firestore user profile data
 */
export const fetchOrCreateUserProfile = async (firebaseUser, defaultRole = ROLES.SALESMAN) => {
  try {
    const userRef = doc(db, 'users', firebaseUser.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      // Profile found — refresh the lastLoginAt timestamp
      try {
        await updateDoc(userRef, { lastLoginAt: serverTimestamp() });
      } catch (_) {
        // Non-critical — continue even if timestamp update fails
      }
      return { uid: firebaseUser.uid, ...userSnap.data() };
    }

    // No profile yet — create one with the specified role.
    const newProfile = {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName:
        firebaseUser.displayName ||
        (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'Unknown'),
      photoURL: firebaseUser.photoURL || null,
      role: defaultRole,
      teamId: null,
      territory: null,
      phone: null,
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    };

    try {
      await setDoc(userRef, newProfile);
    } catch (saveErr) {
      console.warn('Could not write initial user profile to Firestore:', saveErr);
    }
    return newProfile;
  } catch (err) {
    console.warn('Firestore profile query failed, using fallback profile:', err);
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName:
        firebaseUser.displayName ||
        (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'Unknown'),
      photoURL: firebaseUser.photoURL || null,
      role: defaultRole,
      teamId: null,
      territory: null,
      phone: null,
      status: 'active',
    };
  }
};

// ── Auth Methods ──────────────────────────────────────────────────────────────

/**
 * Sign in with email and password.
 * Returns a plain serializable user object (safe for Redux).
 *
 * @param {string} email
 * @param {string} password
 * @returns {Promise<Object>} Serializable user with role
 */
export const signInWithEmail = async (email, password) => {
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const profile = await fetchOrCreateUserProfile(credential.user);
    if (profile.status === 'inactive' || profile.status === 'disabled') {
      await signOut(auth);
      throw new Error('This account has been deactivated. Please contact your Medagg administrator.');
    }
    return buildSerializableUser(credential.user, profile);
  } catch (err) {
    throw new Error(formatAuthError(err));
  }
};

/**
 * Register a new user with email and password.
 *
 * @param {string} email
 * @param {string} password
 * @param {string} [role=ROLES.ADMIN]
 * @returns {Promise<Object>}
 */
export const registerWithEmail = async (email, password, role = ROLES.ADMIN) => {
  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const profile = await fetchOrCreateUserProfile(credential.user, role);
    return buildSerializableUser(credential.user, profile);
  } catch (err) {
    throw new Error(formatAuthError(err));
  }
};

/**
 * Sign in with Google OAuth popup.
 * Returns a plain serializable user object (safe for Redux).
 *
 * @returns {Promise<Object>} Serializable user with role
 */
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const profile = await fetchOrCreateUserProfile(result.user);
    if (profile.status === 'inactive' || profile.status === 'disabled') {
      await signOut(auth);
      throw new Error('This account has been deactivated. Please contact your Medagg administrator.');
    }
    return buildSerializableUser(result.user, profile);
  } catch (err) {
    throw new Error(formatAuthError(err));
  }
};

/**
 * Sign out the currently authenticated user.
 *
 * @returns {Promise<void>}
 */
export const signOutUser = async () => {
  await signOut(auth);
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Build a plain, JSON-serializable user object from a Firebase Auth user and
 * a Firestore profile document. Firebase User objects contain non-serializable
 * fields and must never be stored directly in Redux.
 *
 * @param {import('firebase/auth').User} firebaseUser
 * @param {Object} profile Firestore profile document data
 * @returns {Object}
 */
const buildSerializableUser = (firebaseUser, profile) => ({
  uid: firebaseUser.uid,
  email: firebaseUser.email,
  displayName:
    profile.displayName ||
    firebaseUser.displayName ||
    (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'Unknown'),
  photoURL: profile.photoURL || firebaseUser.photoURL || null,
  provider:
    firebaseUser.providerData?.[0]?.providerId === 'google.com'
      ? 'google'
      : 'email',
  // Role fields from Firestore — these are the fields that matter for access control
  role: profile.role || ROLES.SALESMAN,
  teamId: profile.teamId || null,
  territory: profile.territory || null,
  status: profile.status || 'active',
});
