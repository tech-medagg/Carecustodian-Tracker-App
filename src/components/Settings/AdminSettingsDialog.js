// src/components/Settings/AdminSettingsDialog.js
// Admin Dynamic Rate & Mileage Settings Dialog

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  TextField,
  Grid,
  InputAdornment,
  Alert,
  CircularProgress,
  IconButton,
  Divider,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Close as CloseIcon,
  Save as SaveIcon,
} from '@mui/icons-material';

import {
  getSettings,
  saveSettings,
  selectCurrentSettings,
} from '../../features/settings/settingsSlice';
import { selectCurrentUser } from '../../store/authSlice';

const AdminSettingsDialog = ({ open, onClose }) => {
  const dispatch = useDispatch();
  const currentSettings = useSelector(selectCurrentSettings);
  const currentUser = useSelector(selectCurrentUser);

  const [formData, setFormData] = useState({
    costPerKm: 3,
    bikeRatePerKm: 3,
    carRatePerKm: 3,
    dailyAllowance: 0,
    foodAllowance: 0,
    geofenceRadiusMeters: 250,
    companyName: 'Medagg Carecustodian',
    workingHoursStart: '09:00',
    workingHoursEnd: '18:00',
  });

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (open) {
      dispatch(getSettings());
      setSuccessMsg('');
      setErrorMsg('');
    }
  }, [open, dispatch]);

  useEffect(() => {
    if (currentSettings) {
      setFormData({
        costPerKm: currentSettings.costPerKm ?? 3,
        bikeRatePerKm: currentSettings.bikeRatePerKm ?? 3,
        carRatePerKm: currentSettings.carRatePerKm ?? 3,
        dailyAllowance: 0,
        foodAllowance: 0,
        geofenceRadiusMeters: currentSettings.geofenceRadiusMeters ?? 250,
        companyName: currentSettings.companyName || 'Medagg Carecustodian',
        workingHoursStart: currentSettings.workingHoursStart || '09:00',
        workingHoursEnd: currentSettings.workingHoursEnd || '18:00',
      });
    }
  }, [currentSettings]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await dispatch(
        saveSettings({
          newSettings: {
            ...formData,
            dailyAllowance: 0,
            foodAllowance: 0,
          },
          performedBy: currentUser,
        })
      ).unwrap();

      setSuccessMsg('Mileage rate settings saved successfully!');
      setTimeout(() => {
        setSuccessMsg('');
      }, 3000);
    } catch (err) {
      setErrorMsg(err || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box display="flex" alignItems="center" gap={1}>
          <SettingsIcon color="primary" />
          <Typography variant="h6" fontWeight={700}>
            Travel Reimbursement & Rate Settings
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <form onSubmit={handleSave}>
        <DialogContent dividers sx={{ p: 2.5 }}>
          {successMsg && (
            <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
              {successMsg}
            </Alert>
          )}
          {errorMsg && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {errorMsg}
            </Alert>
          )}

          {/* Rate Per Km Section */}
          <Typography variant="subtitle2" fontWeight={700} color="primary" sx={{ mb: 1.5 }}>
            🛵 VEHICLE REIMBURSEMENT RATE (₹/KM)
          </Typography>
          <Grid container spacing={2} sx={{ mb: 2.5 }}>
            <Grid item xs={12}>
              <TextField
                label="Travel Reimbursement Rate (₹/km)"
                type="number"
                fullWidth
                size="small"
                inputProps={{ step: '0.5', min: '0' }}
                value={formData.costPerKm}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  handleChange('costPerKm', val);
                  handleChange('bikeRatePerKm', val);
                }}
                InputProps={{
                  startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                  endAdornment: <InputAdornment position="end">/ km</InputAdornment>,
                }}
                helperText="Fixed reimbursement provided per kilometer of logged trip distance"
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          {/* Geofence & Working Rules */}
          <Typography variant="subtitle2" fontWeight={700} color="primary" sx={{ mb: 1.5 }}>
            📍 GEOFENCING & SYSTEM DEFAULTS
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Geofence Verification Radius"
                type="number"
                fullWidth
                size="small"
                value={formData.geofenceRadiusMeters}
                onChange={(e) => handleChange('geofenceRadiusMeters', Number(e.target.value))}
                InputProps={{
                  endAdornment: <InputAdornment position="end">meters</InputAdornment>,
                }}
                helperText="Max distance to client for GPS Verified check-in"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Company / Brand Name"
                fullWidth
                size="small"
                value={formData.companyName}
                onChange={(e) => handleChange('companyName', e.target.value)}
                helperText="Appears on PDF Claim Invoices"
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 2, px: 3, justifyContent: 'space-between' }}>
          <Button onClick={onClose} color="inherit" disabled={saving}>
            Close
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
            sx={{ fontWeight: 700, px: 3, borderRadius: 2 }}
          >
            {saving ? 'Saving…' : 'Save & Sync Settings'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default AdminSettingsDialog;
