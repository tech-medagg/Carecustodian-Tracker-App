// src/__tests__/RoleGuard.test.js
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import RoleGuard from '../features/auth/RoleGuard';
import authReducer from '../store/authSlice';
import { ROLES, ADMIN_ROLES } from '../constants/roles';

const createMockStore = (initialAuthState) => {
  return configureStore({
    reducer: {
      auth: authReducer,
    },
    preloadedState: {
      auth: initialAuthState,
    },
  });
};

const renderWithAuth = (ui, authState, initialEntries = ['/protected']) => {
  const store = createMockStore(authState);
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route path="/unauthorized" element={<div>Unauthorized Page</div>} />
          <Route path="/protected" element={ui} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
};

describe('RoleGuard Security Component', () => {
  test('redirects unauthenticated visitor to /login', () => {
    renderWithAuth(
      <RoleGuard allowedRoles={ADMIN_ROLES}>
        <div>Admin Content</div>
      </RoleGuard>,
      { user: null, status: 'idle', error: null }
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
  });

  test('redirects deactivated / inactive user to /unauthorized', () => {
    const inactiveUser = {
      uid: 'user_99',
      email: 'sales@medagg.com',
      role: ROLES.SALESMAN,
      status: 'inactive',
    };

    renderWithAuth(
      <RoleGuard allowedRoles={[ROLES.SALESMAN]}>
        <div>Salesman Content</div>
      </RoleGuard>,
      { user: inactiveUser, status: 'succeeded', error: null }
    );

    expect(screen.getByText('Unauthorized Page')).toBeInTheDocument();
    expect(screen.queryByText('Salesman Content')).not.toBeInTheDocument();
  });

  test('redirects salesman trying to access admin route to /unauthorized', () => {
    const salesmanUser = {
      uid: 'user_1',
      email: 'salesman@medagg.com',
      role: ROLES.SALESMAN,
      status: 'active',
    };

    renderWithAuth(
      <RoleGuard allowedRoles={ADMIN_ROLES}>
        <div>Admin Exclusive Content</div>
      </RoleGuard>,
      { user: salesmanUser, status: 'succeeded', error: null }
    );

    expect(screen.getByText('Unauthorized Page')).toBeInTheDocument();
    expect(screen.queryByText('Admin Exclusive Content')).not.toBeInTheDocument();
  });

  test('renders protected content when user has required role and active status', () => {
    const adminUser = {
      uid: 'admin_1',
      email: 'admin@medagg.com',
      role: ROLES.ADMIN,
      status: 'active',
    };

    renderWithAuth(
      <RoleGuard allowedRoles={ADMIN_ROLES}>
        <div>Admin Exclusive Content</div>
      </RoleGuard>,
      { user: adminUser, status: 'succeeded', error: null }
    );

    expect(screen.getByText('Admin Exclusive Content')).toBeInTheDocument();
  });
});
