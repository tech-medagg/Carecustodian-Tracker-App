// src/features/visits/visitService.js
// Firestore service for field sales visits lifecycle operations.

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
import { VISIT_STATUSES } from '../../constants/salesConstants';

const VISITS_COLLECTION = 'visits';

/**
 * Fetch all visits or visits for a specific salesman.
 * @param {string} [salesmanUid]
 */
export const fetchVisits = async (salesmanUid = null) => {
  try {
    let q;
    if (salesmanUid) {
      q = query(
        collection(db, VISITS_COLLECTION),
        where('assignedTo', '==', salesmanUid)
      );
    } else {
      q = query(collection(db, VISITS_COLLECTION));
    }

    const querySnapshot = await getDocs(q);
    const visits = querySnapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: d.data().createdAt?.toDate ? d.data().createdAt.toDate().toISOString() : d.data().createdAt,
      updatedAt: d.data().updatedAt?.toDate ? d.data().updatedAt.toDate().toISOString() : d.data().updatedAt,
      checkInTime: d.data().checkInTime?.toDate ? d.data().checkInTime.toDate().toISOString() : d.data().checkInTime,
      completedAt: d.data().completedAt?.toDate ? d.data().completedAt.toDate().toISOString() : d.data().completedAt,
    }));

    // Sort client-side by scheduledDate descending
    return visits.sort((a, b) => new Date(b.scheduledDate || 0) - new Date(a.scheduledDate || 0));
  } catch (error) {
    console.error('Error fetching visits:', error);
    throw error;
  }
};

/**
 * Create a new planned/assigned visit.
 */
export const createVisit = async (visitData) => {
  const payload = {
    ...visitData,
    status: visitData.status || VISIT_STATUSES.ASSIGNED,
    checkInTime: null,
    checkInLocation: null,
    completedAt: null,
    durationMinutes: null,
    personMet: visitData.personMet || '',
    meetingType: visitData.meetingType || 'In-Person',
    discussionNotes: visitData.discussionNotes || '',
    outcome: visitData.outcome || null,
    linkedTripId: visitData.linkedTripId || null,
    hasLead: false,
    leadId: null,
    hasNextFollowUp: false,
    followUpId: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, VISITS_COLLECTION), payload);
  return {
    id: docRef.id,
    ...visitData,
    status: payload.status,
    createdAt: new Date().toISOString(),
  };
};

/**
 * Check-in / Start meeting at the hospital location with Geofence & Proof validation.
 */
export const checkInVisit = async (id, payload = {}) => {
  const docRef = doc(db, VISITS_COLLECTION, id);
  const now = new Date();
  const locationCoords = payload.locationCoords || payload;
  const updates = {
    status: VISIT_STATUSES.IN_PROGRESS,
    checkInTime: serverTimestamp(),
    ...(locationCoords && Array.isArray(locationCoords) && {
      checkInLocation: {
        lat: locationCoords[0],
        lng: locationCoords[1],
      },
    }),
    ...(payload.isGeofenceVerified !== undefined && {
      isGeofenceVerified: Boolean(payload.isGeofenceVerified),
    }),
    ...(payload.gpsDiscrepancyMeters !== undefined && {
      gpsDiscrepancyMeters: Number(payload.gpsDiscrepancyMeters),
    }),
    ...(payload.photoProof && {
      photoProof: payload.photoProof,
    }),
    ...(payload.signatureProof && {
      signatureProof: payload.signatureProof,
    }),
    ...(payload.checkInNotes && {
      checkInNotes: payload.checkInNotes,
    }),
    updatedAt: serverTimestamp(),
  };

  await updateDoc(docRef, updates);
  return {
    id,
    status: VISIT_STATUSES.IN_PROGRESS,
    checkInTime: now.toISOString(),
    ...(locationCoords && Array.isArray(locationCoords) && {
      checkInLocation: {
        lat: locationCoords[0],
        lng: locationCoords[1],
      },
    }),
    ...(payload.isGeofenceVerified !== undefined && {
      isGeofenceVerified: Boolean(payload.isGeofenceVerified),
    }),
    ...(payload.gpsDiscrepancyMeters !== undefined && {
      gpsDiscrepancyMeters: Number(payload.gpsDiscrepancyMeters),
    }),
    ...(payload.photoProof && {
      photoProof: payload.photoProof,
    }),
    ...(payload.signatureProof && {
      signatureProof: payload.signatureProof,
    }),
    ...(payload.checkInNotes && {
      checkInNotes: payload.checkInNotes,
    }),
  };
};


/**
 * Complete a visit with discussion outcome, meeting notes, and follow-up flags.
 */
export const completeVisit = async (id, completionData) => {
  const docRef = doc(db, VISITS_COLLECTION, id);
  const now = new Date();
  
  const updates = {
    status: VISIT_STATUSES.COMPLETED,
    completedAt: serverTimestamp(),
    personMet: completionData.personMet || '',
    meetingType: completionData.meetingType || 'In-Person',
    discussionNotes: completionData.discussionNotes || '',
    outcome: completionData.outcome || 'Positive',
    durationMinutes: completionData.durationMinutes || 30,
    hasLead: !!completionData.hasLead,
    leadId: completionData.leadId || null,
    hasNextFollowUp: !!completionData.hasNextFollowUp,
    followUpId: completionData.followUpId || null,
    linkedTripId: completionData.linkedTripId || null,
    updatedAt: serverTimestamp(),
  };

  await updateDoc(docRef, updates);
  return {
    id,
    ...updates,
    completedAt: now.toISOString(),
  };
};

/**
 * General update for a visit.
 */
export const updateVisit = async (id, updates) => {
  const docRef = doc(db, VISITS_COLLECTION, id);
  const payload = {
    ...updates,
    updatedAt: serverTimestamp(),
  };
  await updateDoc(docRef, payload);
  return { id, ...updates };
};

/**
 * Delete a visit.
 */
export const deleteVisit = async (id) => {
  const docRef = doc(db, VISITS_COLLECTION, id);
  await deleteDoc(docRef);
  return id;
};
