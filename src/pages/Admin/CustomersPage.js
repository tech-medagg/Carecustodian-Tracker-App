// src/pages/Admin/CustomersPage.js
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
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import PhoneIcon from '@mui/icons-material/Phone';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import BusinessIcon from '@mui/icons-material/Business';

import {
  getCustomers,
  addCustomer,
  editCustomer,
  removeCustomer,
  selectAllCustomers,
  selectCustomerStatus,
  selectCustomerError,
} from '../../features/customers/customerSlice';
import { ALL_CUSTOMER_TYPES } from '../../constants/salesConstants';

const initialFormData = {
  name: '',
  type: 'Hospital',
  contactPerson: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  latitude: '',
  longitude: '',
  notes: '',
};

const CustomersPage = () => {
  const dispatch = useDispatch();
  const customers = useSelector(selectAllCustomers);
  const status = useSelector(selectCustomerStatus);
  const error = useSelector(selectCustomerError);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
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
  const [customerToDelete, setCustomerToDelete] = useState(null);

  useEffect(() => {
    dispatch(getCustomers());
  }, [dispatch]);

  const handleOpenAdd = () => {
    setIsEditing(false);
    setCurrentId(null);
    setFormData(initialFormData);
    setFormError('');
    setDialogOpen(true);
  };

  const handleOpenEdit = (customer) => {
    setIsEditing(true);
    setCurrentId(customer.id);
    setFormData({
      name: customer.name || '',
      type: customer.type || 'Hospital',
      contactPerson: customer.contactPerson || '',
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      city: customer.city || '',
      latitude: customer.latitude !== undefined && customer.latitude !== null ? customer.latitude : '',
      longitude: customer.longitude !== undefined && customer.longitude !== null ? customer.longitude : '',
      notes: customer.notes || '',
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
    if (!formData.name.trim()) {
      setFormError('Hospital/Customer name is required.');
      return;
    }

    const payload = {
      ...formData,
      latitude: formData.latitude !== '' ? parseFloat(formData.latitude) : null,
      longitude: formData.longitude !== '' ? parseFloat(formData.longitude) : null,
    };

    try {
      if (isEditing && currentId) {
        await dispatch(editCustomer({ id: currentId, updates: payload })).unwrap();
      } else {
        await dispatch(addCustomer(payload)).unwrap();
      }
      handleCloseDialog();
    } catch (err) {
      setFormError(err || 'Failed to save customer');
    }
  };

  const handleDeletePrompt = (customer) => {
    setCustomerToDelete(customer);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (customerToDelete) {
      await dispatch(removeCustomer(customerToDelete.id));
      setDeleteConfirmOpen(false);
      setCustomerToDelete(null);
    }
  };

  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.contactPerson || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.city || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.phone || '').includes(searchTerm);
    const matchesType = selectedType === 'ALL' || c.type === selectedType;
    return matchesSearch && matchesType;
  });

  const getTypeChipColor = (type) => {
    switch (type) {
      case 'Hospital':
        return 'primary';
      case 'Clinic':
        return 'secondary';
      case 'Diagnostic Center':
        return 'info';
      case 'Pharmacy':
        return 'success';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} color="primary">
            Hospitals & Healthcare Directory
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Manage registered hospitals, clinics, diagnostic centers, and key doctor contacts.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenAdd}
          sx={{ borderRadius: 2, px: 3, py: 1, textTransform: 'none', fontWeight: 600 }}
        >
          Add Healthcare Facility
        </Button>
      </Box>

      {/* KPI Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={1} sx={{ borderRadius: 2, borderLeft: '4px solid #1976d2' }}>
            <CardContent sx={{ py: 2 }}>
              <Typography variant="body2" color="text.secondary">Total Facilities</Typography>
              <Typography variant="h5" fontWeight={700} color="primary.main">{customers.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={1} sx={{ borderRadius: 2, borderLeft: '4px solid #2e7d32' }}>
            <CardContent sx={{ py: 2 }}>
              <Typography variant="body2" color="text.secondary">Hospitals</Typography>
              <Typography variant="h5" fontWeight={700} color="success.main">
                {customers.filter((c) => c.type === 'Hospital').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={1} sx={{ borderRadius: 2, borderLeft: '4px solid #ed6c02' }}>
            <CardContent sx={{ py: 2 }}>
              <Typography variant="body2" color="text.secondary">Clinics & Centers</Typography>
              <Typography variant="h5" fontWeight={700} color="warning.main">
                {customers.filter((c) => c.type === 'Clinic' || c.type === 'Diagnostic Center').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={1} sx={{ borderRadius: 2, borderLeft: '4px solid #9c27b0' }}>
            <CardContent sx={{ py: 2 }}>
              <Typography variant="body2" color="text.secondary">Pharmacies & Others</Typography>
              <Typography variant="h5" fontWeight={700} color="secondary.main">
                {customers.filter((c) => c.type === 'Pharmacy' || c.type === 'Other').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filter & Search Bar */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }} elevation={1}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search by facility name, doctor/contact, city, or phone..."
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
          <Grid item xs={12} md={4}>
            <TextField
              select
              fullWidth
              size="small"
              label="Facility Type Filter"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              <MenuItem value="ALL">All Types</MenuItem>
              {ALL_CUSTOMER_TYPES.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={2} sx={{ textAlign: { md: 'right' } }}>
            <Typography variant="body2" color="text.secondary">
              Showing {filteredCustomers.length} of {customers.length}
            </Typography>
          </Grid>
        </Grid>
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
                <TableCell fontWeight={700}>Facility / Hospital</TableCell>
                <TableCell fontWeight={700}>Type</TableCell>
                <TableCell fontWeight={700}>Key Contact / Doctor</TableCell>
                <TableCell fontWeight={700}>Contact Details</TableCell>
                <TableCell fontWeight={700}>Location / City</TableCell>
                <TableCell align="right" fontWeight={700}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {status === 'loading' && customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={36} />
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Loading facilities...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <LocalHospitalIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                    <Typography variant="subtitle1" color="text.secondary">
                      No healthcare facilities found.
                    </Typography>
                    <Button variant="text" startIcon={<AddIcon />} onClick={handleOpenAdd} sx={{ mt: 1 }}>
                      Add your first facility
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                filteredCustomers
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((customer) => (
                    <TableRow key={customer.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <BusinessIcon color="primary" />
                          <Box>
                            <Typography variant="subtitle2" fontWeight={600}>
                              {customer.name}
                            </Typography>
                            {customer.notes && (
                              <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 200, display: 'block' }}>
                                {customer.notes}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={customer.type || 'Hospital'}
                          color={getTypeChipColor(customer.type)}
                          size="small"
                          sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {customer.contactPerson || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {customer.phone && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                            <PhoneIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                            <Typography variant="body2">{customer.phone}</Typography>
                          </Box>
                        )}
                        {customer.email && (
                          <Typography variant="caption" color="text.secondary">
                            {customer.email}
                          </Typography>
                        )}
                        {!customer.phone && !customer.email && '—'}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                          <LocationOnIcon sx={{ fontSize: 16, color: 'error.light', mt: 0.2 }} />
                          <Box>
                            <Typography variant="body2">{customer.city || customer.address || '—'}</Typography>
                            {customer.latitude && customer.longitude && (
                              <Typography variant="caption" color="text.secondary">
                                [{Number(customer.latitude).toFixed(4)}, {Number(customer.longitude).toFixed(4)}]
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Edit Facility">
                          <IconButton size="small" color="primary" onClick={() => handleOpenEdit(customer)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Facility">
                          <IconButton size="small" color="error" onClick={() => handleDeletePrompt(customer)}>
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
          count={filteredCustomers.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </Paper>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle fontWeight={700}>
          {isEditing ? 'Edit Healthcare Facility' : 'Add New Healthcare Facility'}
        </DialogTitle>
        <form onSubmit={handleSave}>
          <DialogContent dividers>
            {formError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {formError}
              </Alert>
            )}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={8}>
                <TextField
                  fullWidth
                  required
                  label="Facility / Hospital Name"
                  placeholder="e.g. Apollo Super Specialty Hospital"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  select
                  fullWidth
                  required
                  label="Type"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  {ALL_CUSTOMER_TYPES.map((t) => (
                    <MenuItem key={t} value={t}>
                      {t}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Key Contact / Doctor Name"
                  placeholder="e.g. Dr. Rajesh Sharma (Head of Surgery)"
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Contact Phone"
                  placeholder="e.g. +91 9876543210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="email"
                  label="Email Address"
                  placeholder="e.g. procurement@apollo.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="City"
                  placeholder="e.g. Chennai, Bangalore"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Full Street Address"
                  placeholder="e.g. 21 Greams Lane, Thousand Lights"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  inputProps={{ step: 'any' }}
                  label="Latitude (GPS)"
                  placeholder="e.g. 13.0827"
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  inputProps={{ step: 'any' }}
                  label="Longitude (GPS)"
                  placeholder="e.g. 80.2707"
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Internal Notes / Special Requirements"
                  placeholder="e.g. Best time to meet: Tue & Thu after 3 PM"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={handleCloseDialog} color="inherit">
              Cancel
            </Button>
            <Button type="submit" variant="contained" color="primary">
              {isEditing ? 'Save Changes' : 'Add Facility'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle fontWeight={700}>Confirm Facility Deletion</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{customerToDelete?.name}</strong>? This action cannot be undone.
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
    </Box>
  );
};

export default CustomersPage;
