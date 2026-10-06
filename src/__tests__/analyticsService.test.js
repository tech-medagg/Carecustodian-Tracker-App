// src/__tests__/analyticsService.test.js
import {
  calculateProductivityScore,
  computeSalesVsTravelMetrics,
  computeCategoryYield,
} from '../features/analytics/analyticsService';

describe('Analytics & Productivity Scoring Engine', () => {
  describe('Productivity Score Formula', () => {
    test('returns 0 when no visits or activities exist', () => {
      const score = calculateProductivityScore({});
      expect(score).toBe(0);
    });

    test('calculates 100 for perfect performance across all 4 factors', () => {
      const score = calculateProductivityScore({
        completedVisits: 10,
        plannedVisits: 10,       // 35 pts
        positiveOutcomes: 10,
        totalOutcomes: 10,       // 25 pts
        leadsCount: 5,           // 25 pts
        totalDistanceKm: 40,     // 10 visits / 40km = 0.25 visits/km >= 0.2 benchmark -> 15 pts
      });
      expect(score).toBe(100);
    });

    test('correctly scores partial visit completion and positive outcomes', () => {
      const score = calculateProductivityScore({
        completedVisits: 5,
        plannedVisits: 10,       // 50% * 35 = 17.5 pts
        positiveOutcomes: 3,
        totalOutcomes: 5,        // 60% * 25 = 15 pts
        leadsCount: 2,           // 2/5 * 25 = 10 pts
        totalDistanceKm: 100,    // 5/100 = 0.05 / 0.2 * 15 = 3.75 pts
      });
      // Expected: 17.5 + 15 + 10 + 3.75 = 46.25 -> 46 pts
      expect(score).toBe(46);
    });
  });

  describe('Sales vs Travel Metrics Calculation', () => {
    test('computes aggregated distance, costs, and pipeline value with dynamic rate', () => {
      const salesmen = [{ uid: 'user_1', name: 'Ravi Kumar', email: 'ravi@medagg.com' }];
      const visits = [
        { id: 'v1', assignedTo: 'user_1', status: 'Completed', outcome: 'Interested' },
        { id: 'v2', assignedTo: 'user_1', status: 'Completed', outcome: 'Deal Closed' },
        { id: 'v3', assignedTo: 'user_1', status: 'Planned' },
      ];
      const trips = [
        { id: 't1', userId: 'user_1', distance: 20 },
        { id: 't2', userId: 'user_1', distance: 30 },
      ];
      const leads = [
        { id: 'l1', salesmanId: 'user_1', expectedValue: 100000 },
      ];

      const metrics = computeSalesVsTravelMetrics(salesmen, visits, trips, leads, 3.5); // ₹3.5 / km
      expect(metrics.length).toBe(1);

      const m = metrics[0];
      expect(m.completedVisits).toBe(2);
      expect(m.totalVisits).toBe(3);
      expect(m.totalDistanceKm).toBe(50);
      expect(m.travelCost).toBe(175); // 50 * 3.5
      expect(m.pipelineValue).toBe(100000);
      expect(m.costPerVisit).toBe(88); // 175 / 2 = 87.5 -> 88
      expect(m.productivityScore).toBeGreaterThan(50);
    });
  });

  describe('Healthcare Category Yield Calculation', () => {
    test('computes facility conversion and lead value per healthcare type', () => {
      const customers = [
        { id: 'c1', name: 'City Hospital', type: 'Hospital' },
        { id: 'c2', name: 'Med Clinic', type: 'Clinic' },
      ];
      const visits = [
        { id: 'v1', customerId: 'c1', status: 'Completed' },
      ];
      const leads = [
        { id: 'l1', customerId: 'c1', expectedValue: 50000 },
      ];

      const yieldData = computeCategoryYield(customers, visits, leads);
      const hospitalYield = yieldData.find((y) => y.category === 'Hospital');
      const clinicYield = yieldData.find((y) => y.category === 'Clinic');

      expect(hospitalYield.customerCount).toBe(1);
      expect(hospitalYield.completedVisits).toBe(1);
      expect(hospitalYield.leadValue).toBe(50000);

      expect(clinicYield.customerCount).toBe(1);
      expect(clinicYield.completedVisits).toBe(0);
      expect(clinicYield.leadValue).toBe(0);
    });
  });
});
