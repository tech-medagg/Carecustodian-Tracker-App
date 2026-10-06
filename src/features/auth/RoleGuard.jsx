// src/features/auth/RoleGuard.jsx
// Route-level role enforcement component.
//
// Usage:
//   <RoleGuard allowedRoles={ADMIN_ROLES}>
//     <AdminDashboard />
//   </RoleGuard>
//
// Behaviour:
//   - Not logged in          → redirect to /login
//   - Logged in, wrong role  → redirect to /unauthorized
//   - Logged in, correct role → render children

import React from 'react';
import PropTypes from 'prop-types';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../store/authSlice';
import { ROUTES } from '../../constants/routes';

const RoleGuard = ({ children, allowedRoles = [] }) => {
  const user = useSelector(selectCurrentUser);

  // Not authenticated at all
  if (!user) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  // Deactivated user check
  if (user.status === 'inactive' || user.status === 'disabled') {
    return <Navigate to={ROUTES.UNAUTHORIZED} replace />;
  }

  // Authenticated but lacks the required role
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to={ROUTES.UNAUTHORIZED} replace />;
  }

  return children;
};

RoleGuard.propTypes = {
  children: PropTypes.node.isRequired,
  /** List of role strings that are allowed to access the wrapped content */
  allowedRoles: PropTypes.arrayOf(PropTypes.string),
};

export default RoleGuard;

