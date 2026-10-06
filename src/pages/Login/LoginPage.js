import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import {
  loginUser,
  loginWithGoogle,
  selectAuthStatus,
  selectAuthError,
  selectCurrentUser,
  clearAuthError,
  resetAuthStatus,
} from '../../store/authSlice';
import { ADMIN_ROLES } from '../../constants/roles';
import { ROUTES } from '../../constants/routes';
import {
  Container,
  Box,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Alert,
  Divider,
  Paper,
  IconButton,
  InputAdornment,
} from '@mui/material';
import { Google as GoogleIcon, Visibility, VisibilityOff, Login as LoginIcon } from '@mui/icons-material';

const LoginPage = () => {
  const dispatch = useDispatch();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginMethod, setLoginMethod] = useState(null); // 'google' | 'email' | null

  const authStatus = useSelector(selectAuthStatus);
  const authError = useSelector(selectAuthError);
  const currentUser = useSelector(selectCurrentUser);

  // Always reset any lingering loading/error state when landing on the login page
  useEffect(() => {
    dispatch(resetAuthStatus());
    setLoginMethod(null);
  }, [dispatch]);

  // Reset login method state when status settles
  useEffect(() => {
    if (authStatus !== 'loading') {
      setLoginMethod(null);
    }
  }, [authStatus]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    dispatch(clearAuthError());
    setLoginMethod('email');
    dispatch(loginUser({ email: email.trim(), password }));
  };

  const handleGoogleLogin = async () => {
    dispatch(clearAuthError());
    setLoginMethod('google');
    dispatch(loginWithGoogle());
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // If user is already logged in, redirect to their role-appropriate dashboard.
  if (currentUser) {
    const destination = ADMIN_ROLES.includes(currentUser.role) ? ROUTES.ADMIN : ROUTES.SALES;
    return <Navigate to={destination} replace />;
  }

  const isGoogleLoading = authStatus === 'loading' && loginMethod === 'google';
  const isEmailLoading = authStatus === 'loading' && loginMethod === 'email';
  const isBusy = authStatus === 'loading';

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          marginBottom: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: '100%', borderRadius: 3, boxShadow: '0 8px 32px rgba(25, 118, 210, 0.12)' }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Box
              component="img"
              src="/logo.png"
              alt="Carecustodian Tracker"
              sx={{
                width: 72,
                height: 72,
                mb: 1.5,
                borderRadius: '50%',
                boxShadow: '0 4px 16px rgba(25, 118, 210, 0.25)',
                p: 0.6,
                bgcolor: 'white',
                objectFit: 'contain',
              }}
            />
            <Typography component="h1" variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main', fontSize: { xs: '1.5rem', sm: '2rem' } }}>
              Carecustodian Tracker
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Sign in to your authorized account
            </Typography>
          </Box>

          {/* Google Login Section */}
          <Box sx={{ mb: 2.5 }}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={!isGoogleLoading && <GoogleIcon />}
              onClick={handleGoogleLogin}
              disabled={isBusy}
              sx={{
                py: 1.4,
                borderColor: '#4285f4',
                color: '#4285f4',
                fontWeight: 600,
                borderRadius: 2,
                '&:hover': {
                  borderColor: '#3367d6',
                  backgroundColor: 'rgba(66, 133, 244, 0.04)',
                },
              }}
            >
              {isGoogleLoading ? (
                <CircularProgress size={20} color="primary" />
              ) : (
                'Continue with Google'
              )}
            </Button>
            <Typography variant="caption" display="block" sx={{ textAlign: 'center', mt: 1, color: 'text.secondary' }}>
              Authorized accounts only
            </Typography>
          </Box>

          <Divider sx={{ my: 2.5 }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
              OR SIGN IN WITH EMAIL
            </Typography>
          </Divider>

          {/* Email/Password Login Section */}
          <Box>
            <Box component="form" onSubmit={handleSubmit} noValidate>
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="Email Address"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isBusy}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                id="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isBusy}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={togglePasswordVisibility}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                startIcon={<LoginIcon />}
                sx={{ mt: 3, mb: 1, py: 1.5, fontWeight: 700 }}
                disabled={isBusy}
              >
                {isEmailLoading ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  'Sign In'
                )}
              </Button>
            </Box>
          </Box>

          {/* Error Display */}
          {authStatus === 'failed' && authError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {authError}
            </Alert>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default LoginPage;


