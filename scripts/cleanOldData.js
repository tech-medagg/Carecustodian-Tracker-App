// scripts/cleanOldData.js
// Cleans all old test trips, visits, leads, customers, and followups from Firestore.

const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, collection, getDocs, deleteDoc, doc } = require('firebase/firestore');
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

async function cleanData() {
  console.log('Authenticating as admin...');
  await signInWithEmailAndPassword(auth, 'admin@carecustodian.com', 'admin123');
  console.log('✓ Successfully authenticated as admin\n');

  const collectionsToWipe = ['trips', 'visits', 'customers', 'leads', 'followups'];

  for (const colName of collectionsToWipe) {
    const snap = await getDocs(collection(db, colName));
    console.log(`Found ${snap.size} documents in '${colName}'`);
    let count = 0;
    for (const d of snap.docs) {
      await deleteDoc(doc(db, colName, d.id));
      count++;
    }
    console.log(`✓ Deleted ${count} documents from '${colName}'\n`);
  }

  console.log('========================================');
  console.log('🎉 All old test data has been completely removed!');
  console.log('Fresh, clean database is ready for live operations.');
  console.log('========================================\n');
  process.exit(0);
}

cleanData().catch((err) => {
  console.error('Error cleaning database:', err);
  process.exit(1);
});
