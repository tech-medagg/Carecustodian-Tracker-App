// src/features/visits/visitAtomicService.js
// Atomic batched operations for field visit lifecycle to guarantee zero partial writes

import {
  writeBatch,
  doc,
  collection,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { VISIT_STATUSES } from '../../constants/salesConstants';
import { AUDIT_ACTIONS } from '../audit/auditService';

/**
 * Completes a field visit, creates an optional lead, creates an optional follow-up,
 * and writes an audit log in a single atomic Firestore writeBatch.
 *
 * @param {Object} params
 * @param {string} params.visitId
 * @param {Object} params.completionData - { outcome, notes, meetingDurationMinutes }
 * @param {Object} [params.leadData] - Optional lead data
 * @param {Object} [params.followUpData] - Optional follow-up data
 * @param {Object} params.user - Current user { uid, email, displayName, role }
 * @returns {Promise<{ success: boolean, visitId: string, leadId?: string, followUpId?: string }>}
 */
export const completeVisitAtomic = async ({
  visitId,
  completionData,
  leadData = null,
  followUpData = null,
  user,
}) => {
  if (!visitId) throw new Error('visitId is required for visit completion');

  const batch = writeBatch(db);
  const result = { success: true, visitId };

  // 1. Visit Document Update
  const visitRef = doc(db, 'visits', visitId);
  const visitPayload = {
    status: VISIT_STATUSES.COMPLETED,
    outcome: completionData.outcome,
    notes: completionData.notes || '',
    meetingDurationMinutes: Number(completionData.meetingDurationMinutes) || 30,
    completedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  batch.update(visitRef, visitPayload);

  // 2. Lead Creation (if requested)
  if (leadData) {
    const leadRef = doc(collection(db, 'leads'));
    result.leadId = leadRef.id;
    const leadPayload = {
      title: leadData.title,
      customerId: leadData.customerId,
      customerName: leadData.customerName,
      salesmanId: user.uid,
      salesmanName: user.displayName || user.email,
      expectedValue: Number(leadData.expectedValue || 0),
      stage: leadData.stage || 'New',
      probability: Number(leadData.probability || 50),
      visitId: visitId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    batch.set(leadRef, leadPayload);
  }

  // 3. Follow-Up Scheduling (if requested)
  if (followUpData) {
    const followUpRef = doc(collection(db, 'followUps'));
    result.followUpId = followUpRef.id;
    const followUpPayload = {
      customerId: followUpData.customerId,
      customerName: followUpData.customerName,
      customerPhone: followUpData.customerPhone || '',
      salesmanId: user.uid,
      salesmanName: user.displayName || user.email,
      dueDate: followUpData.dueDate,
      dueTime: followUpData.dueTime || '11:00',
      type: followUpData.type || 'Phone Call',
      priority: followUpData.priority || 'Medium',
      notes: followUpData.notes || '',
      status: 'Pending',
      visitId: visitId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    batch.set(followUpRef, followUpPayload);
  }

  // 4. Audit Log
  const auditRef = doc(collection(db, 'auditLogs'));
  const auditPayload = {
    action: AUDIT_ACTIONS.VISIT_COMPLETED,
    entityType: 'visit',
    entityId: visitId,
    performedBy: {
      uid: user.uid,
      email: user.email,
      name: user.displayName || user.email,
      role: user.role || 'salesman',
    },
    details: `Completed visit to ${completionData.customerName || 'facility'} with outcome: ${completionData.outcome}. Generated Lead: ${Boolean(leadData)}, Scheduled Follow-up: ${Boolean(followUpData)}`,
    metadata: {
      outcome: completionData.outcome,
      hasLead: Boolean(leadData),
      hasFollowUp: Boolean(followUpData),
    },
    createdAt: serverTimestamp(),
  };
  batch.set(auditRef, auditPayload);

  // Commit all writes atomically
  await batch.commit();
  return result;
};
