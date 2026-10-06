// src/features/leads/leadService.js
// Firestore service for deals, opportunities and leads pipeline.

import {
  collection,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebase';

const LEADS_COLLECTION = 'leads';

export const fetchLeads = async (salesmanUid = null) => {
  try {
    let q;
    if (salesmanUid) {
      q = query(
        collection(db, LEADS_COLLECTION),
        where('salesmanId', '==', salesmanUid)
      );
    } else {
      q = query(collection(db, LEADS_COLLECTION));
    }

    const querySnapshot = await getDocs(q);
    const list = querySnapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: d.data().createdAt?.toDate ? d.data().createdAt.toDate().toISOString() : d.data().createdAt,
      updatedAt: d.data().updatedAt?.toDate ? d.data().updatedAt.toDate().toISOString() : d.data().updatedAt,
    }));

    return list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  } catch (error) {
    console.error('Error fetching leads:', error);
    throw error;
  }
};

export const createLead = async (leadData) => {
  const payload = {
    ...leadData,
    status: leadData.status || 'New',
    stage: leadData.stage || 'New Lead',
    expectedValue: Number(leadData.expectedValue || 0),
    probability: Number(leadData.probability || 50),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, LEADS_COLLECTION), payload);
  return {
    id: docRef.id,
    ...leadData,
    createdAt: new Date().toISOString(),
  };
};

export const updateLead = async (id, updates) => {
  const docRef = doc(db, LEADS_COLLECTION, id);
  const payload = {
    ...updates,
    updatedAt: serverTimestamp(),
  };
  await updateDoc(docRef, payload);
  return { id, ...updates };
};

export const deleteLead = async (id) => {
  const docRef = doc(db, LEADS_COLLECTION, id);
  await deleteDoc(docRef);
  return id;
};
