import React, { useEffect, Suspense, useMemo } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { CircularProgress, Box } from '@mui/material';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TripsProvider } from './contexts/TripsContext'; 
import MainLayout from './components/common/MainLayout';
import Login from './pages/Auth/Login';
import NotFound from './pages/Shared/NotFound';
import Unauthorized from './pages/Shared/Unauthorized';
import ProtectedRoute from './components/common/ProtectedRoute';

// Lazy load components for code splitting
const AdminDashboard = React.lazy(() => import('./pages/Admin/Dashboard'));
const SalesDashboard = React.lazy(() => import('./pages/Sales/Dashboard'));
const SalesTripTracker = React.lazy(() => import('./pages/Sales/TripTracker'));
const AdminSalesTeam = React.lazy(() => import('./pages/Admin/SalesTeam'));
const AdminReports = React.lazy(() => import('./pages/Admin/Reports'));
const AdminSettings = React.lazy(() => import('./pages/Admin/Settings'));
const Profile = React.lazy(() => import('./pages/Shared/Profile'));

// Loading component
const LoadingSpinner = () => (
  <Box 
    display="flex" 
    justifyContent="center" 
    alignItems="center" 
    minHeight="100vh"
  >
    <CircularProgress />
  </Box>
);

// Memoized theme creation
const useTheme = () => {
  return useMemo(() => createTheme({
    palette: {
      primary: {
        main: '#3f51b5',
      },
      secondary: {
        main: '#f50057',
      },
      background: {
        default: '#f5f5f5',
      },
    },
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      h1: {
        fontSize: '2.5rem',
        fontWeight: 500,
      },
      h2: {
        fontSize: '2rem',
        fontWeight: 500,
      },
      h3: {
        fontSize: '1.75rem',
        fontWeight: 500,
      },
      h4: {
        fontSize: '1.5rem',
        fontWeight: 500,
      },
      h5: {
        fontSize: '1.25rem',
        fontWeight: 500,
      },
      h6: {
        fontSize: '1rem',
        fontWeight: 500,
      },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: 8,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)',
          },
        },
      },
    },
  }), []);
};

// A component to handle navigation registration
const NavigationHandler = () => {
  const { registerNavigate } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Register the navigate function with the auth context
    registerNavigate(navigate);
  }, [navigate, registerNavigate]);

  return null;
};

// A component to redirect based on user role
const RoleBasedRedirect = () => {
  const { user } = useAuth();
  
  if (user?.role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  } else if (user?.role === 'sales') {
    return <Navigate to="/sales/dashboard" replace />;
  }
  
  return <Navigate to="/login" replace />;
};

const AppContent = () => {
  return (
    <>
      <NavigationHandler />
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Protected routes */}
        <Route element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }>
          <Route path="/admin/dashboard" element={
            <ProtectedRoute roles={['admin']}>
              <Suspense fallback={<LoadingSpinner />}>
                <AdminDashboard />
              </Suspense>
            </ProtectedRoute>
          } />
          
          <Route path="/admin/sales-team" element={
            <ProtectedRoute roles={['admin']}>
              <Suspense fallback={<LoadingSpinner />}>
                <AdminSalesTeam />
              </Suspense>
            </ProtectedRoute>
          } />
          
          <Route path="/admin/reports" element={
            <ProtectedRoute roles={['admin']}>
              <Suspense fallback={<LoadingSpinner />}>
                <AdminReports />
              </Suspense>
            </ProtectedRoute>
          } />
          
          <Route path="/admin/settings" element={
            <ProtectedRoute roles={['admin']}>
              <Suspense fallback={<LoadingSpinner />}>
                <AdminSettings />
              </Suspense>
            </ProtectedRoute>
          } />
          
          <Route path="/profile" element={
            <ProtectedRoute>
              <Suspense fallback={<LoadingSpinner />}>
                <Profile />
              </Suspense>
            </ProtectedRoute>
          } />
          
          <Route path="/sales/dashboard" element={
            <ProtectedRoute roles={['sales', 'admin']}>
              <Suspense fallback={<LoadingSpinner />}>
                <SalesDashboard />
              </Suspense>
            </ProtectedRoute>
          } />
          
          <Route path="/sales/trips" element={
            <ProtectedRoute roles={['sales', 'admin']}>
              <Suspense fallback={<LoadingSpinner />}>
                <SalesTripTracker />
              </Suspense>
            </ProtectedRoute>
          } />
          
          <Route index element={<RoleBasedRedirect />} />
        </Route>
        
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </>
  );
};

const App = () => {
  const theme = useTheme();
  
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AuthProvider>
          <TripsProvider> 
            <AppContent />
          </TripsProvider>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
};

export default App;