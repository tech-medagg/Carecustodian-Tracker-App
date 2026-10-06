// src/constants/salesConstants.js
// Single source of truth for visit statuses, outcomes, lead stages, and priorities.

export const VISIT_STATUSES = {
  PLANNED: 'Planned',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  POSTPONED: 'Postponed',
  CANCELLED: 'Cancelled',
  UNABLE_TO_MEET: 'Unable to Meet',
};

export const ALL_VISIT_STATUSES = Object.values(VISIT_STATUSES);

export const VISIT_OUTCOMES = {
  POSITIVE: 'Positive',
  FOLLOW_UP_REQUIRED: 'Follow-up Required',
  LEAD_GENERATED: 'Lead Generated',
  PROPOSAL_REQUESTED: 'Proposal Requested',
  NOT_INTERESTED: 'Not Interested',
  DECISION_PENDING: 'Decision Pending',
  MEETING_RESCHEDULED: 'Meeting Rescheduled',
  NO_RESPONSE: 'No Response',
};

export const ALL_VISIT_OUTCOMES = Object.values(VISIT_OUTCOMES);

export const LEAD_STATUSES = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  QUALIFIED: 'Qualified',
  PROPOSAL_SENT: 'Proposal Sent',
  NEGOTIATION: 'Negotiation',
  WON: 'Won',
  LOST: 'Lost',
  ON_HOLD: 'On Hold',
};

export const ALL_LEAD_STATUSES = Object.values(LEAD_STATUSES);

export const VISIT_PRIORITIES = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
};

export const ALL_VISIT_PRIORITIES = Object.values(VISIT_PRIORITIES);

export const MEETING_TYPES = {
  IN_PERSON: 'In-Person',
  VIDEO_CALL: 'Video Call',
  PHONE_CALL: 'Phone Call',
  PRODUCT_DEMO: 'Product Demo',
};

export const ALL_MEETING_TYPES = Object.values(MEETING_TYPES);

export const CUSTOMER_TYPES = {
  HOSPITAL: 'Hospital',
  CLINIC: 'Clinic',
  DIAGNOSTIC_CENTER: 'Diagnostic Center',
  PHARMACY: 'Pharmacy',
  NURSING_HOME: 'Nursing Home',
};

export const ALL_CUSTOMER_TYPES = Object.values(CUSTOMER_TYPES);

export const FOLLOW_UP_TYPES = {
  PHONE_CALL: 'Phone Call',
  IN_PERSON_VISIT: 'In-Person Visit',
  SEND_PROPOSAL: 'Send Proposal',
  EMAIL: 'Email',
  DEMO: 'Demo',
};

export const ALL_FOLLOW_UP_TYPES = Object.values(FOLLOW_UP_TYPES);

export const DEFAULT_COST_PER_KM = 3.0; // ₹3 / km
