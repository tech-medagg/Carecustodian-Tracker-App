// src/components/layout/Sidebar.js
import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Box,
  Chip,
  IconButton,
  Button,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PersonIcon from '@mui/icons-material/Person';
import CloseIcon from '@mui/icons-material/Close';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';

import { selectCurrentUser } from '../../store/authSlice';

import { ADMIN_ROLES, ROLE_LABELS } from '../../constants/roles';
import { ROUTES } from '../../constants/routes';

import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import EventNoteIcon from '@mui/icons-material/EventNote';
import AssessmentIcon from '@mui/icons-material/Assessment';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import GroupIcon from '@mui/icons-material/Group';
import HistoryIcon from '@mui/icons-material/History';
import MapIcon from '@mui/icons-material/Map';

// ── Menu definitions ──────────────────────────────────────────────────────────
const ADMIN_MENU = [
  { label: 'Admin Dashboard', icon: <DashboardIcon />, path: ROUTES.ADMIN },
  { label: 'Field Visits', icon: <EventNoteIcon />, path: ROUTES.ADMIN_VISITS },
  { label: 'Healthcare Directory', icon: <LocalHospitalIcon />, path: ROUTES.ADMIN_CUSTOMERS },
  { label: 'Follow-ups Board', icon: <NotificationsActiveIcon />, path: ROUTES.ADMIN_FOLLOW_UPS },
  { label: 'Salesmen Directory', icon: <GroupIcon />, path: ROUTES.ADMIN_SALESMEN },
  { label: 'Performance & Reports', icon: <AssessmentIcon />, path: ROUTES.ADMIN_REPORTS },
];

const SALESMAN_MENU = [
  { label: 'My Field Visits', icon: <EventNoteIcon />, path: ROUTES.SALES_VISITS },
  { label: 'Trip Tracking (GPS)', icon: <MapIcon />, path: ROUTES.SALES },
  { label: 'My Follow-ups', icon: <NotificationsActiveIcon />, path: ROUTES.SALES_FOLLOW_UPS },
  { label: 'My Trips History', icon: <HistoryIcon />, path: ROUTES.SALES_TRIPS },
  { label: 'My Profile', icon: <PersonIcon />, path: ROUTES.SALES_PROFILE },
];

// ── Component ─────────────────────────────────────────────────────────────────
const Sidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector(selectCurrentUser);

  const isAdmin = user && ADMIN_ROLES.includes(user.role);
  const menuItems = isAdmin ? ADMIN_MENU : SALESMAN_MENU;

  // Cleanup backdrops and scroll lock when closing or unmounting
  useEffect(() => {
    if (!isOpen) {
      const cleanBackdrop = () => {
        const backdrops = document.querySelectorAll('.MuiBackdrop-root');
        backdrops.forEach((el) => {
          if (el && el.parentNode) {
            el.parentNode.removeChild(el);
          }
        });
        document.body.style.removeProperty('overflow');
        document.body.style.removeProperty('padding-right');
      };
      const timer = setTimeout(cleanBackdrop, 200);
      return () => clearTimeout(timer);
    }
    return () => {
      const backdrops = document.querySelectorAll('.MuiBackdrop-root');
      backdrops.forEach((el) => {
        if (el && el.parentNode) {
          el.parentNode.removeChild(el);
        }
      });
      document.body.style.removeProperty('overflow');
      document.body.style.removeProperty('padding-right');
    };
  }, [isOpen]);

  const handleClose = (e) => {
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation();
    }
    if (typeof onClose === 'function') {
      onClose();
    }
  };

  const handleNavigate = (path) => {
    if (typeof onClose === 'function') {
      onClose();
    }
    navigate(path);
  };

  return (
    <Drawer
      variant="temporary"
      anchor="left"
      open={Boolean(isOpen)}
      onClose={handleClose}
      disableScrollLock={true}
      ModalProps={{
        keepMounted: false,
        disableRestoreFocus: true,
      }}
      PaperProps={{
        sx: {
          width: 280,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '4px 0 24px rgba(0,0,0,0.18)',
          zIndex: 1400,
        },
      }}
      sx={{
        zIndex: 1400,
      }}
    >
      {/* Header with Logo and Close Button */}
      <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white', position: 'relative' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
            <Box
              component="img"
              src="/logo.png"
              alt="Carecustodian Tracker"
              sx={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                bgcolor: 'white',
                p: 0.3,
                boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                objectFit: 'contain',
              }}
            />
            <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1.05rem', letterSpacing: '-0.01em' }}>
              Carecustodian
            </Typography>
          </Box>
          <IconButton
            id="close-sidebar-btn"
            type="button"
            onClick={handleClose}
            aria-label="Close navigation sidebar"
            size="medium"
            sx={{
              color: 'white',
              bgcolor: 'rgba(255, 255, 255, 0.22)',
              width: 38,
              height: 38,
              borderRadius: 2,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              zIndex: 10,
              transition: 'all 0.15s ease-in-out',
              '&:hover': { 
                bgcolor: 'rgba(255, 255, 255, 0.38)',
                transform: 'scale(1.05)'
              },
              '&:active': {
                bgcolor: 'rgba(255, 255, 255, 0.5)',
                transform: 'scale(0.95)'
              },
            }}
          >
            <CloseIcon sx={{ fontSize: 22, pointerEvents: 'none' }} />
          </IconButton>
        </Box>
        {user && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" sx={{ opacity: 0.9 }} noWrap>
              {user.displayName || user.email}
            </Typography>
            <Chip
              label={ROLE_LABELS[user.role] || user.role}
              size="small"
              sx={{ mt: 0.75, bgcolor: 'white', color: 'primary.main', fontWeight: 700, fontSize: '0.7rem' }}
            />
          </Box>
        )}
      </Box>

      <Divider />

      {/* Navigation items */}
      <List sx={{ pt: 1, flex: 1, overflowY: 'auto' }}>
        {menuItems.map((item) => (
          <ListItemButton
            key={item.label}
            onClick={() => handleNavigate(item.path)}
            selected={location.pathname === item.path}
            sx={{
              borderRadius: 2,
              mx: 1,
              mb: 0.5,
              py: 1,
              '&.Mui-selected': {
                bgcolor: 'primary.light',
                color: 'primary.contrastText',
                fontWeight: 700,
                '& .MuiListItemIcon-root': { color: 'primary.contrastText' },
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
            <ListItemText 
              primary={item.label} 
              primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: location.pathname === item.path ? 700 : 500 }}
            />
          </ListItemButton>
        ))}
      </List>

      <Divider />

      {/* Footer Close Drawer Button */}
      <Box sx={{ p: 1.5, mt: 'auto', bgcolor: 'background.default', borderTop: '1px solid', borderColor: 'divider' }}>
        <Button
          fullWidth
          variant="outlined"
          color="inherit"
          startIcon={<ChevronLeftIcon />}
          onClick={handleClose}
          size="medium"
          sx={{
            borderRadius: 2,
            borderColor: 'divider',
            textTransform: 'none',
            fontWeight: 700,
            fontSize: '0.85rem',
            py: 1,
            color: 'text.primary',
            cursor: 'pointer',
            bgcolor: 'background.paper',
            '&:hover': {
              borderColor: 'primary.main',
              color: 'primary.main',
              bgcolor: 'action.hover',
            },
          }}
        >
          Collapse Sidebar
        </Button>
      </Box>
    </Drawer>
  );
};

export default Sidebar;
