// src/pages/Sales/FollowUpsPage.js
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
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tabs,
  Tab,
  CircularProgress,
  Divider,
} from '@mui/material';

import PhoneIcon from '@mui/icons-material/Phone';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ScheduleIcon from '@mui/icons-material/Schedule';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import DoneAllIcon from '@mui/icons-material/DoneAll';

import {
  getFollowUps,
  markFollowUpDone,
  changeFollowUpDate,
  selectAllFollowUps,
  selectFollowUpStatus,
} from '../../features/followUps/followUpSlice';
import { selectCurrentUser } from '../../store/authSlice';

const SalesFollowUpsPage = () => {
  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);
  const followUps = useSelector(selectAllFollowUps);
  const status = useSelector(selectFollowUpStatus);

  const [tabIndex, setTabIndex] = useState(0); // 0: Pending, 1: Overdue, 2: Completed, 3: All

  // Complete Dialog State
  const [completeOpen, setCompleteOpen] = useState(false);
  const [itemToComplete, setItemToComplete] = useState(null);
  const [completionNote, setCompletionNote] = useState('');

  // Reschedule Dialog State
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [itemToReschedule, setItemToReschedule] = useState(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('11:00');
  const [rescheduleReason, setRescheduleReason] = useState('');

  useEffect(() => {
    if (user?.uid) {
      dispatch(getFollowUps(user.uid));
    }
  }, [dispatch, user]);

  const todayStr = new Date().toISOString().split('T')[0];

  const pendingList = followUps.filter((f) => f.status === 'Pending' && (f.dueDate >= todayStr || !f.dueDate));
  const overdueList = followUps.filter((f) => f.status === 'Pending' && f.dueDate && f.dueDate < todayStr);
  const completedList = followUps.filter((f) => f.status === 'Completed');

  let currentList = followUps;
  if (tabIndex === 0) currentList = pendingList;
  else if (tabIndex === 1) currentList = overdueList;
  else if (tabIndex === 2) currentList = completedList;

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

  return (
    <Box sx={{ p: 2, maxWidth: 900, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={700} color="primary">
          My Follow-ups & Reminders
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Never miss a doctor callback, proposal follow-up, or scheduled customer conversation.
        </Typography>
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 3, borderRadius: 2 }} elevation={1}>
        <Tabs
          value={tabIndex}
          onChange={(e, val) => setTabIndex(val)}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                Pending
                {pendingList.length > 0 && (
                  <Chip label={pendingList.length} size="small" color="primary" sx={{ height: 18, fontSize: '0.7rem' }} />
                )}
              </Box>
            }
          />
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
      </Paper>

      {/* List */}
      {status === 'loading' && followUps.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <CircularProgress size={36} />
          <Typography variant="body2" sx={{ mt: 1 }}>
            Loading follow-ups...
          </Typography>
        </Box>
      ) : currentList.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }} elevation={1}>
          <DoneAllIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography variant="subtitle1" fontWeight={600} color="text.secondary">
            No follow-ups in this view.
          </Typography>
          <Typography variant="body2" color="text.disabled">
            You are all caught up!
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {currentList.map((item) => {
            const isOverdue = item.status === 'Pending' && item.dueDate && item.dueDate < todayStr;
            const isDone = item.status === 'Completed';

            return (
              <Card
                key={item.id}
                elevation={1}
                sx={{
                  borderRadius: 2,
                  borderLeft: isOverdue ? '5px solid #d32f2f' : isDone ? '5px solid #2e7d32' : '5px solid #1976d2',
                }}
              >
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LocalHospitalIcon color="primary" />
                      <Typography variant="subtitle1" fontWeight={700}>
                        {item.customerName}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Chip
                        label={item.type || 'Phone Call'}
                        size="small"
                        color="info"
                        variant="outlined"
                        sx={{ fontWeight: 600, fontSize: '0.7rem' }}
                      />
                      <Chip
                        label={item.priority || 'Medium'}
                        size="small"
                        color={item.priority === 'Urgent' || item.priority === 'High' ? 'warning' : 'default'}
                        sx={{ fontWeight: 600, fontSize: '0.7rem' }}
                      />
                    </Box>
                  </Box>

                  {/* Due date info */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    {isOverdue && <WarningAmberIcon color="error" sx={{ fontSize: 18 }} />}
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      color={isOverdue ? 'error.main' : 'text.primary'}
                    >
                      Due: {item.dueDate || 'No Date'} at {item.dueTime || '—'}
                    </Typography>
                    {isOverdue && (
                      <Chip label="OVERDUE" color="error" size="small" sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }} />
                    )}
                  </Box>

                  {/* Notes */}
                  {item.notes && (
                    <Box sx={{ bgcolor: 'grey.50', p: 1, borderRadius: 1, mb: 1.5 }}>
                      <Typography variant="body2">{item.notes}</Typography>
                    </Box>
                  )}

                  {/* Done outcome */}
                  {isDone && item.completionNote && (
                    <Box sx={{ bgcolor: 'success.50', p: 1, borderRadius: 1, border: '1px solid #c8e6c9', mb: 1.5 }}>
                      <Typography variant="caption" color="success.dark" fontWeight={600} display="block">
                        Completed Outcome:
                      </Typography>
                      <Typography variant="body2">{item.completionNote}</Typography>
                    </Box>
                  )}

                  <Divider sx={{ my: 1 }} />

                  {/* Actions */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                    {item.customerPhone ? (
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<PhoneIcon />}
                        href={`tel:${item.customerPhone}`}
                        sx={{ textTransform: 'none' }}
                      >
                        Call ({item.customerPhone})
                      </Button>
                    ) : (
                      <Box />
                    )}

                    {!isDone && (
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          variant="outlined"
                          color="warning"
                          size="small"
                          startIcon={<ScheduleIcon />}
                          onClick={() => handleOpenReschedule(item)}
                          sx={{ textTransform: 'none' }}
                        >
                          Reschedule
                        </Button>
                        <Button
                          variant="contained"
                          color="success"
                          size="small"
                          startIcon={<CheckCircleIcon />}
                          onClick={() => handleOpenComplete(item)}
                          sx={{ textTransform: 'none', fontWeight: 600 }}
                        >
                          Mark Done
                        </Button>
                      </Box>
                    )}
                  </Box>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}

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
            label="Outcome / Discussion Notes"
            placeholder="e.g. Spoke to Dr. Verma, scheduled product demo for next Monday."
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
                placeholder="e.g. Doctor requested callback after clinic hours"
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
    </Box>
  );
};

export default SalesFollowUpsPage;
