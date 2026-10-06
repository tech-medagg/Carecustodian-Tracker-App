// src/components/common/EmptyState.jsx
import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';

/**
 * EmptyState placeholder component when list or table data is empty.
 */
const EmptyState = ({
  icon: Icon = InboxOutlinedIcon,
  title = 'No Data Found',
  description = 'There are no items to display right now.',
  actionLabel,
  onAction,
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 5,
        textAlign: 'center',
        bgcolor: 'background.paper',
        borderRadius: 2,
        border: '1px dashed #cbd5e1',
      }}
    >
      <Icon sx={{ fontSize: 60, color: 'text.secondary', opacity: 0.5, mb: 2 }} />
      <Typography variant="h6" fontWeight={600} color="text.primary" gutterBottom>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400, mb: actionLabel ? 3 : 0 }}>
        {description}
      </Typography>
      {actionLabel && onAction && (
        <Button variant="contained" color="primary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </Box>
  );
};

export default EmptyState;
