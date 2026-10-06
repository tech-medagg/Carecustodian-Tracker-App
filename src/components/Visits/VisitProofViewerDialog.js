// src/components/Visits/VisitProofViewerDialog.js
// Lightbox and verification detail viewer for recorded field visit proofs

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  Chip,
  IconButton,
} from '@mui/material';
import {
  CheckCircle as VerifiedIcon,
  Warning as WarningIcon,
  Close as CloseIcon,
  AccessTime as TimeIcon,
  Business as BusinessIcon,
} from '@mui/icons-material';


const VisitProofViewerDialog = ({ open, onClose, visit }) => {
  if (!visit) return null;

  const isVerified = visit.isGeofenceVerified;
  const discrepancy = visit.gpsDiscrepancyMeters !== undefined ? visit.gpsDiscrepancyMeters : null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Box display="flex" alignItems="center" gap={1}>
          <BusinessIcon color="primary" />
          <Typography variant="h6" fontWeight={700}>
            Visit Audit & Proofs
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 2.5 }}>
        {/* Customer & Salesman Info */}
        <Box sx={{ mb: 2, p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
          <Typography variant="subtitle1" fontWeight={700} color="text.primary">
            {visit.customerName || 'Facility Visit'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {visit.customerAddress || 'Scheduled Location'}
          </Typography>

          <Box display="flex" gap={2} mt={1.5} flexWrap="wrap">
            <Chip
              icon={<TimeIcon fontSize="small" />}
              label={`Time: ${visit.checkInTime ? new Date(visit.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}`}
              size="small"
              variant="outlined"
            />
            <Chip
              icon={isVerified ? <VerifiedIcon color="success" fontSize="small" /> : <WarningIcon color="warning" fontSize="small" />}
              label={isVerified ? `GPS Verified (±${discrepancy ?? 0}m)` : (discrepancy !== null ? `Off-site Check-in (${discrepancy}m away)` : 'Manual Check-in')}
              color={isVerified ? 'success' : 'warning'}
              size="small"
            />
            {visit.outcome && (
              <Chip
                label={`Outcome: ${visit.outcome}`}
                size="small"
                color="info"
                variant="outlined"
              />
            )}
          </Box>
        </Box>

        {/* Photo Proof */}
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
          📷 Photo Verification Proof:
        </Typography>
        <Box sx={{ mb: 2.5, textAlign: 'center' }}>
          {visit.photoProof ? (
            <img
              src={visit.photoProof}
              alt="Visit Verification Proof"
              style={{
                width: '100%',
                maxHeight: 280,
                objectFit: 'contain',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                backgroundColor: '#0f172a',
              }}
            />
          ) : (
            <Box p={3} bgcolor="#f1f5f9" borderRadius={2}>
              <Typography variant="body2" color="text.secondary">
                No photo was captured for this visit.
              </Typography>
            </Box>
          )}
        </Box>

        {/* Signature Proof */}
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
          ✍️ Doctor / Client Signature:
        </Typography>
        <Box sx={{ mb: 2 }}>
          {visit.signatureProof ? (
            <Box
              sx={{
                p: 1.5,
                bgcolor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: 2,
                textAlign: 'center',
              }}
            >
              <img
                src={visit.signatureProof}
                alt="Client Signature"
                style={{ maxHeight: 80, maxWidth: '100%', objectFit: 'contain' }}
              />
            </Box>
          ) : (
            <Box p={2} bgcolor="#f1f5f9" borderRadius={2}>
              <Typography variant="body2" color="text.secondary">
                No signature recorded.
              </Typography>
            </Box>
          )}
        </Box>

        {/* Discussion / Check-in Notes */}
        {(visit.notes || visit.checkInNotes || visit.discussionNotes) && (
          <Box sx={{ p: 1.5, bgcolor: '#fdf4ff', borderRadius: 2, border: '1px solid #f5d0fe' }}>
            <Typography variant="caption" fontWeight={700} color="secondary.main">
              MEETING / VISIT NOTES:
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              {visit.notes || visit.checkInNotes || visit.discussionNotes}
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 1.5, px: 2.5 }}>
        <Button onClick={onClose} variant="contained" color="primary" sx={{ borderRadius: 2 }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default VisitProofViewerDialog;
