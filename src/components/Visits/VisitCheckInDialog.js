// src/components/Visits/VisitCheckInDialog.js
// Geofenced Check-In Modal with GPS Distance Calculation, Camera Snapshot, and Signature Pad

import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  TextField,
  Alert,
  CircularProgress,
  IconButton,
} from '@mui/material';
import {
  LocationOn as LocationIcon,
  CameraAlt as CameraIcon,
  CheckCircle as VerifiedIcon,
  Warning as WarningIcon,
  Edit as SignIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
} from '@mui/icons-material';

import { computeHaversineDistance } from '../../utils/validators';

const VisitCheckInDialog = ({
  open,
  onClose,
  visit,
  customer,
  geofenceRadius = 250, // default 250 meters
  onConfirmCheckIn,
  loading = false,
}) => {
  const [gpsLoading, setGpsLoading] = useState(true);
  const [currentCoords, setCurrentCoords] = useState(null);
  const [distanceMeters, setDistanceMeters] = useState(null);
  const [isWithinGeofence, setIsWithinGeofence] = useState(false);
  const [gpsError, setGpsError] = useState('');

  // Proofs
  const [photoBase64, setPhotoBase64] = useState(null);
  const [notes, setNotes] = useState('');

  // Signature Pad Refs & State
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const [hasSignature, setHasSignature] = useState(false);

  // 1. Get Live GPS & Compute Geofence on Dialog Open
  useEffect(() => {
    if (!open || !visit) {
      setPhotoBase64(null);
      setHasSignature(false);
      setNotes('');
      setCurrentCoords(null);
      setDistanceMeters(null);
      setGpsError('');
      return;
    }

    setGpsLoading(true);
    setGpsError('');

    // Target Coords from visit or customer
    const targetLat = visit.lat || visit.latitude || customer?.latitude || customer?.lat || (customer?.locationCoords ? customer.locationCoords[0] : null);
    const targetLng = visit.lng || visit.longitude || customer?.longitude || customer?.lng || (customer?.locationCoords ? customer.locationCoords[1] : null);

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setCurrentCoords([lat, lng]);
          setGpsLoading(false);

          if (targetLat && targetLng) {
            const distKm = computeHaversineDistance([lat, lng], [targetLat, targetLng]);
            const distM = Math.round(distKm * 1000);
            setDistanceMeters(distM);
            setIsWithinGeofence(distM <= geofenceRadius);
          } else {
            // No registered coords for client -> default to verified with warning
            setDistanceMeters(0);
            setIsWithinGeofence(true);
          }
        },
        (err) => {
          console.warn('Geolocation failed during check-in:', err);
          setGpsLoading(false);
          setGpsError('Could not fetch precise GPS. You may still proceed with off-site check-in.');
          setIsWithinGeofence(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setGpsLoading(false);
      setGpsError('Geolocation is not supported by your browser.');
    }
  }, [open, visit, customer, geofenceRadius]);

  // 2. Camera Photo Capture & Downscale
  const handlePhotoCapture = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        setPhotoBase64(dataUrl);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // 3. Signature Pad Drawing Helpers
  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    isDrawingRef.current = true;
    setHasSignature(true);
  };

  const draw = (e) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;

    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1e293b';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const handleClearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  // 4. Confirm Submit
  const handleConfirm = () => {
    let sigData = null;
    if (hasSignature && canvasRef.current) {
      sigData = canvasRef.current.toDataURL('image/png');
    }

    onConfirmCheckIn({
      locationCoords: currentCoords,
      isGeofenceVerified: isWithinGeofence,
      gpsDiscrepancyMeters: distanceMeters !== null ? distanceMeters : 0,
      photoProof: photoBase64,
      signatureProof: sigData,
      checkInNotes: notes,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box display="flex" alignItems="center" gap={1}>
          <LocationIcon color="primary" />
          <Typography variant="h6" fontWeight={700}>
            Visit Check-In & Verification
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 2.5 }}>
        {/* Customer Header */}
        <Box sx={{ mb: 2, p: 1.5, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
          <Typography variant="subtitle1" fontWeight={700} color="text.primary">
            {visit?.customerName || customer?.name || 'Healthcare Facility'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {visit?.customerAddress || customer?.address || 'Scheduled In-Person Visit'}
          </Typography>
        </Box>

        {/* Geofence Status Card */}
        <Box sx={{ mb: 2.5 }}>
          {gpsLoading ? (
            <Box display="flex" alignItems="center" gap={1.5} p={1.5} bgcolor="#f0fdf4" borderRadius={2}>
              <CircularProgress size={20} />
              <Typography variant="body2" color="text.secondary">
                Acquiring live GPS & calculating proximity…
              </Typography>
            </Box>
          ) : gpsError ? (
            <Alert severity="warning" sx={{ borderRadius: 2 }}>
              {gpsError}
            </Alert>
          ) : isWithinGeofence ? (
            <Alert
              icon={<VerifiedIcon fontSize="inherit" />}
              severity="success"
              sx={{ borderRadius: 2, fontWeight: 600 }}
            >
              GPS Geofence Verified: You are {distanceMeters !== null ? `${distanceMeters}m` : 'on-site'} from client location (within {geofenceRadius}m threshold).
            </Alert>
          ) : (
            <Alert
              icon={<WarningIcon fontSize="inherit" />}
              severity="warning"
              sx={{ borderRadius: 2 }}
            >
              Off-Site Check-In: You are currently {distanceMeters}m away from the registered location (Threshold: {geofenceRadius}m).
            </Alert>
          )}
        </Box>

        {/* Photo Proof Section */}
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <CameraIcon fontSize="small" color="action" /> Photo Proof (Selfie / Clinic Entrance / Card)
        </Typography>

        <Box sx={{ mb: 2.5 }}>
          {photoBase64 ? (
            <Box position="relative" display="inline-block">
              <img
                src={photoBase64}
                alt="Visit Proof"
                style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 8, border: '1px solid #cbd5e1' }}
              />
              <IconButton
                size="small"
                onClick={() => setPhotoBase64(null)}
                sx={{ position: 'absolute', top: 6, right: 6, bgcolor: 'rgba(0,0,0,0.6)', color: '#fff' }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          ) : (
            <Button
              variant="outlined"
              component="label"
              startIcon={<CameraIcon />}
              fullWidth
              sx={{ py: 1.5, borderStyle: 'dashed', borderRadius: 2 }}
            >
              Take Photo / Upload Image
              <input type="file" accept="image/*" capture="environment" hidden onChange={handlePhotoCapture} />
            </Button>
          )}
        </Box>

        {/* Signature Pad Section */}
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <SignIcon fontSize="small" color="action" /> Client / Doctor Signature (Optional)
        </Typography>

        <Box sx={{ mb: 2 }}>
          <Box
            sx={{
              border: '1px solid #cbd5e1',
              borderRadius: 2,
              bgcolor: '#ffffff',
              touchAction: 'none',
              position: 'relative',
            }}
          >
            <canvas
              ref={canvasRef}
              width={480}
              height={120}
              style={{ width: '100%', height: 120, display: 'block', cursor: 'crosshair' }}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
            {hasSignature && (
              <Button
                size="small"
                onClick={handleClearSignature}
                sx={{ position: 'absolute', top: 4, right: 4, textTransform: 'none', fontSize: '0.75rem' }}
              >
                Clear
              </Button>
            )}
            {!hasSignature && (
              <Typography
                variant="caption"
                color="text.disabled"
                sx={{ position: 'absolute', top: '45%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }}
              >
                Sign here with finger or mouse
              </Typography>
            )}
          </Box>
        </Box>

        {/* Check-In Notes */}
        <TextField
          label="Quick Check-In Notes"
          placeholder="e.g. Met Dr. Sharma at OPD 3, discussed surgical consumables"
          fullWidth
          size="small"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </DialogContent>

      <DialogActions sx={{ p: 2, px: 3, justifyContent: 'space-between' }}>
        <Button onClick={onClose} color="inherit" disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleConfirm}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <VerifiedIcon />}
          sx={{ fontWeight: 700, px: 3, borderRadius: 2 }}
        >
          {loading ? 'Verifying…' : 'Confirm Check-In'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default VisitCheckInDialog;
