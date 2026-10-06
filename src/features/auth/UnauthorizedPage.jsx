// src/features/auth/UnauthorizedPage.jsx
// Shown when an authenticated user attempts to access a page their role
// does not permit.

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Typography,
  Button,
  Paper,
  Chip,
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { logoutUser, selectCurrentUser } from '../../store/authSlice';
import { ADMIN_ROLES, ROLE_LABELS } from '../../constants/roles';
import { ROUTES } from '../../constants/routes';

const UnauthorizedPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);

  const handleGoToDashboard = () => {
    if (user && ADMIN_ROLES.includes(user.role)) {
      navigate(ROUTES.ADMIN, { replace: true });
    } else {
      navigate(ROUTES.SALES, { replace: true });
    }
  };

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate(ROUTES.LOGIN, { replace: true });
  };

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      sx={{ bgcolor: '#f3f4f6', p: 2 }}
    >
      <Paper
        elevation={3}
        sx={{
          p: { xs: 3, sm: 6 },
          maxWidth: 480,
          width: '100%',
          textAlign: 'center',
          borderRadius: 2,
        }}
      >
        {/* Icon */}
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 80,
            height: 80,
            borderRadius: '50%',
            bgcolor: 'error.lighter',
            mb: 3,
          }}
        >
          <LockOutlinedIcon sx={{ fontSize: 40, color: 'error.main' }} />
        </Box>

        {/* Heading */}
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Access Denied
        </Typography>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          You don't have permission to view this page.
        </Typography>

        {/* Current role badge */}
        {user?.role && (
          <Chip
            label={`Your role: ${ROLE_LABELS[user.role] || user.role}`}
            color="default"
            variant="outlined"
            size="small"
            sx={{ mb: 4 }}
          />
        )}

        {/* Actions */}
        <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={2} justifyContent="center">
          <Button
            variant="contained"
            onClick={handleGoToDashboard}
            fullWidth
          >
            Go to My Dashboard
          </Button>
          <Button
            variant="outlined"
            color="error"
            onClick={handleLogout}
            fullWidth
          >
            Logout
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default UnauthorizedPage;
