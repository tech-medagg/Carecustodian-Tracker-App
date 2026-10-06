import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Container,
  Paper,
  Box,
  Typography,
  Avatar,
  Divider,
  Grid,
  Chip,
  Button,
  Card,
  CardContent,
  Stack,
} from '@mui/material';
import {
  Email as EmailIcon,
  Security as SecurityIcon,
  Business as BusinessIcon,
  Fingerprint as FingerprintIcon,
  Logout as LogoutIcon,
  VerifiedUser as VerifiedIcon,
} from '@mui/icons-material';

import { selectCurrentUser, logoutUser } from '../../store/authSlice';
import { ROLE_LABELS } from '../../constants/roles';
import PageHeader from '../../components/common/PageHeader';

const ProfilePage = () => {
  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);

  if (!user) {
    return null;
  }

  const roleLabel = ROLE_LABELS[user.role] || user.role || 'Salesman';

  return (
    <Container maxWidth="md" sx={{ mt: 2, mb: 4 }}>
      <PageHeader
        title="My Profile"
        subtitle="Manage your personal account details and organization role."
      />

      <Paper elevation={1} sx={{ p: 4, borderRadius: 2 }}>
        {/* Header Section */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 4 }}>
          {user.photoURL ? (
            <Avatar
              src={user.photoURL}
              alt={user.displayName}
              sx={{ width: 80, height: 80, border: '3px solid #1976d2' }}
            />
          ) : (
            <Avatar sx={{ width: 80, height: 80, bgcolor: 'primary.main', fontSize: '2rem' }}>
              {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
            </Avatar>
          )}

          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h5" fontWeight={700}>
              {user.displayName || 'Sales Representative'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {user.email}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <Chip
                label={roleLabel}
                color="primary"
                size="small"
                icon={<VerifiedIcon />}
                sx={{ fontWeight: 600 }}
              />
              <Chip
                label={user.provider === 'google' ? 'Google Auth' : 'Email Account'}
                variant="outlined"
                size="small"
              />
            </Stack>
          </Box>
        </Box>

        <Divider sx={{ mb: 4 }} />

        {/* Account Details Grid */}
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Account Information
        </Typography>

        <Grid container spacing={3} sx={{ mt: 0.5 }}>
          <Grid item xs={12} sm={6}>
            <Card variant="outlined">
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <EmailIcon color="primary" />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Email Address
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {user.email}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Card variant="outlined">
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <SecurityIcon color="primary" />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Role & Permissions
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {roleLabel}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Card variant="outlined">
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <BusinessIcon color="primary" />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Organization
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    Medagg Carecustodian
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Card variant="outlined">
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <FingerprintIcon color="primary" />
                <Box sx={{ overflow: 'hidden' }}>
                  <Typography variant="caption" color="text.secondary">
                    User ID (UID)
                  </Typography>
                  <Typography variant="body2" fontWeight={600} noWrap title={user.uid}>
                    {user.uid}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Divider sx={{ my: 4 }} />

        {/* Actions */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button
            variant="outlined"
            color="error"
            startIcon={<LogoutIcon />}
            onClick={() => dispatch(logoutUser())}
          >
            Sign Out
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default ProfilePage;
