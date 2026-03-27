import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  LinearProgress,
  MenuItem,
  Select,
  TextField,
  Typography
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import axios from 'axios';
import { API_URL } from '../config/api';
import { getAuthConfig } from '../utils/auth';

const emptyForm = {
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  role: 'worker'
};

export default function UserManagement() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState(emptyForm);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/users`, getAuthConfig());
      setUsers(response.data || []);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingUser) {
        await axios.put(`${API_URL}/users/${editingUser.id}`, formData, getAuthConfig());
      } else {
        await axios.post(`${API_URL}/users`, formData, getAuthConfig());
      }
      setOpenDialog(false);
      setEditingUser(null);
      setFormData(emptyForm);
      setMessage('User saved successfully');
      fetchUsers();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async (user) => {
    const newPassword = window.prompt(`Enter a new password for ${user.email}`);
    if (!newPassword) {
      return;
    }

    try {
      await axios.put(`${API_URL}/users/${user.id}/reset-password`, { newPassword }, getAuthConfig());
      setMessage('Password reset successfully');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to reset password');
    }
  };

  const handleDeactivate = async (user) => {
    try {
      await axios.delete(`${API_URL}/users/${user.id}`, getAuthConfig());
      setMessage('User deactivated successfully');
      fetchUsers();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to deactivate user');
    }
  };

  const columns = [
    { field: 'email', headerName: 'Email', width: 220 },
    { field: 'firstName', headerName: 'First Name', width: 130 },
    { field: 'lastName', headerName: 'Last Name', width: 130 },
    { field: 'role', headerName: 'Role', width: 150 },
    {
      field: 'isActive',
      headerName: 'Active',
      width: 100,
      valueGetter: (params) => (params.value ? 'Yes' : 'No')
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 260,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="small"
            onClick={() => {
              setEditingUser(params.row);
              setFormData({
                email: params.row.email,
                password: '',
                firstName: params.row.firstName || '',
                lastName: params.row.lastName || '',
                role: params.row.role
              });
              setOpenDialog(true);
            }}
          >
            Edit
          </Button>
          <Button size="small" onClick={() => handleResetPassword(params.row)}>
            Reset Password
          </Button>
          <Button size="small" color="error" onClick={() => handleDeactivate(params.row)}>
            Deactivate
          </Button>
        </Box>
      )
    }
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" color="primary.main" gutterBottom>
            User Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Director-only user creation, editing, deactivation, and password resets.
          </Typography>
        </Box>
        <Button
          variant="contained"
          onClick={() => {
            setEditingUser(null);
            setFormData(emptyForm);
            setOpenDialog(true);
          }}
        >
          New User
        </Button>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}
      {message && <Alert severity="info" sx={{ mb: 3 }}>{message}</Alert>}

      <Card>
        <CardContent>
          <DataGrid rows={users} columns={columns} autoHeight pageSize={10} rowsPerPageOptions={[10, 25, 50]} />
        </CardContent>
      </Card>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingUser ? 'Edit User' : 'Create User'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Email" value={formData.email} onChange={(e) => setFormData((c) => ({ ...c, email: e.target.value }))} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Password" type="password" value={formData.password} onChange={(e) => setFormData((c) => ({ ...c, password: e.target.value }))} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="First Name" value={formData.firstName} onChange={(e) => setFormData((c) => ({ ...c, firstName: e.target.value }))} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Last Name" value={formData.lastName} onChange={(e) => setFormData((c) => ({ ...c, lastName: e.target.value }))} />
            </Grid>
            <Grid item xs={12} md={6}>
              <Select fullWidth value={formData.role} onChange={(e) => setFormData((c) => ({ ...c, role: e.target.value }))}>
                <MenuItem value="director">Director</MenuItem>
                <MenuItem value="hr">HR</MenuItem>
                <MenuItem value="production_manager">Production Manager</MenuItem>
                <MenuItem value="shift_supervisor">Shift Supervisor</MenuItem>
                <MenuItem value="department_head">Department Head</MenuItem>
                <MenuItem value="worker">Worker</MenuItem>
              </Select>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save User'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
