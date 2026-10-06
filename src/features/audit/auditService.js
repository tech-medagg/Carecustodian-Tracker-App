// src/features/audit/auditService.js
// Enterprise Audit Trail Service for tracking critical business and authorization events

import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebase';

export const AUDIT_ACTIONS = {
  USER_ROLE_CHANGED: 'USER_ROLE_CHANGED',
  USER_STATUS_CHANGED: 'USER_STATUS_CHANGED',
  VISIT_ASSIGNED: 'VISIT_ASSIGNED',
  VISIT_REASSIGNED: 'VISIT_REASSIGNED',
  VISIT_CHECKED_IN: 'VISIT_CHECKED_IN',
  VISIT_COMPLETED: 'VISIT_COMPLETED',
  LEAD_CREATED: 'LEAD_CREATED',
  LEAD_UPDATED: 'LEAD_UPDATED',
  FOLLOWUP_SCHEDULED: 'FOLLOWUP_SCHEDULED',
  FOLLOWUP_COMPLETED: 'FOLLOWUP_COMPLETED',
  FOLLOWUP_RESCHEDULED: 'FOLLOWUP_RESCHEDULED',
  TRIP_STARTED: 'TRIP_STARTED',
  TRIP_COMPLETED: 'TRIP_COMPLETED',
  SETTINGS_UPDATED: 'SETTINGS_UPDATED',
  CUSTOMER_DELETED: 'CUSTOMER_DELETED',
};

const AUDIT_COLLECTION = 'auditLogs';

/**
 * Record an immutable audit log entry in Firestore.
 */
export const logAuditEvent = async ({
  action,
  entityType,
  entityId = null,
  performedBy,
  details = '',
  metadata = {},
}) => {
  try {
    const payload = {
      action,
      entityType,
      entityId,
      performedBy: {
        uid: performedBy?.uid || 'system',
        email: performedBy?.email || 'system',
        name: performedBy?.displayName || performedBy?.name || 'System',
        role: performedBy?.role || 'unknown',
      },
      details,
      metadata,
      createdAt: serverTimestamp(),
      clientTimestamp: new Date().toISOString(),
    };

    const docRef = await addDoc(collection(db, AUDIT_COLLECTION), payload);
    return { id: docRef.id, ...payload };
  } catch (error) {
    console.error('Failed to log audit event:', error);
    // Non-blocking for UI flow, but logged to console
    return null;
  }
};

/**
 * Fetch recent audit logs for administrators.
 */
export const fetchAuditLogs = async (maxEntries = 100) => {
  try {
    const q = query(
      collection(db, AUDIT_COLLECTION),
      orderBy('createdAt', 'desc'),
      limit(maxEntries)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: d.data().createdAt?.toDate ? d.data().createdAt.toDate().toISOString() : d.data().createdAt,
    }));
  } catch (error) {
    console.error('Failed to fetch audit logs:', error);
    return [];
  }
};
