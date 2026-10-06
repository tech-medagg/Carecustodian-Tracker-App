// src/components/common/ErrorState.jsx
import React from 'react';
import { Box, Typography, Button, Alert } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

/**
 * ErrorState component for displaying inline or full-page error messages with optional retry button.
 */
const ErrorState = ({
  title = 'Something Went Wrong',
  message = 'An unexpected error occurred. Please try again.',
  onRetry,
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 4,
        textAlign: 'center',
        bgcolor: '#fef2f2',
        borderRadius: 2,
        border: '1px solid #fecaca',
      }}
    >
      <ErrorOutlineIcon sx={{ fontSize: 48, color: 'error.main', mb: 1.5 }} />
      <Typography variant="h6" fontWeight={600} color="error.dark" gutterBottom>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 450, mb: onRetry ? 2.5 : 0 }}>
        {message}
      </Typography>
      {onRetry && (
        <Button variant="outlined" color="error" onClick={onRetry}>
          Try Again
        </Button>
      )}
    </Box>
  );
};

export default ErrorState;
