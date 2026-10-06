// src/features/customers/customerService.js
// Firestore service for managing Customers (Hospitals, Clinics, Doctors).

import {
  collection,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';

import { db } from '../../firebase';

const CUSTOMERS_COLLECTION = 'customers';

/**
 * Fetch all customers/hospitals from Firestore.
 */
export const fetchCustomers = async () => {
  try {
    const q = query(collection(db, CUSTOMERS_COLLECTION), orderBy('name', 'asc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: d.data().createdAt?.toDate ? d.data().createdAt.toDate().toISOString() : d.data().createdAt,
      updatedAt: d.data().updatedAt?.toDate ? d.data().updatedAt.toDate().toISOString() : d.data().updatedAt,
    }));
  } catch (error) {
    // If ordering index is building or not yet available, fallback to un-ordered query
    const querySnapshot = await getDocs(collection(db, CUSTOMERS_COLLECTION));
    return querySnapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: d.data().createdAt?.toDate ? d.data().createdAt.toDate().toISOString() : d.data().createdAt,
      updatedAt: d.data().updatedAt?.toDate ? d.data().updatedAt.toDate().toISOString() : d.data().updatedAt,
    }));
  }
};

/**
 * Add a new customer/hospital.
 */
export const createCustomer = async (customerData) => {
  const payload = {
    ...customerData,
    status: customerData.status || 'active',
    totalVisits: 0,
    lastVisitedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, CUSTOMERS_COLLECTION), payload);
  return {
    id: docRef.id,
    ...customerData,
    status: payload.status,
    totalVisits: 0,
    lastVisitedAt: null,
    createdAt: new Date().toISOString(),
  };
};

/**
 * Update an existing customer.
 */
export const updateCustomer = async (id, updates) => {
  const docRef = doc(db, CUSTOMERS_COLLECTION, id);
  const payload = {
    ...updates,
    updatedAt: serverTimestamp(),
  };
  await updateDoc(docRef, payload);
  return { id, ...updates };
};

/**
 * Delete a customer record.
 */
export const deleteCustomer = async (id) => {
  const docRef = doc(db, CUSTOMERS_COLLECTION, id);
  await deleteDoc(docRef);
  return id;
};
