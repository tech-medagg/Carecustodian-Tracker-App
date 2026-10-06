// src/features/followUps/followUpService.js
// Firestore service for sales follow-ups and action item tracking.

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

const FOLLOWUPS_COLLECTION = 'followUps';

/**
 * Fetch follow-ups.
 * @param {string} [salesmanUid]
 */
export const fetchFollowUps = async (salesmanUid = null) => {
  try {
    let q;
    if (salesmanUid) {
      q = query(
        collection(db, FOLLOWUPS_COLLECTION),
        where('salesmanId', '==', salesmanUid)
      );
    } else {
      q = query(collection(db, FOLLOWUPS_COLLECTION));
    }

    const querySnapshot = await getDocs(q);
    const list = querySnapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: d.data().createdAt?.toDate ? d.data().createdAt.toDate().toISOString() : d.data().createdAt,
      updatedAt: d.data().updatedAt?.toDate ? d.data().updatedAt.toDate().toISOString() : d.data().updatedAt,
      completedAt: d.data().completedAt?.toDate ? d.data().completedAt.toDate().toISOString() : d.data().completedAt,
    }));

    // Sort by dueDate ascending
    return list.sort((a, b) => new Date(a.dueDate || 0) - new Date(b.dueDate || 0));
  } catch (error) {
    console.error('Error fetching follow-ups:', error);
    throw error;
  }
};

/**
 * Create a new follow-up reminder.
 */
export const createFollowUp = async (followUpData) => {
  const payload = {
    ...followUpData,
    status: 'Pending',
    completedAt: null,
    completionNote: '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, FOLLOWUPS_COLLECTION), payload);
  return {
    id: docRef.id,
    ...followUpData,
    status: 'Pending',
    createdAt: new Date().toISOString(),
  };
};

/**
 * Mark a follow-up as completed.
 */
export const completeFollowUp = async (id, completionNote = '') => {
  const docRef = doc(db, FOLLOWUPS_COLLECTION, id);
  const now = new Date();
  const updates = {
    status: 'Completed',
    completedAt: serverTimestamp(),
    completionNote,
    updatedAt: serverTimestamp(),
  };

  await updateDoc(docRef, updates);
  return {
    id,
    status: 'Completed',
    completedAt: now.toISOString(),
    completionNote,
  };
};

/**
 * Reschedule a follow-up.
 */
export const rescheduleFollowUp = async (id, newDueDate, newDueTime, reason = '') => {
  const docRef = doc(db, FOLLOWUPS_COLLECTION, id);
  const updates = {
    dueDate: newDueDate,
    dueTime: newDueTime,
    status: 'Rescheduled',
    rescheduleReason: reason,
    updatedAt: serverTimestamp(),
  };

  await updateDoc(docRef, updates);
  return { id, ...updates };
};

/**
 * Delete a follow-up.
 */
export const deleteFollowUp = async (id) => {
  const docRef = doc(db, FOLLOWUPS_COLLECTION, id);
  await deleteDoc(docRef);
  return id;
};
