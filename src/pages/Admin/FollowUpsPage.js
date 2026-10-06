// src/pages/Admin/FollowUpsPage.js
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
  Tabs,
  Tab,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ScheduleIcon from '@mui/icons-material/Schedule';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import PersonIcon from '@mui/icons-material/Person';
import DoneAllIcon from '@mui/icons-material/DoneAll';

import {
  getFollowUps,
  addFollowUp,
  markFollowUpDone,
  changeFollowUpDate,
  removeFollowUp,
  selectAllFollowUps,
  selectFollowUpStatus,
  selectFollowUpError,
} from '../../features/followUps/followUpSlice';
import { selectAllCustomers, getCustomers } from '../../features/customers/customerSlice';
import { ALL_FOLLOW_UP_TYPES, ALL_VISIT_PRIORITIES } from '../../constants/salesConstants';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase';

const initialFormData = {
  customerId: '',
  salesmanId: '',
  dueDate: new Date().toISOString().split('T')[0],
  dueTime: '11:00',
  type: 'Phone Call',
  priority: 'Medium',
  notes: '',
};

const FollowUpsPage = () => {
  const dispatch = useDispatch();
  const followUps = useSelector(selectAllFollowUps);
  const customers = useSelector(selectAllCustomers);
  const status = useSelector(selectFollowUpStatus);
  const error = useSelector(selectFollowUpError);

  const [salesmen, setSalesmen] = useState([]);
  const [tabIndex, setTabIndex] = useState(0); // 0: Pending, 1: Overdue, 2: Completed, 3: All
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Dialog State (Create)
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [formError, setFormError] = useState('');

  // Reschedule Dialog State
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [itemToReschedule, setItemToReschedule] = useState(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('11:00');
  const [rescheduleReason, setRescheduleReason] = useState('');

  // Complete Dialog State
  const [completeOpen, setCompleteOpen] = useState(false);
  const [itemToComplete, setItemToComplete] = useState(null);
  const [completionNote, setCompletionNote] = useState('');

  // Delete Dialog State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  useEffect(() => {
    dispatch(getFollowUps());
    dispatch(getCustomers());

    // Fetch salesmen
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
    setFormData(initialFormData);
    setFormError('');
    setDialogOpen(true);
  };

  const handleSaveAdd = async (e) => {
    e.preventDefault();
    if (!formData.customerId) {
      setFormError('Please select a healthcare facility/customer.');
      return;
    }
    if (!formData.salesmanId) {
      setFormError('Please assign a sales representative.');
      return;
    }

    const selectedCustomer = customers.find((c) => c.id === formData.customerId);
    const selectedSalesmanObj = salesmen.find((s) => s.uid === formData.salesmanId);

    const payload = {
      ...formData,
      customerName: selectedCustomer ? selectedCustomer.name : 'Unknown Facility',
      customerPhone: selectedCustomer ? selectedCustomer.phone : '',
      salesmanName: selectedSalesmanObj ? selectedSalesmanObj.name : 'Unknown Salesman',
    };

    try {
      await dispatch(addFollowUp(payload)).unwrap();
      setDialogOpen(false);
    } catch (err) {
      setFormError(err || 'Failed to create follow-up');
    }
  };

  const handleOpenComplete = (item) => {
    setItemToComplete(item);
    setCompletionNote('');
    setCompleteOpen(true);
  };

  const handleConfirmComplete = async () => {
    if (itemToComplete) {
      await dispatch(markFollowUpDone({ id: itemToComplete.id, completionNote }));
      setCompleteOpen(false);
      setItemToComplete(null);
    }
  };

  const handleOpenReschedule = (item) => {
    setItemToReschedule(item);
    setNewDate(item.dueDate || new Date().toISOString().split('T')[0]);
    setNewTime(item.dueTime || '11:00');
    setRescheduleReason('');
    setRescheduleOpen(true);
  };

  const handleConfirmReschedule = async () => {
    if (itemToReschedule) {
      await dispatch(
        changeFollowUpDate({
          id: itemToReschedule.id,
          newDueDate: newDate,
          newDueTime: newTime,
          reason: rescheduleReason,
        })
      );
      setRescheduleOpen(false);
      setItemToReschedule(null);
    }
  };

  const handleDeletePrompt = (item) => {
    setItemToDelete(item);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (itemToDelete) {
      await dispatch(removeFollowUp(itemToDelete.id));
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const pendingList = followUps.filter((f) => f.status === 'Pending' && (f.dueDate >= todayStr || !f.dueDate));
  const overdueList = followUps.filter((f) => f.status === 'Pending' && f.dueDate && f.dueDate < todayStr);
  const completedList = followUps.filter((f) => f.status === 'Completed');

  let currentList = followUps;
  if (tabIndex === 0) currentList = pendingList;
  else if (tabIndex === 1) currentList = overdueList;
  else if (tabIndex === 2) currentList = completedList;

  const filteredList = currentList.filter((f) => {
    return (
      (f.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.salesmanName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.notes || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} color="primary">
            Follow-ups & Reminders Board
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Track sales commitments, proposal requests, doctor callbacks, and client follow-up deadlines.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenAdd}
          sx={{ borderRadius: 2, px: 3, py: 1, textTransform: 'none', fontWeight: 600 }}
        >
          Add Follow-up
        </Button>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={1} sx={{ borderRadius: 2, borderLeft: '4px solid #1976d2' }}>
            <CardContent sx={{ py: 2 }}>
              <Typography variant="body2" color="text.secondary">Total Follow-ups</Typography>
              <Typography variant="h5" fontWeight={700} color="primary.main">{followUps.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={1} sx={{ borderRadius: 2, borderLeft: '4px solid #ed6c02' }}>
            <CardContent sx={{ py: 2 }}>
              <Typography variant="body2" color="text.secondary">Pending Actions</Typography>
              <Typography variant="h5" fontWeight={700} color="warning.main">{pendingList.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={1} sx={{ borderRadius: 2, borderLeft: '4px solid #d32f2f' }}>
            <CardContent sx={{ py: 2 }}>
              <Typography variant="body2" color="text.secondary">Overdue Deadlines</Typography>
              <Typography variant="h5" fontWeight={700} color="error.main">{overdueList.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={1} sx={{ borderRadius: 2, borderLeft: '4px solid #2e7d32' }}>
            <CardContent sx={{ py: 2 }}>
              <Typography variant="body2" color="text.secondary">Completed</Typography>
              <Typography variant="h5" fontWeight={700} color="success.main">{completedList.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs & Search */}
      <Paper sx={{ mb: 3, borderRadius: 2 }} elevation={1}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
          <Tabs value={tabIndex} onChange={(e, val) => { setTabIndex(val); setPage(0); }}>
            <Tab label={`Pending (${pendingList.length})`} />
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  Overdue
                  {overdueList.length > 0 && (
                    <Chip label={overdueList.length} size="small" color="error" sx={{ height: 18, fontSize: '0.7rem' }} />
                  )}
                </Box>
              }
            />
            <Tab label={`Completed (${completedList.length})`} />
            <Tab label={`All (${followUps.length})`} />
          </Tabs>
        </Box>
        <Box sx={{ p: 2 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search by facility, salesman, or task notes..."
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
        </Box>
      </Paper>

      {/* Error alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Table */}
      <Paper sx={{ borderRadius: 2, overflow: 'hidden' }} elevation={1}>
        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: 'grey.50' }}>
              <TableRow>
                <TableCell fontWeight={700}>Healthcare Facility</TableCell>
                <TableCell fontWeight={700}>Sales Representative</TableCell>
                <TableCell fontWeight={700}>Due Date & Time</TableCell>
                <TableCell fontWeight={700}>Follow-up Type & Priority</TableCell>
                <TableCell fontWeight={700}>Notes & Details</TableCell>
                <TableCell align="right" fontWeight={700}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {status === 'loading' && followUps.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={36} />
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Loading follow-ups...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : filteredList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <DoneAllIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                    <Typography variant="subtitle1" color="text.secondary">
                      No follow-ups found in this view.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredList
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((item) => {
                    const isOverdue = item.status === 'Pending' && item.dueDate && item.dueDate < todayStr;
                    const isToday = item.status === 'Pending' && item.dueDate === todayStr;

                    return (
                      <TableRow key={item.id} hover sx={{ bgcolor: isOverdue ? 'rgba(211, 47, 47, 0.03)' : 'inherit' }}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LocalHospitalIcon color="primary" />
                            <Box>
                              <Typography variant="subtitle2" fontWeight={600}>
                                {item.customerName}
                              </Typography>
                              {item.customerPhone && (
                                <Typography variant="caption" color="text.secondary">
                                  {item.customerPhone}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <PersonIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                            <Typography variant="body2">{item.salesmanName || 'Unassigned'}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {isOverdue && <WarningAmberIcon color="error" sx={{ fontSize: 18 }} />}
                            <Typography
                              variant="body2"
                              fontWeight={600}
                              color={isOverdue ? 'error.main' : isToday ? 'warning.main' : 'text.primary'}
                            >
                              {item.dueDate || 'No Date'}
                            </Typography>
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            {item.dueTime || ''} {isOverdue && '(OVERDUE)'} {isToday && '(TODAY)'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={item.type || 'Phone Call'}
                            size="small"
                            color="info"
                            variant="outlined"
                            sx={{ mr: 1, fontWeight: 600, fontSize: '0.75rem' }}
                          />
                          <Chip
                            label={item.priority || 'Medium'}
                            size="small"
                            color={item.priority === 'Urgent' || item.priority === 'High' ? 'warning' : 'default'}
                            sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ maxWidth: 280 }} noWrap>
                            {item.notes || '—'}
                          </Typography>
                          {item.status === 'Completed' && item.completionNote && (
                            <Typography variant="caption" color="success.main" display="block">
                              Done: {item.completionNote}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          {item.status === 'Pending' && (
                            <>
                              <Tooltip title="Mark Completed">
                                <IconButton size="small" color="success" onClick={() => handleOpenComplete(item)}>
                                  <CheckCircleIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Reschedule Date">
                                <IconButton size="small" color="warning" onClick={() => handleOpenReschedule(item)}>
                                  <ScheduleIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                          <Tooltip title="Delete">
                            <IconButton size="small" color="error" onClick={() => handleDeletePrompt(item)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredList.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </Paper>

      {/* Add Follow-up Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>Add Sales Follow-up / Reminder</DialogTitle>
        <form onSubmit={handleSaveAdd}>
          <DialogContent dividers>
            {formError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {formError}
              </Alert>
            )}
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  select
                  fullWidth
                  required
                  label="Healthcare Facility / Customer"
                  value={formData.customerId}
                  onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                >
                  {customers.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name} ({c.type || 'Hospital'}) - {c.city}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  select
                  fullWidth
                  required
                  label="Assign Sales Representative"
                  value={formData.salesmanId}
                  onChange={(e) => setFormData({ ...formData, salesmanId: e.target.value })}
                >
                  {salesmen.map((s) => (
                    <MenuItem key={s.uid} value={s.uid}>
                      {s.name} ({s.email})
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  type="date"
                  label="Due Date"
                  InputLabelProps={{ shrink: true }}
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  type="time"
                  label="Due Time"
                  InputLabelProps={{ shrink: true }}
                  value={formData.dueTime}
                  onChange={(e) => setFormData({ ...formData, dueTime: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  label="Follow-up Type"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  {ALL_FOLLOW_UP_TYPES.map((t) => (
                    <MenuItem key={t} value={t}>
                      {t}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
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
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Action Notes / Reminder Purpose"
                  placeholder="e.g. Call Dr. Rajesh to follow up on ICU Carecustodian equipment quote"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setDialogOpen(false)} color="inherit">
              Cancel
            </Button>
            <Button type="submit" variant="contained" color="primary">
              Create Follow-up
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Complete Dialog */}
      <Dialog open={completeOpen} onClose={() => setCompleteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700}>Complete Follow-up</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Facility: <strong>{itemToComplete?.customerName}</strong>
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Outcome / Notes from Follow-up"
            placeholder="e.g. Discussed pricing; agreed to send finalized quotation tomorrow."
            value={completionNote}
            onChange={(e) => setCompletionNote(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setCompleteOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleConfirmComplete} variant="contained" color="success">
            Mark Done
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reschedule Dialog */}
      <Dialog open={rescheduleOpen} onClose={() => setRescheduleOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700}>Reschedule Follow-up</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="date"
                label="New Due Date"
                InputLabelProps={{ shrink: true }}
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="time"
                label="New Due Time"
                InputLabelProps={{ shrink: true }}
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Reason for Rescheduling"
                placeholder="e.g. Doctor is in surgery today"
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setRescheduleOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleConfirmReschedule} variant="contained" color="warning">
            Save Reschedule
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle fontWeight={700}>Confirm Deletion</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this follow-up?</Typography>
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
    </Box>
  );
};

export default FollowUpsPage;
