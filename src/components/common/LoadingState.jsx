// src/components/common/LoadingState.jsx
import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

/**
 * LoadingState component for page / widget spinners.
 */
const LoadingState = ({ message = 'Loading...', minHeight = 250 }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: minHeight,
        width: '100%',
        p: 3,
      }}
    >
      <CircularProgress size={40} thickness={4} />
      {message && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2, fontWeight: 500 }}>
          {message}
        </Typography>
      )}
    </Box>
  );
};

export default LoadingState;
