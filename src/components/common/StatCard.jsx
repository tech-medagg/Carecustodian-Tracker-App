// src/components/common/StatCard.jsx
import React from 'react';
import { Card, CardContent, Typography, Box, Avatar } from '@mui/material';

/**
 * StatCard component for KPI and metric display across dashboards.
 */
const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'primary', // 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'
  trend, // string, e.g. "+12% this week"
}) => {
  return (
    <Card elevation={0} sx={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Typography variant="body2" color="text.secondary" fontWeight={500}>
            {title}
          </Typography>
          {Icon && (
            <Avatar
              sx={{
                bgcolor: `${color}.light`,
                color: `${color}.main`,
                width: 44,
                height: 44,
                opacity: 0.9,
              }}
            >
              <Icon fontSize="medium" />
            </Avatar>
          )}
        </Box>

        <Typography variant="h4" fontWeight={700} color="text.primary" sx={{ mb: 0.5 }}>
          {value ?? 0}
        </Typography>

        {(subtitle || trend) && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {trend && (
              <Typography variant="caption" fontWeight={600} color={`${color}.main`}>
                {trend}
              </Typography>
            )}
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default StatCard;
