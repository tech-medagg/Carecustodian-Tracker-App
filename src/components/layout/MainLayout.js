import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, Outlet } from 'react-router-dom';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  IconButton, 
  Button, 
  Box,
  Avatar,
  Stack
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { logoutUser, selectCurrentUser } from '../../store/authSlice';
import Sidebar from './Sidebar';

const MainLayout = ({ children }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const dispatch = useDispatch();
  const currentUser = useSelector(selectCurrentUser);

  // Automatically close sidebar and clear stuck backdrops on route change
  useEffect(() => {
    setSidebarOpen(false);
    const backdrops = document.querySelectorAll('.MuiBackdrop-root');
    backdrops.forEach((el) => {
      if (el && el.parentNode) {
        el.parentNode.removeChild(el);
      }
    });
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('padding-right');
  }, [location.pathname]);

  const handleLogout = () => {
    dispatch(logoutUser());
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
      <AppBar position="fixed" sx={{ zIndex: 1200 }}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={() => setSidebarOpen(true)}
            sx={{ mr: 1.5 }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1, gap: 1.2 }}>
            <Box
              component="img"
              src="/logo.png"
              alt="Carecustodian Tracker"
              sx={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                bgcolor: 'white',
                p: 0.3,
                boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
                objectFit: 'contain',
              }}
            />
            <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 700, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
              Carecustodian Tracker
            </Typography>
          </Box>
          
          {/* User Profile Section */}
          {currentUser && (
            <Stack direction="row" spacing={2} alignItems="center">
              <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  {currentUser.displayName || currentUser.email}
                </Typography>
                {currentUser.provider === 'google' && (
                  <Typography variant="caption" sx={{ opacity: 0.7 }}>
                    via Google
                  </Typography>
                )}
              </Box>
              
              {currentUser.photoURL ? (
                <Avatar 
                  src={currentUser.photoURL} 
                  alt={currentUser.displayName}
                  sx={{ width: 32, height: 32 }}
                />
              ) : (
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
                  {(currentUser.displayName || currentUser.email).charAt(0).toUpperCase()}
                </Avatar>
              )}
            </Stack>
          )}
          
          <Button color="inherit" onClick={handleLogout} sx={{ ml: 1 }}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          mt: 8, // Account for AppBar height
          width: '100%',
          minHeight: 'calc(100vh - 64px)',
          overflowX: 'hidden',
        }}
      >
        {children || <Outlet />}
      </Box>
    </Box>
  );
};

export default MainLayout;
