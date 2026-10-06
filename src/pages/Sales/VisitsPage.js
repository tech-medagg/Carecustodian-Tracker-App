// src/pages/Sales/VisitsPage.js
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
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
  MenuItem,
  FormControlLabel,
  Switch,
  Alert,
  Tabs,
  Tab,
  CircularProgress,
  Divider,
} from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import BusinessIcon from '@mui/icons-material/Business';
import AccessTimeIcon from '@mui/icons-material/AccessTime';


import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import DrawIcon from '@mui/icons-material/Draw';
import VerifiedIcon from '@mui/icons-material/Verified';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

import {
  getVisits,
  checkIn,
  editVisit,
  selectAllVisits,
  selectVisitStatus,
  selectVisitError,
  setActiveVisit,
} from '../../features/visits/visitSlice';
import { getCustomers, selectAllCustomers } from '../../features/customers/customerSlice';
import { getSettings, selectGeofenceRadius } from '../../features/settings/settingsSlice';
import VisitCheckInDialog from '../../components/Visits/VisitCheckInDialog';
import VisitProofViewerDialog from '../../components/Visits/VisitProofViewerDialog';
import { completeVisitAtomic } from '../../features/visits/visitAtomicService';
import { validateVisitStatusTransition } from '../../utils/validators';
import { selectCurrentUser } from '../../store/authSlice';
import {
  ALL_VISIT_OUTCOMES,
  ALL_LEAD_STATUSES,
  ALL_FOLLOW_UP_TYPES,
  VISIT_STATUSES,
} from '../../constants/salesConstants';
import { ROUTES } from '../../constants/routes';



const VisitsPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(selectCurrentUser);
  const visits = useSelector(selectAllVisits);
  const status = useSelector(selectVisitStatus);
  const error = useSelector(selectVisitError);

  const customers = useSelector(selectAllCustomers);
  const geofenceRadius = useSelector(selectGeofenceRadius) || 250;

  // Active Tab Index (0: Today, 1: Upcoming, 2: Completed, 3: All)
  const [tabIndex, setTabIndex] = useState(0);

  // Complete / Outcome Dialog State

  const [completeOpen, setCompleteOpen] = useState(false);

  const [currentVisit, setCurrentVisit] = useState(null);
  const [outcome, setOutcome] = useState('Positive');
  const [notes, setNotes] = useState('');
  const [meetingDurationMinutes, setMeetingDurationMinutes] = useState(30);

  // Check-In Dialog State (with Geofence, Camera, Signature)
  const [checkInDialogOpen, setCheckInDialogOpen] = useState(false);
  const [selectedVisitForCheckIn, setSelectedVisitForCheckIn] = useState(null);

  // Proof Viewer Dialog State
  const [proofViewerOpen, setProofViewerOpen] = useState(false);
  const [selectedVisitForProof, setSelectedVisitForProof] = useState(null);

  // Nested Lead Generation
  const [createLeadToggle, setCreateLeadToggle] = useState(false);
  const [leadTitle, setLeadTitle] = useState('');
  const [expectedValue, setExpectedValue] = useState('');
  const [leadStage, setLeadStage] = useState('New');

  // Nested Follow-up Scheduling
  const [scheduleFollowUpToggle, setScheduleFollowUpToggle] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpTime, setFollowUpTime] = useState('11:00');
  const [followUpType, setFollowUpType] = useState('Phone Call');
  const [followUpNotes, setFollowUpNotes] = useState('');

  const [formError, setFormError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Unable to meet dialog
  const [unableOpen, setUnableOpen] = useState(false);
  const [unableReason, setUnableReason] = useState('');

  useEffect(() => {
    if (user?.uid) {
      dispatch(getVisits(user.uid));
    }
    dispatch(getCustomers());
    dispatch(getSettings());
  }, [dispatch, user]);

  const todayStr = new Date().toISOString().split('T')[0];

  const todayVisits = visits.filter(
    (v) => (v.scheduledDate === todayStr || !v.scheduledDate) && v.status !== 'Completed' && v.status !== 'Cancelled'
  );
  const upcomingVisits = visits.filter(
    (v) => v.scheduledDate && v.scheduledDate > todayStr && v.status !== 'Completed' && v.status !== 'Cancelled'
  );
  const completedVisits = visits.filter((v) => v.status === 'Completed');

  let currentList = visits;
  if (tabIndex === 0) currentList = todayVisits;
  else if (tabIndex === 1) currentList = upcomingVisits;
  else if (tabIndex === 2) currentList = completedVisits;

  // 1. Start Travel Action
  const handleStartTravel = (visit) => {
    dispatch(setActiveVisit(visit));
    navigate(ROUTES.SALES);
  };

  // 2. Open Geofenced Check-In Dialog
  const handleOpenCheckIn = (visit) => {
    setSelectedVisitForCheckIn(visit);
    setCheckInDialogOpen(true);
  };

  // 3. Confirm Check-In with Geofence calculation & Proofs
  const handleConfirmCheckIn = async (payload) => {
    if (!selectedVisitForCheckIn) return;
    setActionLoading(true);
    try {
      await dispatch(
        checkIn({
          id: selectedVisitForCheckIn.id,
          ...payload,
        })
      ).unwrap();
      setCheckInDialogOpen(false);
      setSelectedVisitForCheckIn(null);
      // Refresh list
      if (user?.uid) {
        dispatch(getVisits(user.uid));
      }
    } catch (err) {
      console.error('Check in failed:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // 4. Open Proof Viewer Dialog
  const handleOpenProof = (visit) => {
    setSelectedVisitForProof(visit);
    setProofViewerOpen(true);
  };


  // 3. Open Complete / Outcome Dialog
  const handleOpenCompleteDialog = (visit) => {
    setCurrentVisit(visit);
    setOutcome('Positive');
    setNotes('');
    setMeetingDurationMinutes(30);
    setCreateLeadToggle(false);
    setLeadTitle(`Medagg deal - ${visit.customerName}`);
    setExpectedValue('');
    setLeadStage('New');
    setScheduleFollowUpToggle(false);
    // default follow-up 3 days later
    const d = new Date();
    d.setDate(d.getDate() + 3);
    setFollowUpDate(d.toISOString().split('T')[0]);
    setFollowUpTime('11:00');
    setFollowUpType('Phone Call');
    setFollowUpNotes(`Follow up with ${visit.customerName}`);
    setFormError('');
    setCompleteOpen(true);
  };

  // 4. Save Outcome & Complete (Atomic Batch)
  const handleSaveComplete = async (e) => {
    e.preventDefault();
    if (!currentVisit) return;
    setActionLoading(true);
    setFormError('');

    // Validate transition
    const transitionCheck = validateVisitStatusTransition(currentVisit.status, VISIT_STATUSES.COMPLETED);
    if (!transitionCheck.isAllowed) {
      setFormError(transitionCheck.reason);
      setActionLoading(false);
      return;
    }

    try {
      const leadPayload = createLeadToggle
        ? {
            title: leadTitle || `Lead for ${currentVisit.customerName}`,
            customerId: currentVisit.customerId,
            customerName: currentVisit.customerName,
            expectedValue: Number(expectedValue) || 0,
            stage: leadStage,
          }
        : null;

      const followUpPayload = scheduleFollowUpToggle
        ? {
            customerId: currentVisit.customerId,
            customerName: currentVisit.customerName,
            customerPhone: currentVisit.customerPhone || '',
            dueDate: followUpDate,
            dueTime: followUpTime,
            type: followUpType,
            notes: followUpNotes,
          }
        : null;

      // Single atomic batched write (Visit + Lead + FollowUp + AuditLog)
      await completeVisitAtomic({
        visitId: currentVisit.id,
        completionData: {
          outcome,
          notes,
          meetingDurationMinutes: Number(meetingDurationMinutes) || 30,
          customerName: currentVisit.customerName,
        },
        leadData: leadPayload,
        followUpData: followUpPayload,
        user,
      });

      // Refresh Redux visits list
      dispatch(getVisits(user.uid));

      setCompleteOpen(false);
      setCurrentVisit(null);
    } catch (err) {
      setFormError(err?.message || 'Failed to complete visit atomically');
    } finally {
      setActionLoading(false);
    }
  };


  // 5. Unable to Meet Action
  const handleOpenUnable = (visit) => {
    setCurrentVisit(visit);
    setUnableReason('');
    setUnableOpen(true);
  };

  const handleSaveUnable = async () => {
    if (!currentVisit) return;
    try {
      await dispatch(
        editVisit({
          id: currentVisit.id,
          updates: {
            status: VISIT_STATUSES.UNABLE_TO_MEET,
            notes: unableReason ? `Unable to meet: ${unableReason}` : 'Unable to meet',
          },
        })
      ).unwrap();
      setUnableOpen(false);
      setCurrentVisit(null);
    } catch (err) {
      console.error(err);
    }
  };

  const getPriorityColor = (p) => {
    if (p === 'Urgent') return 'error';
    if (p === 'High') return 'warning';
    if (p === 'Medium') return 'info';
    return 'default';
  };

  return (
    <Box sx={{ p: 2, maxWidth: 900, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={700} color="primary">
          My Field Visits
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Execute scheduled hospital visits, check-in, record client outcomes, and create instant leads.
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
                Today's Queue
                {todayVisits.length > 0 && (
                  <Chip label={todayVisits.length} size="small" color="primary" sx={{ height: 18, fontSize: '0.7rem' }} />
                )}
              </Box>
            }
          />
          <Tab label={`Upcoming (${upcomingVisits.length})`} />
          <Tab label={`Completed (${completedVisits.length})`} />
          <Tab label={`All (${visits.length})`} />
        </Tabs>
      </Paper>

      {/* Error alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Visit Cards List */}
      {status === 'loading' && visits.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <CircularProgress size={36} />
          <Typography variant="body2" sx={{ mt: 1 }}>
            Loading your visits...
          </Typography>
        </Box>
      ) : currentList.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }} elevation={1}>
          <DoneAllIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography variant="subtitle1" fontWeight={600} color="text.secondary">
            No visits in this tab.
          </Typography>
          <Typography variant="body2" color="text.disabled">
            All caught up! Check back later for new assignments.
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {currentList.map((visit) => {
            const isCheckedIn = visit.status === 'In Progress' || Boolean(visit.checkedInAt);
            const isCompleted = visit.status === 'Completed';

            return (
              <Card
                key={visit.id}
                elevation={isCheckedIn ? 3 : 1}
                sx={{
                  borderRadius: 2,
                  borderLeft: isCheckedIn ? '5px solid #ed6c02' : isCompleted ? '5px solid #2e7d32' : '5px solid #1976d2',
                  transition: 'transform 0.15s ease-in-out',
                  '&:hover': { transform: 'translateY(-2px)' },
                }}
              >
                <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                  {/* Top row */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <BusinessIcon color="primary" />
                      <Typography variant="h6" fontWeight={700}>
                        {visit.customerName}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Chip
                        label={visit.priority || 'Medium'}
                        color={getPriorityColor(visit.priority)}
                        size="small"
                        sx={{ fontWeight: 600, fontSize: '0.7rem' }}
                      />
                      <Chip
                        label={visit.status}
                        color={isCheckedIn ? 'warning' : isCompleted ? 'success' : 'primary'}
                        size="small"
                        sx={{ fontWeight: 600, fontSize: '0.7rem' }}
                      />
                    </Box>
                  </Box>

                  {/* Customer details */}
                  <Grid container spacing={1} sx={{ mb: 1.5 }}>
                    {visit.customerAddress && (
                      <Grid item xs={12} sm={6}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <LocationOnIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="body2" color="text.secondary">
                            {visit.customerAddress}
                          </Typography>
                        </Box>
                      </Grid>
                    )}
                    {visit.scheduledDate && (
                      <Grid item xs={12} sm={6}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <AccessTimeIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="body2" color="text.secondary">
                            Scheduled: {visit.scheduledDate} at {visit.scheduledTime || '—'}
                          </Typography>
                        </Box>
                      </Grid>
                    )}
                    {visit.customerContact && (
                      <Grid item xs={12}>
                        <Typography variant="body2" fontWeight={500}>
                          Contact Doctor / Lead: {visit.customerContact}
                        </Typography>
                      </Grid>
                    )}
                  </Grid>

                  {/* Agenda */}
                  {visit.agenda && (
                    <Box sx={{ bgcolor: 'grey.50', p: 1, borderRadius: 1, mb: 2 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                        Meeting Objective:
                      </Typography>
                      <Typography variant="body2">{visit.agenda}</Typography>
                    </Box>
                  )}

                  {/* Outcome if completed */}
                  {isCompleted && (
                    <Box sx={{ bgcolor: 'success.50', p: 1.5, borderRadius: 1, border: '1px solid #c8e6c9', mb: 2 }}>
                      <Typography variant="subtitle2" fontWeight={700} color="success.dark">
                        Outcome: {visit.outcome}
                      </Typography>
                      {visit.notes && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          Notes: {visit.notes}
                        </Typography>
                      )}
                      {visit.meetingDurationMinutes && (
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                          Duration: {visit.meetingDurationMinutes} minutes
                        </Typography>
                      )}
                    </Box>
                  )}

                  {/* Verification Badges */}
                  {(visit.isGeofenceVerified || visit.photoProof || visit.signatureProof || visit.gpsDiscrepancyMeters !== undefined) && (
                    <Box sx={{ display: 'flex', gap: 0.8, alignItems: 'center', mb: 1.5, flexWrap: 'wrap' }}>
                      {visit.isGeofenceVerified && (
                        <Chip
                          icon={<VerifiedIcon fontSize="small" />}
                          label={`GPS Verified (±${visit.gpsDiscrepancyMeters ?? 0}m)`}
                          color="success"
                          size="small"
                          onClick={() => handleOpenProof(visit)}
                          sx={{ cursor: 'pointer', fontWeight: 600 }}
                        />
                      )}
                      {visit.gpsDiscrepancyMeters > 0 && !visit.isGeofenceVerified && (
                        <Chip
                          icon={<WarningAmberIcon fontSize="small" />}
                          label={`Off-site (${visit.gpsDiscrepancyMeters}m)`}
                          color="warning"
                          size="small"
                          onClick={() => handleOpenProof(visit)}
                          sx={{ cursor: 'pointer' }}
                        />
                      )}
                      {visit.photoProof && (
                        <Chip
                          icon={<PhotoCameraIcon fontSize="small" />}
                          label="Photo Proof"
                          color="info"
                          size="small"
                          variant="outlined"
                          onClick={() => handleOpenProof(visit)}
                          sx={{ cursor: 'pointer' }}
                        />
                      )}
                      {visit.signatureProof && (
                        <Chip
                          icon={<DrawIcon fontSize="small" />}
                          label="Doctor Signed"
                          color="secondary"
                          size="small"
                          variant="outlined"
                          onClick={() => handleOpenProof(visit)}
                          sx={{ cursor: 'pointer' }}
                        />
                      )}
                    </Box>
                  )}

                  <Divider sx={{ my: 1.5 }} />

                  {/* Action Buttons */}
                  {!isCompleted && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<DirectionsCarIcon />}
                          onClick={() => handleStartTravel(visit)}
                          sx={{ textTransform: 'none' }}
                        >
                          Start Travel / GPS
                        </Button>
                        {!isCheckedIn && (
                          <Button
                            variant="contained"
                            color="warning"
                            size="small"
                            startIcon={<EventAvailableIcon />}
                            onClick={() => handleOpenCheckIn(visit)}
                            disabled={actionLoading}
                            sx={{ textTransform: 'none', fontWeight: 600 }}
                          >
                            Check-In at Facility
                          </Button>
                        )}
                        {isCheckedIn && (
                          <Button
                            variant="contained"
                            color="success"
                            size="small"
                            startIcon={<CheckCircleIcon />}
                            onClick={() => handleOpenCompleteDialog(visit)}
                            disabled={actionLoading}
                            sx={{ textTransform: 'none', fontWeight: 600 }}
                          >
                            Record Outcome & Complete
                          </Button>
                        )}
                      </Box>
                      <Button
                        size="small"
                        color="inherit"
                        onClick={() => handleOpenUnable(visit)}
                        sx={{ textTransform: 'none', color: 'text.secondary' }}
                      >
                        Unable to Meet
                      </Button>
                    </Box>
                  )}

                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}

      {/* Record Outcome & Complete Dialog */}
      <Dialog open={completeOpen} onClose={() => setCompleteOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>Record Meeting Outcome & Complete Visit</DialogTitle>
        <form onSubmit={handleSaveComplete}>
          <DialogContent dividers>
            {formError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {formError}
              </Alert>
            )}

            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
              Facility: <strong>{currentVisit?.customerName}</strong>
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={8}>
                <TextField
                  select
                  fullWidth
                  required
                  label="Meeting Outcome"
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value)}
                >
                  {ALL_VISIT_OUTCOMES.map((oc) => (
                    <MenuItem key={oc} value={oc}>
                      {oc}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Duration (Mins)"
                  value={meetingDurationMinutes}
                  onChange={(e) => setMeetingDurationMinutes(e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Discussion Notes & Customer Feedback"
                  placeholder="e.g. Doctor showed high interest in automated patient monitoring system. Requested quotation for 5 units."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            {/* Quick Lead Generation Toggle */}
            <FormControlLabel
              control={
                <Switch
                  checked={createLeadToggle}
                  onChange={(e) => setCreateLeadToggle(e.target.checked)}
                  color="primary"
                />
              }
              label={<Typography fontWeight={600}>Generate Sales Lead / Deal Opportunity</Typography>}
            />

            {createLeadToggle && (
              <Box sx={{ p: 2, bgcolor: 'primary.50', borderRadius: 2, mt: 1, border: '1px solid #bbdefb' }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={7}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Deal Title"
                      value={leadTitle}
                      onChange={(e) => setLeadTitle(e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={5}>
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      label="Expected Value (INR)"
                      placeholder="e.g. 150000"
                      value={expectedValue}
                      onChange={(e) => setExpectedValue(e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      label="Initial Deal Stage"
                      value={leadStage}
                      onChange={(e) => setLeadStage(e.target.value)}
                    >
                      {ALL_LEAD_STATUSES.map((st) => (
                        <MenuItem key={st} value={st}>
                          {st}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                </Grid>
              </Box>
            )}

            <Divider sx={{ my: 2 }} />

            {/* Quick Follow-up Scheduling Toggle */}
            <FormControlLabel
              control={
                <Switch
                  checked={scheduleFollowUpToggle}
                  onChange={(e) => setScheduleFollowUpToggle(e.target.checked)}
                  color="warning"
                />
              }
              label={<Typography fontWeight={600}>Schedule Follow-up Action</Typography>}
            />

            {scheduleFollowUpToggle && (
              <Box sx={{ p: 2, bgcolor: 'warning.50', borderRadius: 2, mt: 1, border: '1px solid #ffe0b2' }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      size="small"
                      type="date"
                      label="Next Follow-up Date"
                      InputLabelProps={{ shrink: true }}
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      label="Action Type"
                      value={followUpType}
                      onChange={(e) => setFollowUpType(e.target.value)}
                    >
                      {ALL_FOLLOW_UP_TYPES.map((t) => (
                        <MenuItem key={t} value={t}>
                          {t}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Reminder Note"
                      placeholder="e.g. Call to discuss equipment delivery timeline"
                      value={followUpNotes}
                      onChange={(e) => setFollowUpNotes(e.target.value)}
                    />
                  </Grid>
                </Grid>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setCompleteOpen(false)} color="inherit">
              Cancel
            </Button>
            <Button type="submit" variant="contained" color="success" disabled={actionLoading}>
              {actionLoading ? 'Saving...' : 'Finish Visit'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Unable to Meet Dialog */}
      <Dialog open={unableOpen} onClose={() => setUnableOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700}>Unable to Meet / Postpone</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Provide a brief explanation for rescheduling or missing the appointment.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Reason"
            placeholder="e.g. Doctor had emergency surgery; rescheduled for next Tuesday"
            value={unableReason}
            onChange={(e) => setUnableReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setUnableOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleSaveUnable} variant="contained" color="warning">
            Submit
          </Button>
        </DialogActions>
      </Dialog>

      {/* Geofenced Check-In Modal */}
      <VisitCheckInDialog
        open={checkInDialogOpen}
        onClose={() => {
          setCheckInDialogOpen(false);
          setSelectedVisitForCheckIn(null);
        }}
        visit={selectedVisitForCheckIn}
        customer={customers.find((c) => c.id === selectedVisitForCheckIn?.customerId)}
        geofenceRadius={geofenceRadius}
        onConfirmCheckIn={handleConfirmCheckIn}
        loading={actionLoading}
      />

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

