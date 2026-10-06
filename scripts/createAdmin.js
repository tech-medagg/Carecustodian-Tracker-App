// scripts/createAdmin.js
// Script to provision the initial Admin user in Firebase Auth & Firestore

const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, setDoc, serverTimestamp } = require('firebase/firestore');
require('dotenv').config();

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const ADMIN_EMAIL = process.argv[2] || 'admin@medagg.com';
const ADMIN_PASSWORD = process.argv[3] || 'admin123';

async function setupAdmin() {
  console.log(`Setting up Admin: ${ADMIN_EMAIL}...`);
  let user = null;

  try {
    const cred = await createUserWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
    user = cred.user;
    console.log(`✓ Firebase Auth user created (UID: ${user.uid})`);
  } catch (err) {
    if (err.code === 'auth/email-already-in-use') {
      console.log(`User already exists in Firebase Auth. Signing in to verify & update profile...`);
      const cred = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
      user = cred.user;
    } else {
      console.error(`Error creating user in Firebase Auth:`, err.message);
      process.exit(1);
    }
  }

  // Set Firestore profile as admin
  const userRef = doc(db, 'users', user.uid);
  const adminProfile = {
    uid: user.uid,
    email: ADMIN_EMAIL,
    displayName: 'Medagg Admin',
    role: 'admin',
    status: 'active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(userRef, adminProfile, { merge: true });
  console.log(`✓ Firestore user profile updated with role: 'admin'`);
  console.log(`\n========================================`);
  console.log(`🎉 SUCCESS! Admin Account is Ready:`);
  console.log(`Email:    ${ADMIN_EMAIL}`);
  console.log(`Password: ${ADMIN_PASSWORD}`);
  console.log(`Role:     admin`);
  console.log(`========================================\n`);
  process.exit(0);
}

setupAdmin().catch((err) => {
  console.error('Fatal setup error:', err);
  process.exit(1);
});
