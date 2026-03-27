import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  TextField,
  Typography
} from '@mui/material';
import axios from 'axios';
import { API_URL } from '../config/api';
import { getAuthConfig } from '../utils/auth';

export default function SystemSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [settings, setSettings] = useState({
    nightBonusAmount: 500,
    saturdayBonusAmount: 2000,
    baseSalary: 60000,
    gracePeriodMinutes: 15,
    absenceThresholdHours: 2
  });

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${API_URL}/system-settings`, getAuthConfig());
        setSettings(response.data);
      } catch (error) {
        setMessage(error.response?.data?.message || 'Failed to load system settings');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await axios.put(`${API_URL}/system-settings`, settings, getAuthConfig());
      setSettings(response.data);
      setMessage('System settings updated successfully');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to update system settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" color="primary.main" gutterBottom>
        System Settings
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Director-only business rules and payroll defaults.
      </Typography>
      {loading && <LinearProgress sx={{ mb: 2 }} />}
      {message && <Alert severity="info" sx={{ mb: 3 }}>{message}</Alert>}
      <Card>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField fullWidth type="number" label="Night Bonus Amount" value={settings.nightBonusAmount} onChange={(e) => setSettings((c) => ({ ...c, nightBonusAmount: Number(e.target.value) }))} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth type="number" label="Saturday Bonus Amount" value={settings.saturdayBonusAmount} onChange={(e) => setSettings((c) => ({ ...c, saturdayBonusAmount: Number(e.target.value) }))} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth type="number" label="Base Salary" value={settings.baseSalary} onChange={(e) => setSettings((c) => ({ ...c, baseSalary: Number(e.target.value) }))} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth type="number" label="Grace Period Minutes" value={settings.gracePeriodMinutes} onChange={(e) => setSettings((c) => ({ ...c, gracePeriodMinutes: Number(e.target.value) }))} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth type="number" label="Absence Threshold Hours" value={settings.absenceThresholdHours} onChange={(e) => setSettings((c) => ({ ...c, absenceThresholdHours: Number(e.target.value) }))} />
            </Grid>
          </Grid>
          <Box sx={{ mt: 3 }}>
            <Button variant="contained" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
