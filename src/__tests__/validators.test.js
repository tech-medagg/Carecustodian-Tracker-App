// src/__tests__/validators.test.js
import {
  isValidCoordinates,
  computeHaversineDistance,
  isRealisticGpsMovement,
  validateCustomer,
  validateVisit,
  validateVisitStatusTransition,
  validateLead,
  validateFollowUp,
} from '../utils/validators';
import { VISIT_STATUSES } from '../constants/salesConstants';

describe('Centralized Validators Engine', () => {
  describe('GPS Coordinate Validation', () => {
    test('validates correct latitude and longitude', () => {
      expect(isValidCoordinates(13.0827, 80.2707)).toBe(true);
      expect(isValidCoordinates(0, 0)).toBe(true);
      expect(isValidCoordinates(-89.9, 179.9)).toBe(true);
    });

    test('rejects out of bounds or invalid coordinates', () => {
      expect(isValidCoordinates(95, 80)).toBe(false);
      expect(isValidCoordinates(-100, 20)).toBe(false);
      expect(isValidCoordinates(13, 200)).toBe(false);
      expect(isValidCoordinates(null, 80)).toBe(false);
      expect(isValidCoordinates(undefined, undefined)).toBe(false);
      expect(isValidCoordinates('invalid', 'coords')).toBe(false);
    });

    test('calculates accurate Haversine distance', () => {
      // Chennai to Bangalore: approx 290-300 km
      const chennai = [13.0827, 80.2707];
      const bangalore = [12.9716, 77.5946];
      const distance = computeHaversineDistance(chennai, bangalore);
      expect(distance).toBeGreaterThan(280);
      expect(distance).toBeLessThan(310);
    });

    test('detects and discards impossible teleportation / GPS jumps', () => {
      const p1 = [13.0827, 80.2707];
      const p2 = [13.0927, 80.2807]; // ~1.5 km away
      // Moving 1.5 km in 1 second = 5400 km/h -> should be rejected
      expect(isRealisticGpsMovement(p1, p2, 1, 150)).toBe(false);

      // Moving 1.5 km in 120 seconds = 45 km/h -> realistic
      expect(isRealisticGpsMovement(p1, p2, 120, 150)).toBe(true);
    });
  });

  describe('Customer Validation', () => {
    test('validates valid healthcare customer', () => {
      const validCustomer = {
        name: 'Apollo Hospital',
        type: 'Hospital',
        phone: '+91 9876543210',
        email: 'procurement@apollo.com',
        latitude: 13.0827,
        longitude: 80.2707,
      };
      const result = validateCustomer(validCustomer);
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    test('rejects customer with missing name or invalid email/coords', () => {
      const invalid = {
        name: '',
        email: 'invalid-email',
        latitude: 100,
        longitude: 80,
      };
      const result = validateCustomer(invalid);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Visit Lifecycle Transition Validation', () => {
    test('allows normal progress: Planned -> Assigned -> In Progress -> Completed', () => {
      expect(validateVisitStatusTransition(VISIT_STATUSES.PLANNED, VISIT_STATUSES.ASSIGNED).isAllowed).toBe(true);
      expect(validateVisitStatusTransition(VISIT_STATUSES.ASSIGNED, VISIT_STATUSES.IN_PROGRESS).isAllowed).toBe(true);
      expect(validateVisitStatusTransition(VISIT_STATUSES.IN_PROGRESS, VISIT_STATUSES.COMPLETED).isAllowed).toBe(true);
    });

    test('strictly rejects reverting from Completed to Planned or In Progress', () => {
      expect(validateVisitStatusTransition(VISIT_STATUSES.COMPLETED, VISIT_STATUSES.PLANNED).isAllowed).toBe(false);
      expect(validateVisitStatusTransition(VISIT_STATUSES.COMPLETED, VISIT_STATUSES.IN_PROGRESS).isAllowed).toBe(false);
    });

    test('strictly rejects modifying a Cancelled visit', () => {
      expect(validateVisitStatusTransition(VISIT_STATUSES.CANCELLED, VISIT_STATUSES.ASSIGNED).isAllowed).toBe(false);
    });
  });

  describe('Lead & Follow-up Validation', () => {
    test('validates valid lead', () => {
      const lead = {
        title: 'ICU Monitor Contract',
        customerId: 'cust_123',
        salesmanId: 'sales_456',
        expectedValue: 500000,
        stage: 'Qualified',
      };
      expect(validateLead(lead).isValid).toBe(true);
    });

    test('rejects lead with negative value or missing title', () => {
      const lead = {
        title: '',
        customerId: 'cust_123',
        salesmanId: 'sales_456',
        expectedValue: -500,
      };
      const res = validateLead(lead);
      expect(res.isValid).toBe(false);
      expect(res.errors.length).toBe(2);
    });

    test('validates follow-up', () => {
      const followUp = {
        customerId: 'cust_123',
        salesmanId: 'sales_456',
        dueDate: '2026-09-15',
        type: 'Phone Call',
        priority: 'High',
      };
      expect(validateFollowUp(followUp).isValid).toBe(true);
    });
  });
});
