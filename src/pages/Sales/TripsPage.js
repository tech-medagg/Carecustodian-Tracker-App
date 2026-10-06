import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Container,
  Paper,
  Box,
  Typography,
  Button,
  Chip,
} from '@mui/material';

import {
  Refresh as RefreshIcon,
  DirectionsCar as CarIcon,
  Timeline as TimelineIcon,
  Payments as PaymentsIcon,
} from '@mui/icons-material';
import { fetchTrips, selectAllTrips, selectTripStatus } from '../../store/tripSlice';
import { selectCurrentUser } from '../../store/authSlice';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';

const SalesTripsPage = () => {
  const dispatch = useDispatch();
  const currentUser = useSelector(selectCurrentUser);
  const allTrips = useSelector(selectAllTrips);
  const tripStatus = useSelector(selectTripStatus);

  useEffect(() => {
    dispatch(fetchTrips());
  }, [dispatch]);

  // Filter trips belonging to this salesman
  const myTrips = allTrips.filter((t) => {
    if (!currentUser) return false;
    return t.userId === currentUser.uid || t.salesmanEmail === currentUser.email;
  });

  const totalDistance = myTrips.reduce((acc, t) => acc + (parseFloat(t.distance) || 0), 0);
  const totalCost = myTrips.reduce((acc, t) => acc + (parseFloat(t.cost) || 0), 0);
  const completedTrips = myTrips.filter((t) => t.status === 'Completed').length;

  const columns = [
    {
      id: 'date',
      label: 'Date & Time',
      render: (_, row) => (
        <Box>
          <Typography variant="body2" fontWeight={600}>
            {row.startTime ? new Date(row.startTime).toLocaleDateString() : 'N/A'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {row.startTime ? new Date(row.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
          </Typography>
        </Box>
      ),
    },
    {
      id: 'fromTo',
      label: 'Route',
      render: (_, row) => (
        <Box sx={{ maxWidth: 320 }}>
          <Typography variant="body2" noWrap title={row.startLocation?.name || 'Starting Point'}>
            📍 <strong>From:</strong> {row.startLocation?.name || 'Current Location'}
          </Typography>
          <Typography variant="body2" noWrap title={row.endLocation?.name || row.to || 'Destination'}>
            🏁 <strong>{row.isEarlyTermination ? 'Stopped at:' : 'To:'}</strong> {row.endLocation?.name || row.to || 'Destination'}
          </Typography>
          {row.isEarlyTermination && (
            <Chip
              size="small"
              label="Stopped Mid-Trip"
              color="warning"
              variant="outlined"
              sx={{ mt: 0.5, height: 20, fontSize: '0.65rem', fontWeight: 600 }}
            />
          )}
        </Box>
      ),
    },
    {
      id: 'distance',
      label: 'Distance',
      align: 'right',
      render: (val) => (
        <Typography variant="body2" fontWeight={600}>
          {Number(val || 0).toFixed(1)} km
        </Typography>
      ),
    },
    {
      id: 'cost',
      label: 'Cost (₹)',
      align: 'right',
      render: (val) => (
        <Typography variant="body2" fontWeight={600} color="primary.main">
          ₹{Number(val || 0).toFixed(0)}
        </Typography>
      ),
    },
    {
      id: 'status',
      label: 'Status',
      align: 'center',
      render: (status) => <StatusBadge status={status} />,
    },
  ];

  return (
    <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
      <PageHeader
        title="My Trips History"
        subtitle="Review your recorded travel, routes, and mileage reimbursement history."
        action={
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => dispatch(fetchTrips())}
            disabled={tripStatus === 'loading'}
          >
            Refresh
          </Button>
        }
      />

      {/* KPI Cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        <StatCard
          title="Total Trips"
          value={myTrips.length}
          subtitle={`${completedTrips} completed`}
          icon={CarIcon}
          color="primary"
        />
        <StatCard
          title="Total Distance"
          value={`${totalDistance.toFixed(1)} km`}
          subtitle="Cumulative logged distance"
          icon={TimelineIcon}
          color="info"
        />
        <StatCard
          title="Total Reimbursement"
          value={`₹${totalCost.toFixed(0)}`}
          subtitle="Estimated allowance @ ₹3/km"
          icon={PaymentsIcon}
          color="success"
        />
      </Box>

      {/* Trips Data Table */}
      <Paper elevation={1} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <DataTable
          columns={columns}
          data={myTrips}
          loading={tripStatus === 'loading'}
          searchPlaceholder="Search my trips by address or date..."
          emptyTitle="No trips logged yet"
          emptyDescription="Start your first trip from the Trip Tracking page to record mileage."
        />
      </Paper>
    </Container>
  );
};

export default SalesTripsPage;
