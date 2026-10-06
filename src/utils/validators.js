// src/utils/validators.js
// Centralized validation engine for Field Sales Management System

import {
  ALL_LEAD_STATUSES,
  ALL_VISIT_PRIORITIES,
  ALL_MEETING_TYPES,
  ALL_CUSTOMER_TYPES,
  ALL_FOLLOW_UP_TYPES,
  VISIT_STATUSES,
} from '../constants/salesConstants';

/**
 * Validates GPS coordinate values and bounds.
 */
export const isValidCoordinates = (lat, lng) => {
  if (lat === null || lat === undefined || lng === null || lng === undefined) return false;
  const numLat = Number(lat);
  const numLng = Number(lng);
  if (isNaN(numLat) || isNaN(numLng)) return false;
  return numLat >= -90 && numLat <= 90 && numLng >= -180 && numLng <= 180;
};

/**
 * Haversine formula to compute distance between two [lat, lng] points in kilometers.
 */
export const computeHaversineDistance = (coords1, coords2) => {
  if (!coords1 || !coords2) return 0;
  const lat1 = Array.isArray(coords1) ? coords1[0] : coords1.lat || coords1.latitude;
  const lon1 = Array.isArray(coords1) ? coords1[1] : coords1.lng || coords1.longitude;
  const lat2 = Array.isArray(coords2) ? coords2[0] : coords2.lat || coords2.latitude;
  const lon2 = Array.isArray(coords2) ? coords2[1] : coords2.lng || coords2.longitude;

  if (!isValidCoordinates(lat1, lon1) || !isValidCoordinates(lat2, lon2)) return 0;

  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Validates if a GPS movement is realistic or an impossible jump / outlier.
 * Returns true if the speed is <= maxSpeedKmh (default 150 km/h).
 */
export const isRealisticGpsMovement = (prevCoords, nextCoords, timeDiffSeconds, maxSpeedKmh = 150) => {
  if (!prevCoords || !nextCoords || timeDiffSeconds <= 0) return true;
  const distanceKm = computeHaversineDistance(prevCoords, nextCoords);
  const speedKmh = (distanceKm / timeDiffSeconds) * 3600;
  return speedKmh <= maxSpeedKmh;
};

/**
 * Validates Healthcare Facility / Customer data.
 */
export const validateCustomer = (customer) => {
  const errors = [];
  if (!customer || typeof customer !== 'object') {
    return { isValid: false, errors: ['Customer data is missing'] };
  }

  if (!customer.name || !customer.name.trim()) {
    errors.push('Facility name is required');
  } else if (customer.name.trim().length < 2) {
    errors.push('Facility name must be at least 2 characters long');
  }

  if (customer.type && !ALL_CUSTOMER_TYPES.includes(customer.type)) {
    errors.push(`Invalid facility type. Must be one of: ${ALL_CUSTOMER_TYPES.join(', ')}`);
  }

  if (customer.phone) {
    const phoneClean = customer.phone.replace(/[\s\-+()]/g, '');
    if (phoneClean.length < 7 || phoneClean.length > 15 || isNaN(Number(phoneClean))) {
      errors.push('Phone number format is invalid');
    }
  }

  if (customer.email && customer.email.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customer.email.trim())) {
      errors.push('Email address format is invalid');
    }
  }

  if (
    customer.latitude !== undefined &&
    customer.latitude !== null &&
    customer.latitude !== '' &&
    customer.longitude !== undefined &&
    customer.longitude !== null &&
    customer.longitude !== ''
  ) {
    if (!isValidCoordinates(customer.latitude, customer.longitude)) {
      errors.push('GPS coordinates are out of valid range (lat -90..90, lng -180..180)');
    }
  }

  return { isValid: errors.length === 0, errors };
};

/**
 * Validates Visit Status Transitions to prevent illegal lifecycle reversions.
 */
export const validateVisitStatusTransition = (currentStatus, targetStatus) => {
  if (!currentStatus || !targetStatus) return { isAllowed: false, reason: 'Status missing' };
  if (currentStatus === targetStatus) return { isAllowed: true };

  // Terminal statuses cannot be transitioned out of
  if (currentStatus === VISIT_STATUSES.COMPLETED) {
    return { isAllowed: false, reason: 'Completed visits cannot change status.' };
  }
  if (currentStatus === VISIT_STATUSES.CANCELLED) {
    return { isAllowed: false, reason: 'Cancelled visits cannot change status.' };
  }

  const allowedTransitions = {
    [VISIT_STATUSES.PLANNED]: [
      VISIT_STATUSES.ASSIGNED,
      VISIT_STATUSES.IN_PROGRESS,
      VISIT_STATUSES.POSTPONED,
      VISIT_STATUSES.CANCELLED,
      VISIT_STATUSES.UNABLE_TO_MEET,
    ],
    [VISIT_STATUSES.ASSIGNED]: [
      VISIT_STATUSES.IN_PROGRESS,
      VISIT_STATUSES.COMPLETED,
      VISIT_STATUSES.POSTPONED,
      VISIT_STATUSES.CANCELLED,
      VISIT_STATUSES.UNABLE_TO_MEET,
    ],
    [VISIT_STATUSES.IN_PROGRESS]: [
      VISIT_STATUSES.COMPLETED,
      VISIT_STATUSES.POSTPONED,
      VISIT_STATUSES.CANCELLED,
      VISIT_STATUSES.UNABLE_TO_MEET,
    ],
    [VISIT_STATUSES.POSTPONED]: [
      VISIT_STATUSES.ASSIGNED,
      VISIT_STATUSES.IN_PROGRESS,
      VISIT_STATUSES.CANCELLED,
    ],
    [VISIT_STATUSES.UNABLE_TO_MEET]: [
      VISIT_STATUSES.ASSIGNED,
      VISIT_STATUSES.POSTPONED,
      VISIT_STATUSES.CANCELLED,
    ],
  };

  const validNext = allowedTransitions[currentStatus] || [];
  if (validNext.includes(targetStatus)) {
    return { isAllowed: true };
  }

  return {
    isAllowed: false,
    reason: `Cannot transition visit from "${currentStatus}" to "${targetStatus}".`,
  };
};

/**
 * Validates Visit creation or scheduling.
 */
export const validateVisit = (visit) => {
  const errors = [];
  if (!visit || typeof visit !== 'object') {
    return { isValid: false, errors: ['Visit data is missing'] };
  }

  if (!visit.customerId) {
    errors.push('Customer / Healthcare Facility is required');
  }
  if (!visit.assignedTo) {
    errors.push('Sales representative assignment is required');
  }
  if (!visit.scheduledDate) {
    errors.push('Scheduled date is required');
  }
  if (visit.priority && !ALL_VISIT_PRIORITIES.includes(visit.priority)) {
    errors.push(`Invalid priority: ${visit.priority}`);
  }
  if (visit.meetingType && !ALL_MEETING_TYPES.includes(visit.meetingType)) {
    errors.push(`Invalid meeting type: ${visit.meetingType}`);
  }

  return { isValid: errors.length === 0, errors };
};

/**
 * Validates Lead / Deal data.
 */
export const validateLead = (lead) => {
  const errors = [];
  if (!lead || typeof lead !== 'object') {
    return { isValid: false, errors: ['Lead data is missing'] };
  }

  if (!lead.title || !lead.title.trim()) {
    errors.push('Lead title is required');
  }
  if (!lead.customerId) {
    errors.push('Associated customer / healthcare facility is required');
  }
  if (!lead.salesmanId) {
    errors.push('Assigned sales representative is required');
  }
  if (lead.expectedValue !== undefined && lead.expectedValue !== null) {
    const val = Number(lead.expectedValue);
    if (isNaN(val) || val < 0) {
      errors.push('Expected value must be a non-negative number');
    }
  }
  if (lead.stage && !ALL_LEAD_STATUSES.includes(lead.stage)) {
    errors.push(`Invalid deal stage: ${lead.stage}`);
  }

  return { isValid: errors.length === 0, errors };
};

/**
 * Validates Follow-up / Reminder data.
 */
export const validateFollowUp = (followUp) => {
  const errors = [];
  if (!followUp || typeof followUp !== 'object') {
    return { isValid: false, errors: ['Follow-up data is missing'] };
  }

  if (!followUp.customerId) {
    errors.push('Associated customer / facility is required');
  }
  if (!followUp.salesmanId) {
    errors.push('Assigned sales representative is required');
  }
  if (!followUp.dueDate) {
    errors.push('Due date is required');
  }
  if (followUp.type && !ALL_FOLLOW_UP_TYPES.includes(followUp.type)) {
    errors.push(`Invalid follow-up type: ${followUp.type}`);
  }
  if (followUp.priority && !ALL_VISIT_PRIORITIES.includes(followUp.priority)) {
    errors.push(`Invalid priority: ${followUp.priority}`);
  }

  return { isValid: errors.length === 0, errors };
};
