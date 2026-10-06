// src/pages/Admin/VisitsPage.js
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  MenuItem,
  CircularProgress,
  Alert,
  Tooltip,
  Card,
  CardContent,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import EventNoteIcon from '@mui/icons-material/EventNote';
import PersonIcon from '@mui/icons-material/Person';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import VerifiedIcon from '@mui/icons-material/Verified';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import DrawIcon from '@mui/icons-material/Draw';
import VisibilityIcon from '@mui/icons-material/Visibility';

import VisitProofViewerDialog from '../../components/Visits/VisitProofViewerDialog';
import {
  getVisits,
  addVisit,
  editVisit,
  removeVisit,
  selectAllVisits,
  selectVisitStatus,
  selectVisitError,
} from '../../features/visits/visitSlice';
import { selectAllCustomers, getCustomers } from '../../features/customers/customerSlice';
import {
  ALL_VISIT_STATUSES,
  ALL_VISIT_PRIORITIES,
  ALL_MEETING_TYPES,
  VISIT_STATUSES,
} from '../../constants/salesConstants';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase';


const initialFormData = {
  customerId: '',
  assignedTo: '',
  scheduledDate: new Date().toISOString().split('T')[0],
  scheduledTime: '10:00',
  priority: 'Medium',
  meetingType: 'In-Person',
  agenda: '',
};

const VisitsPage = () => {
  const dispatch = useDispatch();
  const visits = useSelector(selectAllVisits);
  const customers = useSelector(selectAllCustomers);
  const status = useSelector(selectVisitStatus);
  const error = useSelector(selectVisitError);

  const [salesmen, setSalesmen] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedSalesman, setSelectedSalesman] = useState('ALL');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const [formError, setFormError] = useState('');

  // Delete Confirm Dialog
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [visitToDelete, setVisitToDelete] = useState(null);

  // Proof Viewer Dialog
  const [proofViewerOpen, setProofViewerOpen] = useState(false);
  const [selectedVisitForProof, setSelectedVisitForProof] = useState(null);

  const handleOpenProof = (visit) => {
    setSelectedVisitForProof(visit);
    setProofViewerOpen(true);
  };


  useEffect(() => {
    dispatch(getVisits());
    dispatch(getCustomers());

    // Fetch list of salesmen for dropdown
    const fetchSalesmen = async () => {
      try {
        const q = query(collection(db, 'users'), where('role', '==', 'salesman'));
        const snap = await getDocs(q);
        const list = snap.docs.map((d) => ({
          uid: d.id,
          name: d.data().displayName || d.data().name || d.data().email?.split('@')[0] || 'Salesman',
          email: d.data().email,
        }));
        setSalesmen(list);
      } catch (err) {
        console.error('Error fetching salesmen:', err);
      }
    };
    fetchSalesmen();
  }, [dispatch]);

  const handleOpenAdd = () => {
    setIsEditing(false);
    setCurrentId(null);
    setFormData(initialFormData);
    setFormError('');
    setDialogOpen(true);
  };

  const handleOpenEdit = (visit) => {
    setIsEditing(true);
    setCurrentId(visit.id);
    setFormData({
      customerId: visit.customerId || '',
      assignedTo: visit.assignedTo || '',
      scheduledDate: visit.scheduledDate || new Date().toISOString().split('T')[0],
      scheduledTime: visit.scheduledTime || '10:00',
      priority: visit.priority || 'Medium',
      meetingType: visit.meetingType || 'In-Person',
      agenda: visit.agenda || '',
    });
    setFormError('');
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setFormData(initialFormData);
    setFormError('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.customerId) {
      setFormError('Please select a healthcare facility/customer.');
      return;
    }
    if (!formData.assignedTo) {
      setFormError('Please assign a salesman.');
      return;
    }

    const selectedCustomer = customers.find((c) => c.id === formData.customerId);
    const selectedSalesmanObj = salesmen.find((s) => s.uid === formData.assignedTo);

    const payload = {
      ...formData,
      customerName: selectedCustomer ? selectedCustomer.name : 'Unknown Customer',
      customerAddress: selectedCustomer ? selectedCustomer.address || selectedCustomer.city : '',
      customerContact: selectedCustomer ? selectedCustomer.contactPerson : '',
      salesmanName: selectedSalesmanObj ? selectedSalesmanObj.name : 'Unknown Salesman',
      salesmanEmail: selectedSalesmanObj ? selectedSalesmanObj.email : '',
      status: isEditing ? undefined : VISIT_STATUSES.ASSIGNED,
    };

    try {
      if (isEditing && currentId) {
        await dispatch(editVisit({ id: currentId, updates: payload })).unwrap();
      } else {
        await dispatch(addVisit(payload)).unwrap();
      }
      handleCloseDialog();
    } catch (err) {
      setFormError(err || 'Failed to save visit');
    }
  };

  const handleDeletePrompt = (visit) => {
    setVisitToDelete(visit);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (visitToDelete) {
      await dispatch(removeVisit(visitToDelete.id));
      setDeleteConfirmOpen(false);
      setVisitToDelete(null);
    }
  };

  const filteredVisits = visits.filter((v) => {
    const matchesSearch =
      (v.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.salesmanName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.agenda || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'ALL' || v.status === selectedStatus;
    const matchesSalesman = selectedSalesman === 'ALL' || v.assignedTo === selectedSalesman;
    return matchesSearch && matchesStatus && matchesSalesman;
  });

  const getStatusChipColor = (st) => {
    switch (st) {
      case 'Completed':
        return 'success';
      case 'In Progress':
        return 'warning';
      case 'Assigned':
      case 'Planned':
        return 'primary';
      case 'Cancelled':
      case 'Unable to Meet':
        return 'error';
      default:
        return 'default';
    }
  };

  const getPriorityChip = (priority) => {
    let color = 'default';
    if (priority === 'Urgent') color = 'error';
    else if (priority === 'High') color = 'warning';
    else if (priority === 'Medium') color = 'info';
    return (
      <Chip
        label={priority || 'Normal'}
        color={color}
        size="small"
        variant="outlined"
        sx={{ fontWeight: 600, fontSize: '0.75rem' }}
      />
    );
  };

  // KPI Metrics
  const totalVisitsCount = visits.length;
  const completedVisitsCount = visits.filter((v) => v.status === 'Completed').length;
  const inProgressCount = visits.filter((v) => v.status === 'In Progress').length;
  const pendingCount = visits.filter((v) => ['Planned', 'Assigned'].includes(v.status)).length;

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} color="primary">
            Field Visits & Appointments
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Schedule, assign, and track hospital visits, doctor meetings, and live check-in outcomes.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenAdd}
          sx={{ borderRadius: 2, px: 3, py: 1, textTransform: 'none', fontWeight: 600 }}
        >
          Schedule & Assign Visit
        </Button>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={1} sx={{ borderRadius: 2, borderLeft: '4px solid #1976d2' }}>
            <CardContent sx={{ py: 2 }}>
              <Typography variant="body2" color="text.secondary">Total Planned Visits</Typography>
              <Typography variant="h5" fontWeight={700} color="primary.main">{totalVisitsCount}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={1} sx={{ borderRadius: 2, borderLeft: '4px solid #2e7d32' }}>
            <CardContent sx={{ py: 2 }}>
              <Typography variant="body2" color="text.secondary">Completed Visits</Typography>
              <Typography variant="h5" fontWeight={700} color="success.main">{completedVisitsCount}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={1} sx={{ borderRadius: 2, borderLeft: '4px solid #ed6c02' }}>
            <CardContent sx={{ py: 2 }}>
              <Typography variant="body2" color="text.secondary">In Progress / Checked-In</Typography>
              <Typography variant="h5" fontWeight={700} color="warning.main">{inProgressCount}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={1} sx={{ borderRadius: 2, borderLeft: '4px solid #0288d1' }}>
            <CardContent sx={{ py: 2 }}>
              <Typography variant="body2" color="text.secondary">Pending / Assigned</Typography>
              <Typography variant="h5" fontWeight={700} color="info.main">{pendingCount}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filter Bar */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }} elevation={1}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={5}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search by hospital, doctor, salesman or agenda..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              select
              fullWidth
              size="small"
              label="Status Filter"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <MenuItem value="ALL">All Statuses</MenuItem>
              {ALL_VISIT_STATUSES.map((st) => (
                <MenuItem key={st} value={st}>
                  {st}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              select
              fullWidth
              size="small"
              label="Salesman Filter"
              value={selectedSalesman}
              onChange={(e) => setSelectedSalesman(e.target.value)}
            >
              <MenuItem value="ALL">All Sales Representatives</MenuItem>
              {salesmen.map((s) => (
                <MenuItem key={s.uid} value={s.uid}>
                  {s.name} ({s.email})
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>
      </Paper>

      {/* Error display */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Visits Table */}
      <Paper sx={{ borderRadius: 2, overflow: 'hidden' }} elevation={1}>
        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: 'grey.50' }}>
              <TableRow>
                <TableCell fontWeight={700}>Hospital / Customer</TableCell>
                <TableCell fontWeight={700}>Assigned Salesman</TableCell>
                <TableCell fontWeight={700}>Scheduled For</TableCell>
                <TableCell fontWeight={700}>Priority & Type</TableCell>
                <TableCell fontWeight={700}>Status & Outcome</TableCell>
                <TableCell align="right" fontWeight={700}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {status === 'loading' && visits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={36} />
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Loading visits...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : filteredVisits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <EventNoteIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                    <Typography variant="subtitle1" color="text.secondary">
                      No visits found.
                    </Typography>
                    <Button variant="text" startIcon={<AddIcon />} onClick={handleOpenAdd} sx={{ mt: 1 }}>
                      Schedule a new visit
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                filteredVisits
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((visit) => (
                    <TableRow key={visit.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                          <LocalHospitalIcon color="primary" sx={{ mt: 0.3 }} />
                          <Box>
                            <Typography variant="subtitle2" fontWeight={600}>
                              {visit.customerName}
                            </Typography>
                            {visit.customerAddress && (
                              <Typography variant="caption" color="text.secondary" display="block">
                                {visit.customerAddress}
                              </Typography>
                            )}
                            {visit.agenda && (
                              <Typography variant="caption" color="text.primary" sx={{ fontStyle: 'italic', display: 'block' }}>
                                Obj: {visit.agenda}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <PersonIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                          <Typography variant="body2" fontWeight={500}>
                            {visit.salesmanName || 'Unassigned'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {visit.scheduledDate || '—'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {visit.scheduledTime || ''}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'flex-start' }}>
                          {getPriorityChip(visit.priority)}
                          <Typography variant="caption" color="text.secondary">
                            {visit.meetingType || 'In-Person'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'flex-start' }}>
                          <Chip
                            label={visit.status}
                            color={getStatusChipColor(visit.status)}
                            size="small"
                            sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                          />
                          {visit.isGeofenceVerified && (
                            <Chip
                              icon={<VerifiedIcon fontSize="small" />}
                              label={`GPS Verified (±${visit.gpsDiscrepancyMeters ?? 0}m)`}
                              color="success"
                              size="small"
                              onClick={() => handleOpenProof(visit)}
                              sx={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.7rem' }}
                            />
                          )}
                          {visit.gpsDiscrepancyMeters > 0 && !visit.isGeofenceVerified && (
                            <Chip
                              icon={<WarningAmberIcon fontSize="small" />}
                              label={`Off-site (${visit.gpsDiscrepancyMeters}m)`}
                              color="warning"
                              size="small"
                              onClick={() => handleOpenProof(visit)}
                              sx={{ cursor: 'pointer', fontSize: '0.7rem' }}
                            />
                          )}
                          <Box display="flex" gap={0.5} mt={0.3} flexWrap="wrap">
                            {visit.photoProof && (
                              <Chip
                                icon={<PhotoCameraIcon fontSize="small" />}
                                label="Photo"
                                color="info"
                                size="small"
                                variant="outlined"
                                onClick={() => handleOpenProof(visit)}
                                sx={{ cursor: 'pointer', fontSize: '0.65rem', height: 20 }}
                              />
                            )}
                            {visit.signatureProof && (
                              <Chip
                                icon={<DrawIcon fontSize="small" />}
                                label="Signed"
                                color="secondary"
                                size="small"
                                variant="outlined"
                                onClick={() => handleOpenProof(visit)}
                                sx={{ cursor: 'pointer', fontSize: '0.65rem', height: 20 }}
                              />
                            )}
                          </Box>
                          {visit.outcome && (
                            <Typography variant="caption" fontWeight={600} color="primary.main">
                              Outcome: {visit.outcome}
                            </Typography>
                          )}
                          {visit.checkInTime && !visit.completedAt && (
                            <Typography variant="caption" color="warning.main">
                              Checked-in: {new Date(visit.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        {(visit.photoProof || visit.signatureProof || visit.isGeofenceVerified || visit.notes) && (
                          <Tooltip title="View Verification Proofs">
                            <IconButton size="small" color="info" onClick={() => handleOpenProof(visit)}>
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Edit Visit">
                          <IconButton size="small" color="primary" onClick={() => handleOpenEdit(visit)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Visit">
                          <IconButton size="small" color="error" onClick={() => handleDeletePrompt(visit)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>

                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredVisits.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </Paper>

      {/* Schedule / Edit Visit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle fontWeight={700}>
          {isEditing ? 'Edit Visit Details' : 'Schedule & Assign Healthcare Visit'}
        </DialogTitle>
        <form onSubmit={handleSave}>
          <DialogContent dividers>
            {formError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {formError}
              </Alert>
            )}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  required
                  label="Select Healthcare Facility / Customer"
                  value={formData.customerId}
                  onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                >
                  {customers.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name} ({c.type || 'Hospital'}) - {c.city || c.address}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  required
                  label="Assign Field Salesman"
                  value={formData.assignedTo}
                  onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                >
                  {salesmen.map((s) => (
                    <MenuItem key={s.uid} value={s.uid}>
                      {s.name} ({s.email})
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  required
                  type="date"
                  label="Scheduled Date"
                  InputLabelProps={{ shrink: true }}
                  value={formData.scheduledDate}
                  onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  required
                  type="time"
                  label="Scheduled Time"
                  InputLabelProps={{ shrink: true }}
                  value={formData.scheduledTime}
                  onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  select
                  fullWidth
                  label="Priority"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                >
                  {ALL_VISIT_PRIORITIES.map((p) => (
                    <MenuItem key={p} value={p}>
                      {p}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  label="Meeting Type"
                  value={formData.meetingType}
                  onChange={(e) => setFormData({ ...formData, meetingType: e.target.value })}
                >
                  {ALL_MEETING_TYPES.map((m) => (
                    <MenuItem key={m} value={m}>
                      {m}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Agenda / Objective"
                  placeholder="e.g. Present Medagg care custodian equipment catalogue"
                  value={formData.agenda}
                  onChange={(e) => setFormData({ ...formData, agenda: e.target.value })}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={handleCloseDialog} color="inherit">
              Cancel
            </Button>
            <Button type="submit" variant="contained" color="primary">
              {isEditing ? 'Save Changes' : 'Schedule Visit'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle fontWeight={700}>Confirm Visit Deletion</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the visit to <strong>{visitToDelete?.customerName}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDeleteConfirmOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleConfirmDelete} variant="contained" color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Visit Proofs Lightbox Viewer */}
      <VisitProofViewerDialog
        open={proofViewerOpen}
        onClose={() => {
          setProofViewerOpen(false);
          setSelectedVisitForProof(null);
        }}
        visit={selectedVisitForProof}
      />
    </Box>
  );
};

export default VisitsPage;

