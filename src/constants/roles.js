// src/constants/roles.js
// Single source of truth for all user roles in the system.

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  SALESMAN: 'salesman',
};

/** Roles that can access the admin dashboard */
export const ADMIN_ROLES = [ROLES.SUPER_ADMIN, ROLES.ADMIN];

/** All defined roles */
export const ALL_ROLES = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.SALESMAN];

/** Human-readable labels for display */
export const ROLE_LABELS = {
  [ROLES.SUPER_ADMIN]: 'Super Admin',
  [ROLES.ADMIN]: 'Admin / Manager',
  [ROLES.SALESMAN]: 'Salesman',
};
