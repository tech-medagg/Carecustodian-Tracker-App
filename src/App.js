// src/App.js
// Root application component.
// Defines the routing tree and wraps routes with role-based guards.

import React, { Suspense } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';

import { selectCurrentUser } from './store/authSlice';
import { ADMIN_ROLES, ALL_ROLES, ROLES } from './constants/roles';
import { ROUTES } from './constants/routes';

import MainLayout from './components/layout/MainLayout';
import LoginPage from './pages/Login/LoginPage';
import RoleGuard from './features/auth/RoleGuard';
import UnauthorizedPage from './features/auth/UnauthorizedPage';

// ── Lazy-loaded page bundles ──────────────────────────────────────────────────
const AdminDashboard = React.lazy(() => import('./pages/Admin/Dashboard'));
const AdminSalesmenPage = React.lazy(() => import('./pages/Admin/SalesmenPage'));
const AdminVisitsPage = React.lazy(() => import('./pages/Admin/VisitsPage'));
const AdminCustomersPage = React.lazy(() => import('./pages/Admin/CustomersPage'));
const AdminFollowUpsPage = React.lazy(() => import('./pages/Admin/FollowUpsPage'));
const AdminReportsPage = React.lazy(() => import('./pages/Admin/ReportsPage'));

const SalesDashboard = React.lazy(() => import('./pages/Sales/Dashboard'));
const SalesVisitsPage = React.lazy(() => import('./pages/Sales/VisitsPage'));
const SalesFollowUpsPage = React.lazy(() => import('./pages/Sales/FollowUpsPage'));
const SalesTripsPage = React.lazy(() => import('./pages/Sales/TripsPage'));
const ProfilePage = React.lazy(() => import('./pages/Sales/ProfilePage'));

// ── Loading spinner ───────────────────────────────────────────────────────────
const LoadingSpinner = () => (
  <Box
    display="flex"
    flexDirection="column"
    justifyContent="center"
    alignItems="center"
    minHeight="100vh"
  >
    <CircularProgress size={48} thickness={4} />
    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
      Loading…
    </Typography>
  </Box>
);

// ── Error boundary ────────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box 
          display="flex" 
          flexDirection="column"
          justifyContent="center" 
          alignItems="center" 
          minHeight="100vh"
          p={3}
        >
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="h6">Something went wrong</Typography>
            <Typography variant="body2">
              {this.state.error?.message || 'An unexpected error occurred'}
            </Typography>
          </Alert>
          <Typography variant="body2" color="text.secondary">
            Please refresh the page or contact support if the problem persists.
          </Typography>
        </Box>
      );
    }

    return this.props.children;
  }
}

// ── Root redirect ─────────────────────────────────────────────────────────────
// Sends authenticated users to the correct dashboard based on their Firestore role.
// Unauthenticated users are sent to /login.
const RootRedirect = () => {
  const user = useSelector(selectCurrentUser);

  if (!user) return <Navigate to={ROUTES.LOGIN} replace />;

  if (ADMIN_ROLES.includes(user.role)) {
    return <Navigate to={ROUTES.ADMIN} replace />;
  }

  return <Navigate to={ROUTES.SALES_VISITS} replace />;
};

// ── App ───────────────────────────────────────────────────────────────────────
function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            {/* ── Public routes ──────────────────────────────────────── */}
            <Route path={ROUTES.LOGIN} element={<LoginPage />} />
            <Route path={ROUTES.UNAUTHORIZED} element={<UnauthorizedPage />} />

            {/* ── Admin routes (super_admin + admin only) ────────────── */}
            <Route
              path={ROUTES.ADMIN}
              element={
                <RoleGuard allowedRoles={ADMIN_ROLES}>
                  <MainLayout>
                    <AdminDashboard />
                  </MainLayout>
                </RoleGuard>
              }
            />
            <Route
              path={ROUTES.ADMIN_VISITS}
              element={
                <RoleGuard allowedRoles={ADMIN_ROLES}>
                  <MainLayout>
                    <AdminVisitsPage />
                  </MainLayout>
                </RoleGuard>
              }
            />
            <Route
              path={ROUTES.ADMIN_CUSTOMERS}
              element={
                <RoleGuard allowedRoles={ADMIN_ROLES}>
                  <MainLayout>
                    <AdminCustomersPage />
                  </MainLayout>
                </RoleGuard>
              }
            />
            <Route
              path={ROUTES.ADMIN_FOLLOW_UPS}
              element={
                <RoleGuard allowedRoles={ADMIN_ROLES}>
                  <MainLayout>
                    <AdminFollowUpsPage />
                  </MainLayout>
                </RoleGuard>
              }
            />
            <Route
              path={ROUTES.ADMIN_SALESMEN}
              element={
                <RoleGuard allowedRoles={ADMIN_ROLES}>
                  <MainLayout>
                    <AdminSalesmenPage />
                  </MainLayout>
                </RoleGuard>
              }
            />
            <Route
              path={ROUTES.ADMIN_REPORTS}
              element={
                <RoleGuard allowedRoles={ADMIN_ROLES}>
                  <MainLayout>
                    <AdminReportsPage />
                  </MainLayout>
                </RoleGuard>
              }
            />

            {/* ── Salesman routes ────────────────────────────────────── */}
            <Route
              path={ROUTES.SALES_VISITS}
              element={
                <RoleGuard allowedRoles={[ROLES.SALESMAN]}>
                  <MainLayout>
                    <SalesVisitsPage />
                  </MainLayout>
                </RoleGuard>
              }
            />
            <Route
              path={ROUTES.SALES}
              element={
                <RoleGuard allowedRoles={[ROLES.SALESMAN]}>
                  <MainLayout>
                    <SalesDashboard />
                  </MainLayout>
                </RoleGuard>
              }
            />
            <Route
              path={ROUTES.SALES_FOLLOW_UPS}
              element={
                <RoleGuard allowedRoles={[ROLES.SALESMAN]}>
                  <MainLayout>
                    <SalesFollowUpsPage />
                  </MainLayout>
                </RoleGuard>
              }
            />
            <Route
              path={ROUTES.SALES_TRIPS}
              element={
                <RoleGuard allowedRoles={[ROLES.SALESMAN]}>
                  <MainLayout>
                    <SalesTripsPage />
                  </MainLayout>
                </RoleGuard>
              }
            />

            {/* ── Shared profile route (all authenticated users) ─────── */}
            <Route
              path={ROUTES.SALES_PROFILE}
              element={
                <RoleGuard allowedRoles={ALL_ROLES}>
                  <MainLayout>
                    <ProfilePage />
                  </MainLayout>
                </RoleGuard>
              }
            />

            {/* ── Root — role-based redirect ─────────────────────────── */}
            <Route path={ROUTES.HOME} element={<RootRedirect />} />

            {/* ── Catch-all ──────────────────────────────────────────── */}
            <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
          </Routes>
        </Suspense>
      </Router>
    </ErrorBoundary>
  );
}

export default App;