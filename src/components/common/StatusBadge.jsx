// src/components/common/StatusBadge.jsx
import React from 'react';
import { Chip } from '@mui/material';

/**
 * StatusBadge component for rendering standardized chips for statuses.
 */
const STATUS_CONFIG = {
  // Trips
  'In Progress': { color: 'warning', label: 'In Progress' },
  Completed: { color: 'success', label: 'Completed' },
  Cancelled: { color: 'error', label: 'Cancelled' },
  
  // Users / Status
  Active: { color: 'success', label: 'Active' },
  Inactive: { color: 'default', label: 'Inactive' },
  Pending: { color: 'info', label: 'Pending' },

  // Tasks / Visits
  Scheduled: { color: 'info', label: 'Scheduled' },
  Visited: { color: 'success', label: 'Visited' },
  Missed: { color: 'error', label: 'Missed' },

  // Expenses
  Approved: { color: 'success', label: 'Approved' },
  Rejected: { color: 'error', label: 'Rejected' },
};

const StatusBadge = ({ status, size = 'small', sx = {} }) => {
  const config = STATUS_CONFIG[status] || { color: 'default', label: status || 'Unknown' };

  return (
    <Chip
      label={config.label}
      color={config.color}
      size={size}
      variant="soft"
      sx={{
        fontWeight: 600,
        fontSize: '0.75rem',
        borderRadius: '6px',
        ...sx,
      }}
    />
  );
};

export default StatusBadge;
