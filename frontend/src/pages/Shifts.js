import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Grid,
  Checkbox,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Snackbar,
  TextField,
  Typography
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { DataGrid } from '@mui/x-data-grid';
import axios from 'axios';
import { format, startOfWeek } from 'date-fns';
import { API_URL } from '../config/api';
import { getAuthConfig, getStoredUser, isManagementRole } from '../utils/auth';

const shiftStyles = {
  morning: { bg: '#F3E5F5', color: '#5E35B1' },
  afternoon: { bg: '#EDE7F6', color: '#4527A0' },
  night: { bg: '#D1C4E9', color: '#311B92' }
};

function ShiftChip({ value }) {
  const style = shiftStyles[value] || { bg: '#EEE', color: '#333' };
  return <Chip size="small" label={value || 'Unknown'} sx={{ bgcolor: style.bg, color: style.color, fontWeight: 600 }} />;
}

export default function Shifts() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const user = getStoredUser();
  const managementUser = ['director', 'hr', 'production_manager'].includes(user?.role);
  const canGenerateSchedules = ['director', 'production_manager'].includes(user?.role);
  const canOverrideSchedules = user?.role === 'director';
  const canAssignLines = ['director', 'production_manager'].includes(user?.role);
  const [loading, setLoading] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState(
    format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  );
  const [rotationWeeks, setRotationWeeks] = useState(3);
  const [productionLines, setProductionLines] = useState([]);
  const [shiftOptions, setShiftOptions] = useState([]);
  const [selectedLine, setSelectedLine] = useState('');
  const [rows, setRows] = useState([]);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [openOverrideDialog, setOpenOverrideDialog] = useState(false);
  const [openAssignLineDialog, setOpenAssignLineDialog] = useState(false);
  const [overrideForm, setOverrideForm] = useState({
    shiftId: '',
    productionLineId: '',
    notes: '',
    isOvertime: false
  });
  const [assignLineForm, setAssignLineForm] = useState({
    employeeId: '',
    productionLineId: ''
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const showMessage = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const authConfig = getAuthConfig();

      if (managementUser) {
        const [masterDataRes, schedulesRes] = await Promise.all([
          axios.get(`${API_URL}/master-data`, authConfig),
          axios.get(
            `${API_URL}/shifts/schedules?weekStart=${selectedWeek}${selectedLine ? `&lineId=${selectedLine}` : ''}`,
            authConfig
          )
        ]);

        setProductionLines(masterDataRes.data.productionLines || []);
        setShiftOptions(masterDataRes.data.shifts || []);
        setRows(
          (schedulesRes.data.schedules || []).map((schedule) => ({
            id: schedule.id,
            employeeId: schedule.employee?.id,
            employeeName: `${schedule.employee?.firstName || ''} ${schedule.employee?.lastName || ''}`.trim(),
            employeeCode: schedule.employee?.employeeCode || '-',
            date: schedule.date,
            day: format(new Date(schedule.date), 'EEEE'),
            line: schedule.productionLine?.name || '-',
            productionLineId: schedule.productionLine?.id || '',
            shift: schedule.shift?.name || '-',
            shiftId: schedule.shift?.id || '',
            time: `${schedule.shift?.startTime || '--:--'} - ${schedule.shift?.endTime || '--:--'}`,
            notes: schedule.notes || '',
            isOvertime: Boolean(schedule.isOvertime)
          }))
        );
      } else {
        const response = await axios.get(`${API_URL}/shifts/my-schedule?weekStart=${selectedWeek}`, authConfig);
        setRows(
          (response.data || []).map((schedule) => ({
            id: schedule.id,
            date: schedule.date,
            day: format(new Date(schedule.date), 'EEEE'),
            line: schedule.productionLine?.name || '-',
            shift: schedule.shift?.name || '-',
            time: `${schedule.shift?.startTime || '--:--'} - ${schedule.shift?.endTime || '--:--'}`
          }))
        );
      }
    } catch (error) {
      console.error('Error loading shifts:', error);
      setRows([]);
      showMessage(error.response?.data?.message || 'Failed to load shift data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [managementUser, selectedWeek, selectedLine]);

  const handleGenerateRotation = async () => {
    try {
      setLoading(true);
      await axios.post(
        `${API_URL}/shifts/generate-rotation`,
        { startDate: selectedWeek, weeks: rotationWeeks },
        getAuthConfig()
      );
      await axios.post(
        `${API_URL}/shifts/generate-schedules`,
        { weekStartDate: selectedWeek },
        getAuthConfig()
      );
      showMessage('Shift rotations and schedules generated successfully');
      fetchData();
    } catch (error) {
      showMessage(error.response?.data?.message || 'Failed to generate schedules', 'error');
      setLoading(false);
    }
  };

  const handleDryWeek = async () => {
    try {
      setLoading(true);
      await axios.post(`${API_URL}/shifts/dry-week`, { weekStartDate: selectedWeek }, getAuthConfig());
      showMessage('Dry biscuit week applied. Three shifts remain active for all employees.');
      fetchData();
    } catch (error) {
      showMessage(error.response?.data?.message || 'Failed to mark dry week', 'error');
      setLoading(false);
    }
  };

  const handleOpenOverride = (schedule) => {
    setSelectedSchedule(schedule);
    setOverrideForm({
      shiftId: schedule.shiftId || '',
      productionLineId: schedule.productionLineId || '',
      notes: schedule.notes || '',
      isOvertime: Boolean(schedule.isOvertime)
    });
    setOpenOverrideDialog(true);
  };

  const handleOverrideSchedule = async () => {
    if (!selectedSchedule) {
      return;
    }

    try {
      setLoading(true);
      await axios.put(`${API_URL}/shifts/schedules/${selectedSchedule.id}`, overrideForm, getAuthConfig());
      showMessage('Schedule override saved successfully');
      setOpenOverrideDialog(false);
      setSelectedSchedule(null);
      fetchData();
    } catch (error) {
      showMessage(error.response?.data?.message || 'Failed to override schedule', 'error');
      setLoading(false);
    }
  };

  const handleOpenAssignLine = (schedule) => {
    setSelectedSchedule(schedule);
    setAssignLineForm({
      employeeId: schedule.employeeId || '',
      productionLineId: schedule.productionLineId || ''
    });
    setOpenAssignLineDialog(true);
  };

  const handleAssignLine = async () => {
    try {
      if (!assignLineForm.employeeId || !assignLineForm.productionLineId) {
        return;
      }

      setLoading(true);
      await axios.put(
        `${API_URL}/employees/${assignLineForm.employeeId}/assign-line`,
        { productionLineId: assignLineForm.productionLineId },
        getAuthConfig()
      );
      showMessage('Worker assigned to production line successfully');
      setOpenAssignLineDialog(false);
      setSelectedSchedule(null);
      fetchData();
    } catch (error) {
      showMessage(error.response?.data?.message || 'Failed to assign production line', 'error');
      setLoading(false);
    }
  };

  const columns = useMemo(() => {
    const shared = [
      { field: 'date', headerName: 'Date', width: 120 },
      { field: 'day', headerName: 'Day', width: 130 },
      { field: 'line', headerName: 'Line', width: 180 },
      { field: 'time', headerName: 'Time', width: 150 },
      {
        field: 'shift',
        headerName: 'Shift',
        width: 130,
        renderCell: (params) => <ShiftChip value={params.value} />
      }
    ];

    return managementUser
      ? [
          { field: 'employeeName', headerName: 'Employee', width: 180 },
          { field: 'employeeCode', headerName: 'Code', width: 100 },
          ...shared,
          ...(canOverrideSchedules || canAssignLines
            ? [
                {
                  field: 'actions',
                  headerName: 'Actions',
                  width: 220,
                  renderCell: (params) => (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {canAssignLines && (
                        <Button size="small" variant="outlined" onClick={() => handleOpenAssignLine(params.row)}>
                          Assign Line
                        </Button>
                      )}
                      {canOverrideSchedules && (
                        <Button size="small" variant="outlined" onClick={() => handleOpenOverride(params.row)}>
                          Override
                        </Button>
                      )}
                    </Box>
                  )
                }
              ]
            : [])
        ]
      : shared;
  }, [canAssignLines, canOverrideSchedules, managementUser]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'stretch', md: 'center' }, mb: 3, gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h4" color="primary.main">
            {managementUser ? 'Shift Management' : 'My Schedule'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {managementUser
              ? 'Generate and review production schedules by week.'
              : 'Review your weekly shift times and assigned production line.'}
          </Typography>
        </Box>

        <TextField
          size="small"
          label="Week Start"
          type="date"
          sx={{ width: { xs: '100%', sm: 'auto' } }}
          value={selectedWeek}
          onChange={(event) => setSelectedWeek(event.target.value)}
          InputLabelProps={{ shrink: true }}
        />
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {!managementUser && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Your worker account can only view your own schedule and production line assignment.
        </Alert>
      )}

        {managementUser && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Production Line</InputLabel>
                  <Select
                    value={selectedLine}
                    label="Production Line"
                    onChange={(event) => setSelectedLine(event.target.value)}
                  >
                    <MenuItem value="">All Lines</MenuItem>
                    {productionLines.map((line) => (
                      <MenuItem key={line.id} value={line.id}>
                        {line.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Rotation Weeks"
                  type="number"
                  value={rotationWeeks}
                  onChange={(event) => setRotationWeeks(Number(event.target.value) || 1)}
                />
              </Grid>
              <Grid item xs={12} md={6} sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {canGenerateSchedules && (
                  <>
                    <Button variant="contained" onClick={handleGenerateRotation} fullWidth={isMobile}>
                      Generate Rotations
                    </Button>
                    <Button variant="outlined" onClick={handleDryWeek} fullWidth={isMobile}>
                      Set Dry Biscuit Week
                    </Button>
                  </>
                )}
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent>
          <Box sx={{ width: '100%', overflowX: 'auto' }}>
            <DataGrid
              rows={rows}
              columns={columns}
              autoHeight
              pageSize={10}
              rowsPerPageOptions={[10, 25, 50]}
              disableSelectionOnClick
              loading={loading}
              sx={{
                minWidth: isMobile ? (managementUser ? 980 : 720) : 'auto',
                '& .MuiDataGrid-cell, & .MuiDataGrid-columnHeaderTitle': {
                  whiteSpace: 'nowrap'
                }
              }}
            />
          </Box>
        </CardContent>
      </Card>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar((current) => ({ ...current, open: false }))}
        message={snackbar.message}
      />

      <Dialog open={openAssignLineDialog} onClose={() => setOpenAssignLineDialog(false)} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle>Assign Worker To Production Line</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary">
                {selectedSchedule?.employeeName || 'Employee'}
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Production Line</InputLabel>
                <Select
                  value={assignLineForm.productionLineId}
                  label="Production Line"
                  onChange={(event) => setAssignLineForm((current) => ({ ...current, productionLineId: event.target.value }))}
                >
                  {productionLines.map((line) => (
                    <MenuItem key={line.id} value={line.id}>
                      {line.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAssignLineDialog(false)} fullWidth={isMobile}>Cancel</Button>
          <Button variant="contained" onClick={handleAssignLine} fullWidth={isMobile}>
            Save Assignment
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openOverrideDialog} onClose={() => setOpenOverrideDialog(false)} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle>Override Schedule</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary">
                {selectedSchedule?.employeeName || 'Employee'} on {selectedSchedule?.date || selectedWeek}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Shift</InputLabel>
                <Select
                  value={overrideForm.shiftId}
                  label="Shift"
                  onChange={(event) => setOverrideForm((current) => ({ ...current, shiftId: event.target.value }))}
                >
                  {shiftOptions.map((shift) => (
                    <MenuItem key={shift.id} value={shift.id}>
                      {shift.name} ({shift.time})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Production Line</InputLabel>
                <Select
                  value={overrideForm.productionLineId}
                  label="Production Line"
                  onChange={(event) => setOverrideForm((current) => ({ ...current, productionLineId: event.target.value }))}
                >
                  {productionLines.map((line) => (
                    <MenuItem key={line.id} value={line.id}>
                      {line.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Override Notes"
                value={overrideForm.notes}
                onChange={(event) => setOverrideForm((current) => ({ ...current, notes: event.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={overrideForm.isOvertime}
                    onChange={(event) => setOverrideForm((current) => ({ ...current, isOvertime: event.target.checked }))}
                  />
                }
                label="Mark as overtime"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenOverrideDialog(false)} fullWidth={isMobile}>Cancel</Button>
          <Button variant="contained" onClick={handleOverrideSchedule} fullWidth={isMobile}>
            Save Override
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
