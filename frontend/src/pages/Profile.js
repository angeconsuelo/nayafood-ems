import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  IconButton,
  InputAdornment,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Select,
  TextField,
  Typography
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import axios from 'axios';
import { API_URL } from '../config/api';
import { getAuthConfig, getStoredUser } from '../utils/auth';

export default function Profile() {
  const storedUser = getStoredUser();
  const isWorker = storedUser?.role === 'worker';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submittingComplaint, setSubmittingComplaint] = useState(false);
  const [profile, setProfile] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [message, setMessage] = useState({ type: 'info', text: '' });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    firstName: storedUser?.firstName || '',
    lastName: storedUser?.lastName || '',
    employeeFirstName: '',
    employeeLastName: '',
    birthDate: '',
    phoneNumber: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [complaintForm, setComplaintForm] = useState({
    category: 'general',
    subject: '',
    message: ''
  });

  const fetchPageData = async () => {
    setLoading(true);
    try {
      const [profileRes, complaintsRes] = await Promise.all([
        axios.get(`${API_URL}/auth/profile`, getAuthConfig()),
        axios.get(`${API_URL}/complaints/my`, getAuthConfig()).catch(() => ({ data: [] }))
      ]);

      const loadedProfile = profileRes.data;
      setProfile(loadedProfile);
      setComplaints(complaintsRes.data || []);
      setFormData((current) => ({
        ...current,
        firstName: loadedProfile.firstName || '',
        lastName: loadedProfile.lastName || '',
        employeeFirstName: loadedProfile.employee?.firstName || loadedProfile.firstName || '',
        employeeLastName: loadedProfile.employee?.lastName || loadedProfile.lastName || '',
        birthDate: loadedProfile.employee?.birthDate || '',
        phoneNumber: loadedProfile.profileMeta?.phoneNumber || '',
        emergencyContactName: loadedProfile.employee?.emergencyContactName || '',
        emergencyContactPhone: loadedProfile.employee?.emergencyContactPhone || ''
      }));
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to load profile' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPageData();
  }, []);

  const handleChange = (field) => (event) => {
    setFormData((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleSave = async () => {
    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      setMessage({ type: 'error', text: 'New password and confirm password do not match' });
      return;
    }

    setSaving(true);
    setMessage({ type: 'info', text: '' });

    try {
      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        employeeFirstName: formData.employeeFirstName,
        employeeLastName: formData.employeeLastName,
        birthDate: formData.birthDate || null,
        phoneNumber: formData.phoneNumber,
        emergencyContactName: formData.emergencyContactName,
        emergencyContactPhone: formData.emergencyContactPhone
      };

      if (formData.newPassword) {
        payload.currentPassword = formData.currentPassword;
        payload.newPassword = formData.newPassword;
      }

      const response = await axios.put(`${API_URL}/auth/profile`, payload, getAuthConfig());
      const updatedUser = response.data;
      setProfile(updatedUser);

      localStorage.setItem(
        'user',
        JSON.stringify({
          id: updatedUser.id,
          email: updatedUser.email,
          role: updatedUser.role,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          employee: updatedUser.employee || null
        })
      );

      setFormData((current) => ({
        ...current,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
      setMessage({ type: 'success', text: 'Profile updated successfully' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  const handleComplaintSubmit = async () => {
    if (!complaintForm.subject || !complaintForm.message) {
      setMessage({ type: 'error', text: 'Complaint subject and message are required' });
      return;
    }

    setSubmittingComplaint(true);
    try {
      await axios.post(`${API_URL}/complaints`, complaintForm, getAuthConfig());
      setComplaintForm({ category: 'general', subject: '', message: '' });
      setMessage({ type: 'success', text: 'Complaint submitted successfully' });
      fetchPageData();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to submit complaint' });
    } finally {
      setSubmittingComplaint(false);
    }
  };

  const passwordFieldProps = (shown, setShown) => ({
    type: shown ? 'text' : 'password',
    InputProps: {
      endAdornment: (
        <InputAdornment position="end">
          <IconButton onClick={() => setShown((current) => !current)} edge="end">
            {shown ? <VisibilityOff /> : <Visibility />}
          </IconButton>
        </InputAdornment>
      )
    }
  });

  return (
    <Box>
      <Typography variant="h4" color="primary.main" gutterBottom>
        My Profile
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {isWorker
          ? 'View your employee details and update your phone number or emergency contact information.'
          : 'Update your personal information, review your work details, change your password, and send a complaint when needed.'}
      </Typography>

      {loading && <LinearProgress sx={{ mb: 2 }} />}
      {message.text && (
        <Alert severity={message.type} sx={{ mb: 3 }}>
          {message.text}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Personal Information
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth label="Account First Name" value={formData.firstName} onChange={handleChange('firstName')} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth label="Account Last Name" value={formData.lastName} onChange={handleChange('lastName')} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth label="Employee First Name" value={formData.employeeFirstName} onChange={handleChange('employeeFirstName')} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth label="Employee Last Name" value={formData.employeeLastName} onChange={handleChange('employeeLastName')} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="date"
                    label="Birth Date"
                    value={formData.birthDate}
                    onChange={handleChange('birthDate')}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth label="Phone Number" value={formData.phoneNumber} onChange={handleChange('phoneNumber')} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth label="Emergency Contact Name" value={formData.emergencyContactName} onChange={handleChange('emergencyContactName')} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth label="Emergency Contact Phone" value={formData.emergencyContactPhone} onChange={handleChange('emergencyContactPhone')} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth label="Employee Code" value={profile?.employee?.employeeCode || '-'} InputProps={{ readOnly: true }} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth label="Employment Status" value={profile?.employee?.employmentStatus || '-'} InputProps={{ readOnly: true }} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth label="Department" value={profile?.employee?.department?.name || '-'} InputProps={{ readOnly: true }} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth label="Position" value={profile?.employee?.position?.name || '-'} InputProps={{ readOnly: true }} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth label="Production Line" value={profile?.employee?.productionLine?.name || '-'} InputProps={{ readOnly: true }} />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Password Change
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Use the eye icon to see what you typed before saving.
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField fullWidth label="Current Password" value={formData.currentPassword} onChange={handleChange('currentPassword')} {...passwordFieldProps(showCurrentPassword, setShowCurrentPassword)} />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth label="New Password" value={formData.newPassword} onChange={handleChange('newPassword')} {...passwordFieldProps(showNewPassword, setShowNewPassword)} />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth label="Confirm New Password" value={formData.confirmPassword} onChange={handleChange('confirmPassword')} {...passwordFieldProps(showConfirmPassword, setShowConfirmPassword)} />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {!isWorker && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Complaint Box
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Select
                      fullWidth
                      size="small"
                      value={complaintForm.category}
                      onChange={(event) => setComplaintForm((current) => ({ ...current, category: event.target.value }))}
                    >
                      <MenuItem value="general">General</MenuItem>
                      <MenuItem value="payroll">Payroll</MenuItem>
                      <MenuItem value="attendance">Attendance</MenuItem>
                      <MenuItem value="leave">Leave</MenuItem>
                      <MenuItem value="conduct">Conduct</MenuItem>
                    </Select>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Subject"
                      value={complaintForm.subject}
                      onChange={(event) => setComplaintForm((current) => ({ ...current, subject: event.target.value }))}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      label="Complaint"
                      value={complaintForm.message}
                      onChange={(event) => setComplaintForm((current) => ({ ...current, message: event.target.value }))}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button variant="outlined" onClick={handleComplaintSubmit} disabled={submittingComplaint}>
                      {submittingComplaint ? 'Submitting...' : 'Submit Complaint'}
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>

      <Box sx={{ mt: 3, mb: 3 }}>
        <Button variant="contained" onClick={handleSave} disabled={saving || loading}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </Box>

      {!isWorker && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              My Complaints
            </Typography>
            <List>
              {complaints.length === 0 ? (
                <ListItem>
                  <ListItemText primary="No complaints submitted yet" secondary="Your submitted complaints will appear here." />
                </ListItem>
              ) : (
                complaints.map((complaint) => (
                  <ListItem key={complaint.id} divider>
                    <ListItemText
                      primary={`${complaint.subject} (${complaint.category})`}
                      secondary={`${complaint.status} | ${new Date(complaint.createdAt).toLocaleString()} | ${complaint.message}`}
                    />
                  </ListItem>
                ))
              )}
            </List>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
