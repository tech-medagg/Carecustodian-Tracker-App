import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Snackbar,
  Alert,
  Chip,
  IconButton,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Tooltip,
  Container,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Stack,
  Divider,
  Card,
  Avatar,
  ButtonGroup,
  Tabs,
  Tab,
  InputAdornment,
} from "@mui/material";
import { 
  Download as DownloadIcon, 
  Refresh as RefreshIcon, 
  Visibility as ViewIcon,
  TwoWheeler as BikeIcon,
  MyLocation as FocusIcon,
  Payments as PaymentsIcon,
  Settings as SettingsIcon,
  Search as SearchIcon,
  Speed as SpeedIcon,
  CheckCircle as CheckCircleIcon,
  HourglassEmpty as PendingIcon,
  Assessment as ReportsIcon,
  Person as PersonIcon,
  Timeline as RouteIcon,
} from '@mui/icons-material';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import OlaMap from '../../components/Map/OlaMap';
import { setTrips, selectAllTrips, selectTripStatus, fetchTrips } from '../../store/tripSlice';
import AdminSettingsDialog from '../../components/Settings/AdminSettingsDialog';
import { ROUTES } from '../../constants/routes';

const FLEET_COLORS = ['#00C853', '#2979FF', '#FF9100', '#AA00FF', '#FF1744', '#00B0FF', '#E040FB', '#00E676'];

const deserializeTrip = (id, data) => {
  let parsedRoute = data.route;
  if (typeof parsedRoute === 'string') {
    try {
      parsedRoute = JSON.parse(parsedRoute);
    } catch (e) {
      parsedRoute = null;
    }
  }
  return {
    id,
    ...data,
    route: parsedRoute,
    startTime: data.startTime?.toDate ? data.startTime.toDate().toISOString() : data.startTime,
    endedAt: data.endedAt?.toDate ? data.endedAt.toDate().toISOString() : data.endedAt,
  };
};

const getDateRangeForFilter = (filter) => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (filter) {
    case 'today':
      return {
        start: startOfDay,
        end: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
      };
    case 'yesterday': {
      const yesterday = new Date(startOfDay);
      yesterday.setDate(yesterday.getDate() - 1);
      return {
        start: yesterday,
        end: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999)
      };
    }
    case 'thisWeek': {
      const dayOfWeek = now.getDay();
      const startOfWeek = new Date(startOfDay);
      startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);
      return {
        start: startOfWeek,
        end: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
      };
    }
    case 'thisMonth':
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
      };
    default:
      return null;
  }
};

const AdminDashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const trips = useSelector(selectAllTrips);
  const tripStatus = useSelector(selectTripStatus);

  const [selectedTrip, setSelectedTrip] = useState(null);
  const [mapMode, setMapMode] = useState('fleet'); // 'fleet' | 'inspection'
  const [focusedFleetMember, setFocusedFleetMember] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0); // 0: All Trips, 1: Salesmen Performance

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'In Progress' | 'Completed'
  const [dateFilter, setDateFilter] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const defaultCenter = [20.5937, 78.9629]; // India's center

  // Real-time Firestore sync via onSnapshot — eliminates periodic polling refresh flickers
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'trips'),
      (snapshot) => {
        const liveTrips = snapshot.docs.map((doc) => deserializeTrip(doc.id, doc.data()));
        // Sort newest first
        liveTrips.sort((a, b) => new Date(b.startTime || 0) - new Date(a.startTime || 0));
        dispatch(setTrips(liveTrips));
      },
      (err) => {
        console.warn('Real-time trips snapshot failed, falling back to manual fetch:', err);
        dispatch(fetchTrips());
      }
    );

    return () => unsubscribe();
  }, [dispatch]);

  // Extract all active salesmen currently on the road
  const activeFleetMembers = useMemo(() => {
    return trips
      .filter((trip) => trip.status === 'In Progress')
      .map((trip, idx) => ({
        ...trip,
        color: FLEET_COLORS[idx % FLEET_COLORS.length],
      }));
  }, [trips]);

  // Filter trips based on search query, status, and date range
  const filteredTrips = useMemo(() => {
    return trips.filter((trip) => {
      // Status filter
      if (statusFilter !== 'all' && trip.status !== statusFilter) {
        return false;
      }

      // Search query filter (salesman name, origin, destination)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const salesmanMatch = (trip.salesman || '').toLowerCase().includes(q);
        const originMatch = (trip.startLocation?.name || trip.from || '').toLowerCase().includes(q);
        const destMatch = (trip.endLocation?.name || trip.to || '').toLowerCase().includes(q);
        if (!salesmanMatch && !originMatch && !destMatch) return false;
      }

      // Date range filter
      if (dateFilter === 'all') return true;

      let dateRange;
      if (dateFilter === 'custom') {
        if (!customStartDate || !customEndDate) return true;
        dateRange = {
          start: new Date(customStartDate),
          end: new Date(customEndDate + 'T23:59:59.999Z'),
        };
      } else {
        dateRange = getDateRangeForFilter(dateFilter);
      }

      if (!dateRange) return true;
      const tripDate = new Date(trip.startTime);
      return tripDate >= dateRange.start && tripDate <= dateRange.end;
    });
  }, [trips, statusFilter, searchQuery, dateFilter, customStartDate, customEndDate]);

  // Aggregate statistics for filtered trips
  const stats = useMemo(() => {
    const total = filteredTrips.length;
    const completed = filteredTrips.filter((t) => t.status === 'Completed').length;
    const inProgress = filteredTrips.filter((t) => t.status === 'In Progress').length;
    const totalDistance = filteredTrips.reduce((acc, t) => acc + (parseFloat(t.distance) || 0), 0);
    const totalCost = filteredTrips.reduce((acc, t) => acc + (parseFloat(t.cost) || 0), 0);
    const uniqueSalesmen = new Set(filteredTrips.map((t) => t.salesman || t.userId).filter(Boolean)).size;

    return {
      total,
      completed,
      inProgress,
      totalDistance,
      totalCost,
      uniqueSalesmen,
      avgDistance: total > 0 ? totalDistance / total : 0,
      avgCost: total > 0 ? totalCost / total : 0,
    };
  }, [filteredTrips]);

  // Per-Salesman summary breakdown
  const salesmenSummary = useMemo(() => {
    const map = {};
    filteredTrips.forEach((t) => {
      const key = t.salesman || t.userId || 'Unknown';
      if (!map[key]) {
        map[key] = {
          name: key,
          tripsCount: 0,
          completedCount: 0,
          inProgressCount: 0,
          totalKm: 0,
          totalCost: 0,
          lastTripDate: t.startTime,
        };
      }
      map[key].tripsCount += 1;
      if (t.status === 'Completed') map[key].completedCount += 1;
      if (t.status === 'In Progress') map[key].inProgressCount += 1;
      map[key].totalKm += parseFloat(t.distance) || 0;
      map[key].totalCost += parseFloat(t.cost) || 0;
      if (new Date(t.startTime) > new Date(map[key].lastTripDate)) {
        map[key].lastTripDate = t.startTime;
      }
    });
    return Object.values(map).sort((a, b) => b.totalKm - a.totalKm);
  }, [filteredTrips]);

  const handleInspectTrip = useCallback((trip) => {
    setSelectedTrip(trip);
    setMapMode('inspection');
  }, []);

  const handleRefresh = useCallback(() => {
    dispatch(fetchTrips());
    setSnackbar({ open: true, message: 'Trips synchronized successfully', severity: 'success' });
  }, [dispatch]);

  const formatDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return 'In Progress';
    const diff = new Date(endTime) - new Date(startTime);
    if (isNaN(diff) || diff < 0) return 'N/A';
    const minutes = Math.floor((diff / 1000) / 60);
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    if (hours > 0) return `${hours}h ${remainingMins}m`;
    return `${minutes}m`;
  };

  const exportToCsv = useCallback(() => {
    if (filteredTrips.length === 0) {
      setSnackbar({ open: true, message: 'No trips to export', severity: 'warning' });
      return;
    }

    const headers = ['Trip ID', 'Salesman', 'Status', 'Start Time', 'End Time', 'Duration', 'From', 'To', 'Distance (km)', 'Reimbursement (₹)'];
    const rows = filteredTrips.map((t) => [
      t.id,
      t.salesman || 'N/A',
      t.status,
      new Date(t.startTime).toLocaleString(),
      t.endTime ? new Date(t.endTime).toLocaleString() : 'N/A',
      formatDuration(t.startTime, t.endTime || t.endedAt),
      t.startLocation?.name || t.from || 'N/A',
      t.endLocation?.name || t.to || 'N/A',
      Number(t.distance || 0).toFixed(2),
      Number(t.cost || 0).toFixed(2),
    ]);

    const csvContent = [headers, ...rows].map((row) => row.map((f) => `"${f}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `medagg_trips_${dateFilter}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    setSnackbar({ open: true, message: `Exported ${filteredTrips.length} trips to CSV`, severity: 'success' });
  }, [filteredTrips, dateFilter]);

  // Initial loading spinner only when zero data is cached
  if (tripStatus === 'loading' && trips.length === 0) {
    return (
      <Container maxWidth="xl" sx={{ mt: 6, mb: 6 }}>
        <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="50vh" gap={2}>
          <CircularProgress size={48} thickness={4} />
          <Typography variant="body1" color="text.secondary" fontWeight={600}>
            Loading Medagg Fleet Operations...
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 3, mb: 5 }}>
      {/* ── Top Executive Header ────────────────────────────────────────── */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant="h4" component="h1" fontWeight={800} sx={{ letterSpacing: '-0.5px' }}>
              Operations Dashboard
            </Typography>
            {activeFleetMembers.length > 0 ? (
              <Chip
                label={`● ${activeFleetMembers.length} Salesmen On Road`}
                color="success"
                size="small"
                sx={{ fontWeight: 800, px: 0.5, bgcolor: '#00C853', color: '#fff' }}
              />
            ) : (
              <Chip label="Fleet Idle" size="small" variant="outlined" sx={{ fontWeight: 600 }} />
            )}
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Real-time GPS fleet tracking, mileage reimbursement audits, and territory logs.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5} flexWrap="wrap">
          <Button
            variant="outlined"
            color="primary"
            startIcon={<SettingsIcon />}
            onClick={() => setSettingsOpen(true)}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
          >
            Configure Rates (₹/km)
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<ReportsIcon />}
            onClick={() => navigate(ROUTES.ADMIN_REPORTS)}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
          >
            Claims & Reports Hub
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<DownloadIcon />}
            onClick={exportToCsv}
            disabled={filteredTrips.length === 0}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
          >
            Export CSV
          </Button>
          <Tooltip title="Synchronize Data">
            <IconButton onClick={handleRefresh} sx={{ bgcolor: 'action.hover', borderRadius: 2 }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {/* ── Executive Stat Cards ────────────────────────────────────────── */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <Paper
            elevation={0}
            sx={{
              p: 2.2,
              borderRadius: 3,
              border: '1px solid',
              borderColor: activeFleetMembers.length > 0 ? '#b9f6ca' : '#e0e0e0',
              bgcolor: activeFleetMembers.length > 0 ? 'rgba(0, 200, 83, 0.05)' : '#fafafa',
              boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
            }}
          >
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase">
                Active Fleet
              </Typography>
              <Avatar sx={{ bgcolor: activeFleetMembers.length > 0 ? '#00C853' : '#9e9e9e', width: 34, height: 34 }}>
                <BikeIcon sx={{ fontSize: 20 }} />
              </Avatar>
            </Box>
            <Typography variant="h4" fontWeight={800} sx={{ mt: 1, color: activeFleetMembers.length > 0 ? '#00C853' : 'inherit' }}>
              {activeFleetMembers.length}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Riders on active duty now
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Paper elevation={0} sx={{ p: 2.2, borderRadius: 3, border: '1px solid #e0e0e0', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase">
                Total Trips
              </Typography>
              <Avatar sx={{ bgcolor: '#2979FF', width: 34, height: 34 }}>
                <RouteIcon sx={{ fontSize: 20 }} />
              </Avatar>
            </Box>
            <Typography variant="h4" fontWeight={800} sx={{ mt: 1 }}>
              {stats.total}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {stats.completed} completed | {stats.inProgress} active
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Paper elevation={0} sx={{ p: 2.2, borderRadius: 3, border: '1px solid #e0e0e0', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase">
                Fleet Distance
              </Typography>
              <Avatar sx={{ bgcolor: '#FF9100', width: 34, height: 34 }}>
                <SpeedIcon sx={{ fontSize: 20 }} />
              </Avatar>
            </Box>
            <Typography variant="h4" fontWeight={800} sx={{ mt: 1, color: 'primary.main' }}>
              {Number(stats.totalDistance).toFixed(1)} <Typography component="span" variant="body1" fontWeight={700}>km</Typography>
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Avg: {Number(stats.avgDistance).toFixed(1)} km/trip
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Paper elevation={0} sx={{ p: 2.2, borderRadius: 3, border: '1px solid #e0e0e0', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase">
                Mileage Claims
              </Typography>
              <Avatar sx={{ bgcolor: '#AA00FF', width: 34, height: 34 }}>
                <PaymentsIcon sx={{ fontSize: 20 }} />
              </Avatar>
            </Box>
            <Typography variant="h4" fontWeight={800} sx={{ mt: 1, color: '#2e7d32' }}>
              ₹{Number(stats.totalCost).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Avg: ₹{Number(stats.avgCost).toFixed(0)}/trip
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Paper elevation={0} sx={{ p: 2.2, borderRadius: 3, border: '1px solid #e0e0e0', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase">
                Active Staff
              </Typography>
              <Avatar sx={{ bgcolor: '#00B0FF', width: 34, height: 34 }}>
                <PersonIcon sx={{ fontSize: 20 }} />
              </Avatar>
            </Box>
            <Typography variant="h4" fontWeight={800} sx={{ mt: 1 }}>
              {stats.uniqueSalesmen}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Salesmen logged in this period
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* ── Main Workspace: 2-Column Responsive Layout ────────────────── */}
      <Grid container spacing={3}>
        {/* Left Column: Filters, Controls & Organized Data Tables (7 cols) */}
        <Grid item xs={12} lg={7}>
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid #e0e0e0', mb: 3 }}>
            {/* Search & Filter Bar */}
            <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
              <Grid item xs={12} sm={5}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search salesman, destination..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={6} sm={3.5}>
                <FormControl fullWidth size="small">
                  <InputLabel>Date Preset</InputLabel>
                  <Select
                    value={dateFilter}
                    label="Date Preset"
                    onChange={(e) => setDateFilter(e.target.value)}
                  >
                    <MenuItem value="all">All Time</MenuItem>
                    <MenuItem value="today">Today</MenuItem>
                    <MenuItem value="yesterday">Yesterday</MenuItem>
                    <MenuItem value="thisWeek">This Week</MenuItem>
                    <MenuItem value="thisMonth">This Month</MenuItem>
                    <MenuItem value="custom">Custom Range</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={6} sm={3.5}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={statusFilter}
                    label="Status"
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <MenuItem value="all">All Statuses ({trips.length})</MenuItem>
                    <MenuItem value="In Progress">In Progress ({activeFleetMembers.length})</MenuItem>
                    <MenuItem value="Completed">Completed</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {dateFilter === 'custom' && (
                <>
                  <Grid item xs={6} sm={6}>
                    <TextField
                      type="date"
                      label="Start Date"
                      size="small"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={6} sm={6}>
                    <TextField
                      type="date"
                      label="End Date"
                      size="small"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      fullWidth
                    />
                  </Grid>
                </>
              )}
            </Grid>

            <Divider sx={{ mb: 1.5 }} />

            {/* View Tabs: Trip Logs vs Salesmen Summary */}
            <Tabs
              value={activeTab}
              onChange={(e, val) => setActiveTab(val)}
              textColor="primary"
              indicatorColor="primary"
              sx={{ minHeight: 40, mb: 2 }}
            >
              <Tab label={`Trip Logs (${filteredTrips.length})`} sx={{ fontWeight: 700, textTransform: 'none' }} />
              <Tab label={`Salesmen Overview (${salesmenSummary.length})`} sx={{ fontWeight: 700, textTransform: 'none' }} />
            </Tabs>

            {/* TAB 0: Detailed Trip Logs */}
            {activeTab === 0 && (
              <>
                {filteredTrips.length === 0 ? (
                  <Box textAlign="center" py={6}>
                    <Typography variant="body1" color="text.secondary" fontWeight={600}>
                      No trips match the selected filters.
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Try clearing search filters or changing the date preset.
                    </Typography>
                  </Box>
                ) : (
                  <TableContainer sx={{ maxHeight: 520 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc' }}>Salesman & Route</TableCell>
                          <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc' }}>Status</TableCell>
                          <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc' }}>Start / Duration</TableCell>
                          <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc' }}>Distance / Claim</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700, bgcolor: '#f8fafc' }}>Inspect</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredTrips
                          .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                          .map((trip) => {
                            const isSelected = selectedTrip?.id === trip.id && mapMode === 'inspection';
                            return (
                              <TableRow
                                key={trip.id}
                                hover
                                selected={isSelected}
                                sx={{
                                  cursor: 'pointer',
                                  '&:hover': { bgcolor: 'action.hover' },
                                  bgcolor: isSelected ? 'rgba(25, 118, 210, 0.08)' : 'inherit',
                                }}
                                onClick={() => handleInspectTrip(trip)}
                              >
                                <TableCell>
                                  <Typography variant="body2" fontWeight={700}>
                                    {trip.salesman || 'Unnamed Salesman'}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" display="block" noWrap sx={{ maxWidth: 170 }}>
                                    🏁 To: {trip.endLocation?.name || trip.to || 'Client Site'}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={trip.status}
                                    color={trip.status === 'Completed' ? 'success' : 'warning'}
                                    size="small"
                                    icon={trip.status === 'Completed' ? <CheckCircleIcon /> : <PendingIcon />}
                                    sx={{ fontWeight: 700, height: 24, fontSize: '0.72rem' }}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" fontWeight={500}>
                                    {new Date(trip.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {formatDuration(trip.startTime, trip.endTime || trip.endedAt)}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" fontWeight={700} color="primary.main">
                                    {Number(trip.distance || 0).toFixed(1)} km
                                  </Typography>
                                  <Typography variant="caption" fontWeight={600} color="success.main">
                                    ₹{Number(trip.cost || 0).toFixed(0)}
                                  </Typography>
                                </TableCell>
                                <TableCell align="center">
                                  <Tooltip title="View Route on Map">
                                    <IconButton
                                      size="small"
                                      color={isSelected ? 'primary' : 'default'}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleInspectTrip(trip);
                                      }}
                                    >
                                      <ViewIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}

                {/* Table Pagination */}
                <TablePagination
                  component="div"
                  count={filteredTrips.length}
                  page={page}
                  onPageChange={(e, newPage) => setPage(newPage)}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={(e) => {
                    setRowsPerPage(parseInt(e.target.value, 10));
                    setPage(0);
                  }}
                  rowsPerPageOptions={[5, 10, 25, 50]}
                />
              </>
            )}

            {/* TAB 1: Salesmen Performance Breakdown */}
            {activeTab === 1 && (
              <Box sx={{ mt: 1 }}>
                <Grid container spacing={2}>
                  {salesmenSummary.map((s, idx) => (
                    <Grid item xs={12} sm={6} key={s.name}>
                      <Card variant="outlined" sx={{ borderRadius: 2.5, p: 1.8 }}>
                        <Box display="flex" alignItems="center" justifyContent="space-between">
                          <Box display="flex" alignItems="center" gap={1.5}>
                            <Avatar sx={{ bgcolor: FLEET_COLORS[idx % FLEET_COLORS.length], fontWeight: 700 }}>
                              {s.name.charAt(0).toUpperCase()}
                            </Avatar>
                            <Box>
                              <Typography variant="body1" fontWeight={700}>
                                {s.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Last active: {new Date(s.lastTripDate).toLocaleDateString()}
                              </Typography>
                            </Box>
                          </Box>
                          {s.inProgressCount > 0 && (
                            <Chip label="On Road" color="success" size="small" sx={{ fontWeight: 700 }} />
                          )}
                        </Box>
                        <Divider sx={{ my: 1.5 }} />
                        <Grid container spacing={1}>
                          <Grid item xs={4}>
                            <Typography variant="caption" color="text.secondary" display="block">Trips</Typography>
                            <Typography variant="body2" fontWeight={700}>{s.tripsCount}</Typography>
                          </Grid>
                          <Grid item xs={4}>
                            <Typography variant="caption" color="text.secondary" display="block">Total Distance</Typography>
                            <Typography variant="body2" fontWeight={700} color="primary.main">{s.totalKm.toFixed(1)} km</Typography>
                          </Grid>
                          <Grid item xs={4}>
                            <Typography variant="caption" color="text.secondary" display="block">Total Claim</Typography>
                            <Typography variant="body2" fontWeight={700} color="success.main">₹{s.totalCost.toFixed(0)}</Typography>
                          </Grid>
                        </Grid>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Right Column: Live Map & Detailed Route Inspector (5 cols) */}
        <Grid item xs={12} lg={5}>
          <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column', height: 460, mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h6" fontWeight={800} sx={{ fontSize: '1.05rem' }}>
                  {mapMode === 'fleet' ? 'Live GPS Fleet Map' : 'Route Inspection'}
                </Typography>
                {mapMode === 'fleet' && activeFleetMembers.length > 0 && (
                  <Chip label="● LIVE" color="success" size="small" sx={{ fontWeight: 800, height: 20, fontSize: '0.65rem' }} />
                )}
              </Box>

              <ButtonGroup size="small" variant="outlined">
                <Button
                  variant={mapMode === 'fleet' ? 'contained' : 'outlined'}
                  color="success"
                  startIcon={<BikeIcon />}
                  onClick={() => {
                    setMapMode('fleet');
                    setFocusedFleetMember(null);
                  }}
                  sx={{ textTransform: 'none', fontWeight: 700 }}
                >
                  Live Fleet ({activeFleetMembers.length})
                </Button>
                <Button
                  variant={mapMode === 'inspection' ? 'contained' : 'outlined'}
                  color="primary"
                  startIcon={<ViewIcon />}
                  onClick={() => setMapMode('inspection')}
                  disabled={!selectedTrip}
                  sx={{ textTransform: 'none', fontWeight: 700 }}
                >
                  Inspect Route
                </Button>
              </ButtonGroup>
            </Box>

            <Box className="admin-map-wrapper" sx={{ flex: 1, minHeight: 0, position: 'relative', width: '100%', borderRadius: 2, overflow: 'hidden' }}>
              <OlaMap
                center={defaultCenter}
                zoom={5}
                selectedTrip={mapMode === 'inspection' ? selectedTrip : null}
                fleetMembers={mapMode === 'fleet' ? activeFleetMembers : []}
                focusedFleetMember={focusedFleetMember}
                style={{ height: '100%', width: '100%' }}
              />
            </Box>
          </Paper>

          {/* Contextual Card: Active Fleet Cards OR Selected Trip Inspector */}
          {mapMode === 'fleet' ? (
            <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid #e0e0e0' }}>
              <Typography variant="subtitle2" fontWeight={800} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <BikeIcon color="success" fontSize="small" /> Active Salesmen on Road ({activeFleetMembers.length})
              </Typography>
              {activeFleetMembers.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No salesmen are currently travelling on an active trip. Markers appear instantly when a salesman begins a route.
                </Typography>
              ) : (
                <Stack spacing={1.2}>
                  {activeFleetMembers.map((member, i) => (
                    <Card
                      key={member.id || i}
                      variant="outlined"
                      sx={{
                        p: 1.2,
                        borderRadius: 2,
                        borderColor: focusedFleetMember?.id === member.id ? member.color : '#e0e0e0',
                        bgcolor: focusedFleetMember?.id === member.id ? 'rgba(0, 200, 83, 0.06)' : '#fff',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                      onClick={() => setFocusedFleetMember(member)}
                    >
                      <Box display="flex" alignItems="center" justifyContent="space-between">
                        <Box display="flex" alignItems="center" gap={1.2}>
                          <Avatar sx={{ bgcolor: member.color, width: 28, height: 28, fontSize: '0.75rem', fontWeight: 700 }}>
                            {member.salesman ? member.salesman.charAt(0).toUpperCase() : 'S'}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={700}>
                              {member.salesman}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block" noWrap sx={{ maxWidth: 200 }}>
                              To: {member.endLocation?.name || member.to || 'On Duty'}
                            </Typography>
                          </Box>
                        </Box>
                        <Box textAlign="right">
                          <Typography variant="body2" fontWeight={700} color="primary.main">
                            {Number(member.distance || 0).toFixed(1)} km
                          </Typography>
                          <Tooltip title="Focus on map">
                            <IconButton size="small" color="primary">
                              <FocusIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                    </Card>
                  ))}
                </Stack>
              )}
            </Paper>
          ) : (
            <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid #e0e0e0' }}>
              <Typography variant="subtitle2" fontWeight={800} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <RouteIcon color="primary" fontSize="small" /> Inspected Trip Breakdown
              </Typography>
              {selectedTrip ? (
                <Box>
                  <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Salesman</Typography>
                      <Typography variant="body2" fontWeight={700}>{selectedTrip.salesman}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Status</Typography>
                      <Box>
                        <Chip
                          label={selectedTrip.status}
                          color={selectedTrip.status === 'Completed' ? 'success' : 'warning'}
                          size="small"
                          sx={{ fontWeight: 700, height: 20, fontSize: '0.7rem' }}
                        />
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Recorded Mileage</Typography>
                      <Typography variant="body2" fontWeight={700} color="primary.main">
                        {Number(selectedTrip.distance || 0).toFixed(2)} km
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Reimbursement</Typography>
                      <Typography variant="body2" fontWeight={700} color="success.main">
                        ₹{Number(selectedTrip.cost || 0).toFixed(2)}
                      </Typography>
                    </Grid>
                  </Grid>

                  <Divider sx={{ my: 1 }} />

                  <Box sx={{ fontSize: '0.82rem' }}>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      📍 <strong>Origin:</strong> {selectedTrip.startLocation?.name || selectedTrip.from || 'Start Point'}
                    </Typography>
                    <Typography variant="body2">
                      🏁 <strong>Destination:</strong> {selectedTrip.endLocation?.name || selectedTrip.to || 'End Point'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                      🕒 Started: {new Date(selectedTrip.startTime).toLocaleString()}
                    </Typography>
                  </Box>
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Click on any trip in the table on the left to inspect its complete route and GPS waypoints.
                </Typography>
              )}
            </Paper>
          )}
        </Grid>
      </Grid>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} sx={{ fontWeight: 600 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Dynamic Rate & Allowance Settings Dialog */}
      <AdminSettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </Container>
  );
};

export default AdminDashboard;