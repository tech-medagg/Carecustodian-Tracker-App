// src/constants/routes.js
// Centralised route paths — prevents magic strings scattered across the codebase.

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  UNAUTHORIZED: '/unauthorized',

  // ── Admin routes ─────────────────────────────────────────────────────
  ADMIN: '/admin',
  // Phase 7+ additions (reserved for future sub-routes)
  ADMIN_LIVE: '/admin/live',
  ADMIN_VISITS: '/admin/visits',
  ADMIN_SALESMEN: '/admin/salesmen',
  ADMIN_CUSTOMERS: '/admin/customers',
  ADMIN_FOLLOW_UPS: '/admin/follow-ups',
  ADMIN_REPORTS: '/admin/reports',
  ADMIN_SETTINGS: '/admin/settings',

  // ── Salesman routes ───────────────────────────────────────────────────
  SALES: '/sales',
  // Phase 8+ additions (reserved for future sub-routes)
  SALES_VISITS: '/sales/visits',
  SALES_TRIPS: '/sales/trips',
  SALES_FOLLOW_UPS: '/sales/follow-ups',
  SALES_PROFILE: '/sales/profile',
};
