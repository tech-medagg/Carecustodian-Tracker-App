// src/components/common/PageHeader.jsx
import React from 'react';
import { Box, Typography, Breadcrumbs, Link } from '@mui/material';

/**
 * PageHeader component for consistent page titles, subtitles, and action buttons across pages.
 */
const PageHeader = ({ title, subtitle, breadcrumbs, action }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'flex-start', sm: 'center' },
        justifyContent: 'space-between',
        mb: 3,
        gap: 2,
      }}
    >
      <Box>
        {breadcrumbs && (
          <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 0.5, fontSize: '0.85rem' }}>
            {breadcrumbs.map((crumb, idx) =>
              crumb.href ? (
                <Link key={idx} underline="hover" color="inherit" href={crumb.href}>
                  {crumb.label}
                </Link>
              ) : (
                <Typography key={idx} color="text.primary" fontSize="0.85rem" fontWeight={500}>
                  {crumb.label}
                </Typography>
              )
            )}
          </Breadcrumbs>
        )}
        <Typography variant="h5" fontWeight={700} color="text.primary">
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {subtitle}
          </Typography>
        )}
      </Box>

      {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
    </Box>
  );
};

export default PageHeader;
