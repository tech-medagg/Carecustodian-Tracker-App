// src/features/analytics/analyticsService.js
// Business intelligence & reporting calculations for Field Sales Management System

/**
 * Calculate salesman productivity score (0 - 100)
 * Factors:
 * 1. Visit Completion Rate (weight: 35%)
 * 2. Positive Outcome Ratio (weight: 25%)
 * 3. Leads Generated (weight: 25%)
 * 4. Travel Efficiency (Visits per km) (weight: 15%)
 */
export const calculateProductivityScore = ({
  completedVisits = 0,
  plannedVisits = 0,
  positiveOutcomes = 0,
  totalOutcomes = 0,
  leadsCount = 0,
  totalDistanceKm = 0,
}) => {
  // 1. Visit Completion Rate
  const visitRate = plannedVisits > 0 ? Math.min(completedVisits / plannedVisits, 1) * 35 : completedVisits > 0 ? 30 : 0;

  // 2. Positive Outcome Rate
  const outcomeRate = totalOutcomes > 0 ? Math.min(positiveOutcomes / totalOutcomes, 1) * 25 : 0;

  // 3. Leads Generation (benchmark 5 leads = full 25 pts)
  const leadScore = Math.min(leadsCount / 5, 1) * 25;

  // 4. Travel Efficiency (benchmark: 1 visit per 5km = full 15 pts)
  let efficiencyScore = 0;
  if (completedVisits > 0) {
    if (totalDistanceKm > 0) {
      const visitsPerKm = completedVisits / totalDistanceKm;
      efficiencyScore = Math.min(visitsPerKm / 0.2, 1) * 15;
    } else {
      efficiencyScore = 15;
    }
  }

  const rawScore = Math.round(visitRate + outcomeRate + leadScore + efficiencyScore);
  return Math.min(Math.max(rawScore, 0), 100);
};

/**
 * Aggregate sales vs travel costs across all salesmen or for a single salesman
 */
export const computeSalesVsTravelMetrics = (salesmen = [], visits = [], trips = [], leads = [], ratePerKm = 3) => {
  return salesmen.map((salesman) => {
    const salesmanId = salesman.uid || salesman.id;
    const userVisits = visits.filter((v) => (v.assignedTo === salesmanId || v.salesmanId === salesmanId));
    const userTrips = trips.filter((t) => (t.userId === salesmanId || t.salesmanId === salesmanId));
    const userLeads = leads.filter((l) => l.salesmanId === salesmanId);

    const totalPlanned = userVisits.length;
    const completed = userVisits.filter((v) => v.status === 'Completed').length;
    const totalDistance = userTrips.reduce((sum, t) => sum + (Number(t.distance) || 0), 0);
    const travelCost = totalDistance * ratePerKm;

    const positiveOutcomes = userVisits.filter((v) => ['Interested', 'Deal Closed', 'Demo Requested'].includes(v.outcome)).length;
    const totalOutcomes = userVisits.filter((v) => Boolean(v.outcome)).length;
    const pipelineValue = userLeads.reduce((sum, l) => sum + (Number(l.expectedValue) || 0), 0);

    const productivityScore = calculateProductivityScore({
      completedVisits: completed,
      plannedVisits: totalPlanned,
      positiveOutcomes,
      totalOutcomes,
      leadsCount: userLeads.length,
      totalDistanceKm: totalDistance,
    });

    return {
      salesmanId,
      name: salesman.name || salesman.email?.split('@')[0] || 'Unknown',
      email: salesman.email,
      phone: salesman.phone || 'N/A',
      completedVisits: completed,
      totalVisits: totalPlanned,
      completionRate: totalPlanned > 0 ? Math.round((completed / totalPlanned) * 100) : 0,
      totalDistanceKm: Number(totalDistance.toFixed(1)),
      travelCost: Math.round(travelCost),
      leadsCount: userLeads.length,
      pipelineValue: Math.round(pipelineValue),
      productivityScore,
      costPerVisit: completed > 0 ? Math.round(travelCost / completed) : 0,
    };
  });
};

/**
 * Compute performance by customer type/category (Hospital, Clinic, Lab, Pharmacy)
 */
export const computeCategoryYield = (customers = [], visits = [], leads = []) => {
  const categories = ['Hospital', 'Clinic', 'Diagnostic Lab', 'Pharmacy', 'Other'];
  
  return categories.map((cat) => {
    const catCustomerIds = new Set(
      customers.filter((c) => (c.type || 'Other').toLowerCase() === cat.toLowerCase()).map((c) => c.id)
    );

    const catVisits = visits.filter((v) => catCustomerIds.has(v.customerId));
    const completed = catVisits.filter((v) => v.status === 'Completed').length;
    const catLeads = leads.filter((l) => catCustomerIds.has(l.customerId));
    const leadValue = catLeads.reduce((sum, l) => sum + (Number(l.expectedValue) || 0), 0);

    return {
      category: cat,
      customerCount: catCustomerIds.size,
      totalVisits: catVisits.length,
      completedVisits: completed,
      leadsCount: catLeads.length,
      leadValue,
    };
  });
};
