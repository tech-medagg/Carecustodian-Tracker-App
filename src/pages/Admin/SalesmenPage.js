import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Container,
  Paper,
  Box,
  Typography,
  Chip,
  Avatar,
  Button,
} from '@mui/material';
import {
  People as PeopleIcon,
  DirectionsCar as CarIcon,
  CheckCircle as ActiveIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { fetchTrips, selectAllTrips } from '../../store/tripSlice';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import DataTable from '../../components/common/DataTable';

const SalesmenPage = () => {
  const dispatch = useDispatch();
  const trips = useSelector(selectAllTrips);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadSalesmen = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'users'));
      const list = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUsers(list);
    } catch (err) {
      console.warn('Could not fetch users list from Firestore:', err);
      // Fallback to distinct salesmen in trips
      const salesmenMap = new Map();
      trips.forEach((t) => {
        if (t.salesmanEmail && !salesmenMap.has(t.salesmanEmail)) {
          salesmenMap.set(t.salesmanEmail, {
            id: t.userId || t.salesmanEmail,
            email: t.salesmanEmail,
            displayName: t.salesman || t.salesmanEmail,
            role: 'salesman',
            status: 'active',
          });
        }
      });
      setUsers(Array.from(salesmenMap.values()));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    dispatch(fetchTrips());
    loadSalesmen();
  }, [dispatch]);

  const activeCount = users.filter((u) => u.status !== 'inactive').length;

  const columns = [
    {
      id: 'displayName',
      label: 'Sales Representative',
      render: (_, row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {row.photoURL ? (
            <Avatar src={row.photoURL} sx={{ width: 36, height: 36 }} />
          ) : (
            <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main', fontSize: '0.9rem' }}>
              {(row.displayName || row.email || 'S').charAt(0).toUpperCase()}
            </Avatar>
          )}
          <Box>
            <Typography variant="body2" fontWeight={600}>
              {row.displayName || 'Unnamed Salesman'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {row.email}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      id: 'role',
      label: 'Role',
      render: (role) => (
        <Chip
          label={role === 'admin' ? 'Admin' : 'Salesman'}
          color={role === 'admin' ? 'secondary' : 'primary'}
          size="small"
          variant="outlined"
          sx={{ fontWeight: 600 }}
        />
      ),
    },
    {
      id: 'tripsCount',
      label: 'Trips Logged',
      align: 'right',
      render: (_, row) => {
        const count = trips.filter(
          (t) => t.userId === row.id || t.salesmanEmail === row.email
        ).length;
        return (
          <Typography variant="body2" fontWeight={600}>
            {count}
          </Typography>
        );
      },
    },
    {
      id: 'totalDistance',
      label: 'Total Distance',
      align: 'right',
      render: (_, row) => {
        const dist = trips
          .filter((t) => t.userId === row.id || t.salesmanEmail === row.email)
          .reduce((sum, t) => sum + (parseFloat(t.distance) || 0), 0);
        return (
          <Typography variant="body2" fontWeight={600}>
            {dist.toFixed(1)} km
          </Typography>
        );
      },
    },
    {
      id: 'status',
      label: 'Status',
      align: 'center',
      render: (status) => (
        <Chip
          label={status === 'inactive' ? 'Inactive' : 'Active'}
          color={status === 'inactive' ? 'default' : 'success'}
          size="small"
        />
      ),
    },
  ];

  return (
    <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
      <PageHeader
        title="Salesmen Management"
        subtitle="View and manage field sales representatives, recorded trips, and account statuses."
        action={
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => {
              dispatch(fetchTrips());
              loadSalesmen();
            }}
            disabled={loading}
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
          title="Total Representatives"
          value={users.length}
          subtitle="Registered staff accounts"
          icon={PeopleIcon}
          color="primary"
        />
        <StatCard
          title="Active Accounts"
          value={activeCount}
          subtitle="Available for field dispatch"
          icon={ActiveIcon}
          color="success"
        />
        <StatCard
          title="Total Trips Recorded"
          value={trips.length}
          subtitle="Across all representatives"
          icon={CarIcon}
          color="info"
        />
      </Box>

      {/* Salesmen Table */}
      <Paper elevation={1} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <DataTable
          columns={columns}
          data={users}
          loading={loading}
          searchPlaceholder="Search representatives by name or email..."
          emptyTitle="No salesmen registered"
          emptyDescription="When salesmen sign in with Google or Email, they will appear here automatically."
        />
      </Paper>
    </Container>
  );
};

export default SalesmenPage;
