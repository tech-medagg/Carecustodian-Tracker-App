// src/pages/Admin/ReportsPage.js
// Field Sales Analytics, Mileage Reimbursement & Expense Claim Hub

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Chip,
  CircularProgress,
  TextField,
  MenuItem,
  Stack,
} from '@mui/material';

import DownloadIcon from '@mui/icons-material/Download';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableViewIcon from '@mui/icons-material/TableView';
import SettingsIcon from '@mui/icons-material/Settings';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import VerifiedIcon from '@mui/icons-material/Verified';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import PaymentsIcon from '@mui/icons-material/Payments';

import { getVisits, selectAllVisits } from '../../features/visits/visitSlice';
import { getCustomers, selectAllCustomers } from '../../features/customers/customerSlice';
import { getLeads, selectAllLeads } from '../../features/leads/leadSlice';
import {
  getSettings,
  selectCurrentSettings,
  selectCostPerKm,
} from '../../features/settings/settingsSlice';
import {
  computeSalesVsTravelMetrics,
  computeCategoryYield,
} from '../../features/analytics/analyticsService';
import {
  exportMileageExcel,
  exportMileagePdf,
} from '../../services/exportService';
import AdminSettingsDialog from '../../components/Settings/AdminSettingsDialog';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase';

// Safe Date Helpers
const parseToDate = (val) => {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val?.toDate === 'function') return val.toDate();
  if (typeof val === 'object' && val.seconds !== undefined) return new Date(val.seconds * 1000);
  const parsed = new Date(val);
  return isNaN(parsed.getTime()) ? null : parsed;
};

const ReportsPage = () => {
  const dispatch = useDispatch();
  const visits = useSelector(selectAllVisits);
  const customers = useSelector(selectAllCustomers);
  const leads = useSelector(selectAllLeads);
  const settings = useSelector(selectCurrentSettings);
  const costPerKm = useSelector(selectCostPerKm) || 3;

  const [salesmen, setSalesmen] = useState([]);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [dateFilter, setDateFilter] = useState('THIS_MONTH'); // ALL, TODAY, THIS_WEEK, THIS_MONTH, LAST_MONTH
  const [selectedSalesmanId, setSelectedSalesmanId] = useState('ALL');

  // Settings Dialog State
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);
      dispatch(getVisits());
      dispatch(getCustomers());
      dispatch(getLeads());
      dispatch(getSettings());

      try {
        // Fetch salesmen users
        const qUsers = query(collection(db, 'users'), where('role', '==', 'salesman'));
        const usersSnap = await getDocs(qUsers);
        const salesmenList = usersSnap.docs.map((d) => ({
          uid: d.id,
          name: d.data().displayName || d.data().name || d.data().email?.split('@')[0] || 'Salesman',
          email: d.data().email,
          phone: d.data().phone || '',
        }));
        setSalesmen(salesmenList);

        // Fetch all trips
        const qTrips = query(collection(db, 'trips'));
        const tripsSnap = await getDocs(qTrips);
        const tripsList = tripsSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setTrips(tripsList);
      } catch (err) {
        console.error('Error loading report dependencies:', err);
      } finally {
        setLoading(false);
      }
    };

    loadAllData();
  }, [dispatch]);

  // Date Filter Helpers
  const filterByDate = (dateVal) => {
    if (!dateVal) return true;
    if (dateFilter === 'ALL') return true;

    const itemDate = parseToDate(dateVal);
    if (!itemDate) return true;

    const now = new Date();
    const todayKey = now.toISOString().split('T')[0];
    const itemKey = itemDate.toISOString().split('T')[0];

    if (dateFilter === 'TODAY') {
      return itemKey === todayKey;
    }

    if (dateFilter === 'THIS_WEEK') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      return itemDate >= startOfWeek;
    }

    if (dateFilter === 'THIS_MONTH') {
      return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
    }

    if (dateFilter === 'LAST_MONTH') {
      const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      return itemDate.getMonth() === prevMonth && itemDate.getFullYear() === prevYear;
    }

    return true;
  };

  // Filtered Datasets
  const filteredTrips = trips.filter((t) => {
    const matchDate = filterByDate(t.startTime || t.createdAt);
    const matchSalesman = selectedSalesmanId === 'ALL' || t.userId === selectedSalesmanId || t.salesmanId === selectedSalesmanId;
    return matchDate && matchSalesman;
  });

  const filteredVisits = visits.filter((v) => {
    const matchDate = filterByDate(v.scheduledDate || v.createdAt);
    const matchSalesman = selectedSalesmanId === 'ALL' || v.assignedTo === selectedSalesmanId || v.salesmanId === selectedSalesmanId;
    return matchDate && matchSalesman;
  });

  const filteredSalesmen = selectedSalesmanId === 'ALL'
    ? salesmen
    : salesmen.filter((s) => s.uid === selectedSalesmanId);

  // Calculations
  const salesmanMetrics = computeSalesVsTravelMetrics(
    filteredSalesmen,
    filteredVisits,
    filteredTrips,
    leads,
    costPerKm
  );
  salesmanMetrics.sort((a, b) => b.productivityScore - a.productivityScore);

  const categoryYield = computeCategoryYield(customers, filteredVisits, leads);

  // Key KPI Totals
  const totalPlannedVisits = filteredVisits.length;
  const totalCompletedVisits = filteredVisits.filter((v) => v.status === 'Completed').length;
  const totalVerifiedVisits = filteredVisits.filter((v) => v.isGeofenceVerified).length;
  const totalDistanceKm = filteredTrips.reduce((sum, t) => sum + (Number(t.distance) || 0), 0);
  const totalTravelCost = filteredTrips.reduce((sum, t) => sum + (Number(t.cost) || Math.round((Number(t.distance) || 0) * (t.ratePerKm || costPerKm))), 0);
  const totalReimbursementClaim = totalTravelCost;

  const totalPipelineValue = leads.reduce((sum, l) => sum + (Number(l.expectedValue) || 0), 0);
  const avgCostPerCompletedVisit = totalCompletedVisits > 0 ? Math.round(totalReimbursementClaim / totalCompletedVisits) : 0;

  const dateFilterLabels = {
    ALL: 'All Time',
    TODAY: 'Today',
    THIS_WEEK: 'This Week',
    THIS_MONTH: 'This Month',
    LAST_MONTH: 'Last Month',
  };

  // Export Handlers
  const handleExportExcel = () => {
    exportMileageExcel({
      trips: filteredTrips,
      visits: filteredVisits,
      salesmen: filteredSalesmen,
      settings: settings,
      filterLabel: dateFilterLabels[dateFilter],
    });
  };

  const handleExportPdf = () => {
    const selectedObj = salesmen.find((s) => s.uid === selectedSalesmanId);
    exportMileagePdf({
      trips: filteredTrips,
      visits: filteredVisits,
      salesmen: filteredSalesmen,
      settings: settings,
      selectedSalesmanName: selectedObj ? selectedObj.name : null,
      dateRangeLabel: dateFilterLabels[dateFilter],
    });
  };

  const handleExportCsvLegacy = () => {
    const headers = [
      'Rank',
      'Sales Representative',
      'Email',
      'Phone',
      'Planned Visits',
      'Completed Visits',
      'Completion Rate (%)',
      'Total Distance (km)',
      'Reimbursement Rate (INR/km)',
      'Total Reimbursement (INR)',
      'Cost per Visit (INR)',
      'Leads Generated',
      'Productivity Score (0-100)',
    ];

    const rows = salesmanMetrics.map((m, idx) => [
      idx + 1,
      `"${m.name}"`,
      `"${m.email}"`,
      `"${m.phone}"`,
      m.totalVisits,
      m.completedVisits,
      `${m.completionRate}%`,
      m.totalDistanceKm,
      costPerKm,
      m.travelCost,
      m.costPerVisit,
      m.leadsCount,
      m.productivityScore,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `medagg_sales_claim_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'success';
    if (score >= 50) return 'primary';
    if (score >= 30) return 'warning';
    return 'error';
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      {/* Header Bar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} color="primary">
            Field Mileage & Reimbursement Hub
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Automated reimbursement calculation (@ ₹{costPerKm}/km), GPS audit, and downloadable claim invoices.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5} flexWrap="wrap">
          <Button
            variant="outlined"
            color="primary"
            startIcon={<SettingsIcon />}
            onClick={() => setSettingsOpen(true)}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
          >
            Configure Mileage Rate (₹/km)
          </Button>
          <Button
            variant="contained"
            color="success"
            startIcon={<TableViewIcon />}
            onClick={handleExportExcel}
            disabled={filteredTrips.length === 0}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
          >
            Download Excel (.xlsx)
          </Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<PictureAsPdfIcon />}
            onClick={handleExportPdf}
            disabled={filteredTrips.length === 0}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
          >
            Generate PDF Claim Sheet
          </Button>
        </Stack>
      </Box>

      {/* Filter Toolbar */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }} elevation={1}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              select
              fullWidth
              size="small"
              label="Period / Date Filter"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            >
              <MenuItem value="ALL">All Time</MenuItem>
              <MenuItem value="TODAY">Today</MenuItem>
              <MenuItem value="THIS_WEEK">This Week</MenuItem>
              <MenuItem value="THIS_MONTH">This Month</MenuItem>
              <MenuItem value="LAST_MONTH">Last Month</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              select
              fullWidth
              size="small"
              label="Filter by Sales Representative"
              value={selectedSalesmanId}
              onChange={(e) => setSelectedSalesmanId(e.target.value)}
            >
              <MenuItem value="ALL">All Sales Representatives ({salesmen.length})</MenuItem>
              {salesmen.map((s) => (
                <MenuItem key={s.uid} value={s.uid}>
                  {s.name} ({s.email})
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={5}>
            <Box display="flex" justifyContent={{ xs: 'flex-start', md: 'flex-end' }} gap={1}>
              <Button
                size="small"
                variant="text"
                startIcon={<DownloadIcon />}
                onClick={handleExportCsvLegacy}
              >
                Export CSV
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Top Level Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={1} sx={{ borderRadius: 2, borderLeft: '4px solid #1976d2' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">Total Distance Logged</Typography>
                <DirectionsCarIcon color="primary" />
              </Box>
              <Typography variant="h4" fontWeight={700} sx={{ mt: 1 }}>
                {totalDistanceKm.toFixed(1)} <Typography component="span" variant="body1">km</Typography>
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {filteredTrips.length} completed GPS routes
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={1} sx={{ borderRadius: 2, borderLeft: '4px solid #10b981' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">Total Reimbursement</Typography>
                <PaymentsIcon color="success" />
              </Box>
              <Typography variant="h4" fontWeight={700} color="success.dark" sx={{ mt: 1 }}>
                ₹{Math.round(totalReimbursementClaim).toLocaleString('en-IN')}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Calculated strictly @ ₹{costPerKm}/km ({filteredTrips.length} trips)
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={1} sx={{ borderRadius: 2, borderLeft: '4px solid #0288d1' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">GPS Verified Visits</Typography>
                <VerifiedIcon color="info" />
              </Box>
              <Typography variant="h4" fontWeight={700} color="info.main" sx={{ mt: 1 }}>
                {totalVerifiedVisits} <Typography component="span" variant="body2" color="text.secondary">/ {totalCompletedVisits} completed ({totalPlannedVisits} planned)</Typography>
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {totalCompletedVisits > 0 ? `${Math.round((totalVerifiedVisits / totalCompletedVisits) * 100)}% verified with photo/GPS` : '0%'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={1} sx={{ borderRadius: 2, borderLeft: '4px solid #9c27b0' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">Pipeline Value Generated</Typography>
                <TrendingUpIcon color="secondary" />
              </Box>
              <Typography variant="h4" fontWeight={700} color="secondary.main" sx={{ mt: 1 }}>
                ₹{totalPipelineValue.toLocaleString('en-IN')}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Avg Reimbursement per Visit: ₹{avgCostPerCompletedVisit}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Sales Representative Performance & Reimbursement Table */}
      <Paper sx={{ p: 3, mb: 4, borderRadius: 2 }} elevation={1}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Sales Representative Performance & Reimbursement Summary
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Productivity ranking and itemized mileage payout (@ ₹{costPerKm}/km) for {dateFilterLabels[dateFilter]}.
            </Typography>
          </Box>
        </Box>

        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: 'grey.50' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Rank & Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Visits (Done / Planned)</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Completion Rate</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Distance (Km)</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Reimbursement Rate</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Total Reimbursement (₹)</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Leads</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Productivity Score</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={36} />
                  </TableCell>
                </TableRow>
              ) : salesmanMetrics.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">No activity logged for this period/filter.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                salesmanMetrics.map((sm, index) => (
                  <TableRow key={sm.salesmanId} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        {index === 0 && <EmojiEventsIcon sx={{ color: '#f59e0b' }} />}
                        {index === 1 && <EmojiEventsIcon sx={{ color: '#94a3b8' }} />}
                        {index === 2 && <EmojiEventsIcon sx={{ color: '#b45309' }} />}
                        {index > 2 && (
                          <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ width: 24, textAlign: 'center' }}>
                            #{index + 1}
                          </Typography>
                        )}
                        <Box>
                          <Typography variant="subtitle2" fontWeight={700}>
                            {sm.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {sm.email}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" fontWeight={600}>
                        {sm.completedVisits} / {sm.totalVisits}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
                        <Box sx={{ width: 60 }}>
                          <LinearProgress
                            variant="determinate"
                            value={sm.completionRate}
                            color={sm.completionRate >= 70 ? 'success' : sm.completionRate >= 40 ? 'primary' : 'warning'}
                            sx={{ height: 6, borderRadius: 3 }}
                          />
                        </Box>
                        <Typography variant="caption" fontWeight={600}>
                          {sm.completionRate}%
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">{sm.totalDistanceKm} km</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">₹{costPerKm}/km</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={700} color="success.main">
                        ₹{sm.travelCost.toLocaleString('en-IN')}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip label={sm.leadsCount} size="small" color={sm.leadsCount > 0 ? 'secondary' : 'default'} />
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={`${sm.productivityScore} / 100`}
                        color={getScoreColor(sm.productivityScore)}
                        size="small"
                        sx={{ fontWeight: 700 }}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Hospital Category Conversion Yield */}
      <Paper sx={{ p: 3, borderRadius: 2 }} elevation={1}>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
          Healthcare Facility Category Conversion Yield
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Analysis of visit success and lead conversion across Hospitals, Clinics, Diagnostic Labs, and Pharmacies.
        </Typography>

        <Grid container spacing={2}>
          {categoryYield.map((cat) => (
            <Grid item xs={12} sm={6} md={2.4} key={cat.category}>
              <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <LocalHospitalIcon color="primary" fontSize="small" />
                    <Typography variant="subtitle2" fontWeight={700}>
                      {cat.category}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Clients in DB: <strong>{cat.customerCount}</strong>
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Completed Visits: <strong>{cat.completedVisits} / {cat.totalVisits}</strong>
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Leads Generated: <strong>{cat.leadsCount}</strong>
                  </Typography>
                  <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid #f1f5f9' }}>
                    <Typography variant="caption" color="text.secondary">Pipeline Value:</Typography>
                    <Typography variant="body2" fontWeight={700} color="primary.main">
                      ₹{cat.leadValue.toLocaleString('en-IN')}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Dynamic Rate Settings Dialog */}
      <AdminSettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </Box>
  );
};

export default ReportsPage;
