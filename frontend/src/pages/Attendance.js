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
  Grid,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  TextField,
  Typography
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { DataGrid } from '@mui/x-data-grid';
import axios from 'axios';
import { format } from 'date-fns';
import { API_URL } from '../config/api';
import { getAuthConfig, getStoredUser, isManagementRole } from '../utils/auth';

const monthOptions = Array.from({ length: 12 }, (_, index) => ({
  value: String(index + 1).padStart(2, '0'),
  label: format(new Date(2026, index, 1), 'MMMM')
}));

const statusColor = {
  present: 'success',
  late: 'warning',
  absent: 'error',
  leave: 'info',
  scheduled: 'default'
};

function StatusChip({ status }) {
  return <Chip size="small" label={status || 'unknown'} color={statusColor[status] || 'default'} />;
}

export default function Attendance() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const user = getStoredUser();
  const managementUser = isManagementRole(user?.role);
  const canRunReports = ['director', 'hr'].includes(user?.role);
  const canMarkAbsent = ['director', 'hr'].includes(user?.role);
  const canVerifyAttendance = ['director', 'hr', 'production_manager', 'shift_supervisor'].includes(user?.role);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'MM'));
  const [selectedYear, setSelectedYear] = useState(format(new Date(), 'yyyy'));
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState({});
  const [employees, setEmployees] = useState([]);
  const [openAbsentDialog, setOpenAbsentDialog] = useState(false);
  const [openVerifyDialog, setOpenVerifyDialog] = useState(false);
  const [verifyMode, setVerifyMode] = useState('checkin');
  const [absentForm, setAbsentForm] = useState({
    employeeId: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    reason: ''
  });
  const [verifyForm, setVerifyForm] = useState({
    employeeCode: '',
    notes: ''
  });

  useEffect(() => {
    const fetchAttendance = async () => {
      setLoading(true);
      try {
        const authConfig = getAuthConfig();

        if (canMarkAbsent) {
          const employeesRes = await axios.get(`${API_URL}/employees?limit=500`, authConfig).catch(() => ({ data: { data: [] } }));
          setEmployees(employeesRes.data.data || []);
        }

        if (managementUser) {
          const response = canRunReports
            ? await axios.get(`${API_URL}/attendance/report?startDate=${selectedDate}&endDate=${selectedDate}`, authConfig)
            : await axios.get(`${API_URL}/attendance/today`, authConfig);

          const details = response.data.details || [];
          setRows(
            details.map((record) => ({
              id: record.id,
              employeeName: `${record.employee?.firstName || ''} ${record.employee?.lastName || ''}`.trim(),
              employeeCode: record.employee?.employeeCode || '-',
              line: record.employee?.productionLine?.name || '-',
              shift: record.scheduledShift?.name || record.shift?.name || '-',
              date: record.date,
              status: record.status,
              lateMinutes: record.lateMinutes || 0,
              checkInTime: record.checkInTime ? format(new Date(record.checkInTime), 'HH:mm') : '-',
              checkOutTime: record.checkOutTime ? format(new Date(record.checkOutTime), 'HH:mm') : '-',
              sanctionApplied: record.sanctionApplied ? 'Yes' : 'No',
              sanctionAmount: record.sanctionAmount || 0,
              nightBonusEarned: record.nightBonusEarned ? 'Yes' : 'No'
            }))
          );
          setStats(response.data.summary || {});
        } else {
          const response = await axios.get(
            `${API_URL}/attendance/my-history?month=${selectedMonth}&year=${selectedYear}`,
            authConfig
          );

          const records = response.data.records || [];
          setRows(
            records.map((record) => ({
              id: record.id,
              date: record.date,
              shift: record.scheduledShift?.name || '-',
              status: record.status,
              checkInTime: record.checkInTime ? format(new Date(record.checkInTime), 'HH:mm') : '-',
              checkOutTime: record.checkOutTime ? format(new Date(record.checkOutTime), 'HH:mm') : '-',
              lateMinutes: record.lateMinutes || 0,
              sanctionAmount: record.sanctionAmount || 0,
              nightBonusEarned: record.nightBonusEarned ? 'Yes' : 'No'
            }))
          );
          setStats(response.data.stats || {});
        }
      } catch (error) {
        console.error('Error loading attendance:', error);
        setRows([]);
        setStats({});
      } finally {
        setLoading(false);
      }
    };

    fetchAttendance();
  }, [canMarkAbsent, canRunReports, managementUser, selectedDate, selectedMonth, selectedYear]);

  const handleMarkAbsent = async () => {
    try {
      if (!absentForm.employeeId) {
        return;
      }

      setLoading(true);
      await axios.post(`${API_URL}/attendance/mark-absent`, absentForm, getAuthConfig());
      setOpenAbsentDialog(false);
      setAbsentForm({
        employeeId: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        reason: ''
      });
      const response = canRunReports
        ? await axios.get(`${API_URL}/attendance/report?startDate=${selectedDate}&endDate=${selectedDate}`, getAuthConfig())
        : await axios.get(`${API_URL}/attendance/today`, getAuthConfig());
      const details = response.data.details || [];
      setRows(
        details.map((record) => ({
          id: record.id,
          employeeName: `${record.employee?.firstName || ''} ${record.employee?.lastName || ''}`.trim(),
          employeeCode: record.employee?.employeeCode || '-',
          line: record.employee?.productionLine?.name || '-',
          shift: record.scheduledShift?.name || record.shift?.name || '-',
          date: record.date,
          status: record.status,
          lateMinutes: record.lateMinutes || 0,
          checkInTime: record.checkInTime ? format(new Date(record.checkInTime), 'HH:mm') : '-',
          checkOutTime: record.checkOutTime ? format(new Date(record.checkOutTime), 'HH:mm') : '-',
          sanctionApplied: record.sanctionApplied ? 'Yes' : 'No',
          sanctionAmount: record.sanctionAmount || 0,
          nightBonusEarned: record.nightBonusEarned ? 'Yes' : 'No'
        }))
      );
      setStats(response.data.summary || {});
    } catch (error) {
      console.error('Error marking absent:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAttendance = async () => {
    try {
      if (!verifyForm.employeeCode) {
        return;
      }

      setLoading(true);
      await axios.post(
        `${API_URL}/attendance/${verifyMode}`,
        verifyMode === 'checkin'
          ? verifyForm
          : { employeeCode: verifyForm.employeeCode },
        getAuthConfig()
      );
      setOpenVerifyDialog(false);
      setVerifyForm({ employeeCode: '', notes: '' });
      const response = canRunReports
        ? await axios.get(`${API_URL}/attendance/report?startDate=${selectedDate}&endDate=${selectedDate}`, getAuthConfig())
        : await axios.get(`${API_URL}/attendance/today`, getAuthConfig());
      const details = response.data.details || [];
      setRows(
        details.map((record) => ({
          id: record.id,
          employeeName: `${record.employee?.firstName || ''} ${record.employee?.lastName || ''}`.trim(),
          employeeCode: record.employee?.employeeCode || '-',
          line: record.employee?.productionLine?.name || '-',
          shift: record.scheduledShift?.name || record.shift?.name || '-',
          date: record.date,
          status: record.status,
          lateMinutes: record.lateMinutes || 0,
          checkInTime: record.checkInTime ? format(new Date(record.checkInTime), 'HH:mm') : '-',
          checkOutTime: record.checkOutTime ? format(new Date(record.checkOutTime), 'HH:mm') : '-',
          sanctionApplied: record.sanctionApplied ? 'Yes' : 'No',
          sanctionAmount: record.sanctionAmount || 0,
          nightBonusEarned: record.nightBonusEarned ? 'Yes' : 'No'
        }))
      );
      setStats(response.data.summary || {});
    } catch (error) {
      console.error('Error verifying attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = () => {
    const headers = managementUser
      ? ['Employee', 'Code', 'Line', 'Shift', 'Date', 'Status', 'Late Minutes', 'Check In', 'Check Out', 'Sanction Applied', 'Bonus or Sanction', 'Night Bonus']
      : ['Date', 'Shift', 'Status', 'Late Minutes', 'Check In', 'Check Out', 'Night Bonus', 'Bonus or Sanction'];
    const data = managementUser
      ? rows.map((row) => [
          row.employeeName,
          row.employeeCode,
          row.line,
          row.shift,
          row.date,
          row.status,
          row.lateMinutes,
          row.checkInTime,
          row.checkOutTime,
          row.sanctionApplied,
          row.sanctionAmount,
          row.nightBonusEarned
        ])
      : rows.map((row) => [
          row.date,
          row.shift,
          row.status,
          row.lateMinutes,
          row.checkInTime,
          row.checkOutTime,
          row.nightBonusEarned,
          row.sanctionAmount
        ]);

    const csv = [headers.join(','), ...data.map((entry) => entry.map((value) => `"${value ?? ''}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance-report-${selectedDate}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const columns = useMemo(() => {
    if (managementUser) {
      return [
        { field: 'employeeName', headerName: 'Employee', width: 180 },
        { field: 'employeeCode', headerName: 'Code', width: 100 },
        { field: 'line', headerName: 'Line', width: 160 },
        { field: 'shift', headerName: 'Shift', width: 120 },
        { field: 'checkInTime', headerName: 'Check In', width: 100 },
        { field: 'checkOutTime', headerName: 'Check Out', width: 100 },
        { field: 'lateMinutes', headerName: 'Late (min)', width: 100 },
        ...(canRunReports
          ? [
              { field: 'nightBonusEarned', headerName: 'Night Bonus', width: 110 },
              { field: 'sanctionApplied', headerName: 'Sanction', width: 100 },
              { field: 'sanctionAmount', headerName: 'Bonus/Sanction', width: 130 }
            ]
          : []),
        {
          field: 'status',
          headerName: 'Status',
          width: 120,
          renderCell: (params) => <StatusChip status={params.value} />
        }
      ];
    }

    return [
      { field: 'date', headerName: 'Date', width: 120 },
      { field: 'shift', headerName: 'Shift', width: 120 },
      { field: 'checkInTime', headerName: 'Check In', width: 100 },
      { field: 'checkOutTime', headerName: 'Check Out', width: 100 },
      { field: 'lateMinutes', headerName: 'Late (min)', width: 100 },
      { field: 'nightBonusEarned', headerName: 'Night Bonus', width: 110 },
      { field: 'sanctionAmount', headerName: 'Bonus/Sat.', width: 110 },
      {
        field: 'status',
        headerName: 'Status',
        width: 120,
        renderCell: (params) => <StatusChip status={params.value} />
      }
    ];
  }, [canRunReports, managementUser]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'stretch', md: 'center' }, mb: 3, gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h4" color="primary.main">
            {user?.role === 'shift_supervisor' ? 'Shift Attendance' : managementUser ? 'Attendance Management' : 'My Attendance'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {user?.role === 'shift_supervisor'
              ? 'Check employees in and out for your current shift and review late or absent records.'
              : managementUser
              ? 'Review daily attendance records across the workforce.'
              : 'Review your attendance history, check-in and check-out times, late minutes, and earned bonuses.'}
          </Typography>
        </Box>

        {managementUser ? (
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', width: { xs: '100%', md: 'auto' } }}>
            <TextField
              size="small"
              type="date"
              label="Date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            {canRunReports && (
              <Button variant="outlined" onClick={handleExportReport} size={isMobile ? 'large' : 'medium'} fullWidth={isMobile}>
                Export Report
              </Button>
            )}
            {canMarkAbsent && (
              <Button variant="contained" onClick={() => setOpenAbsentDialog(true)} size={isMobile ? 'large' : 'medium'} fullWidth={isMobile}>
                Mark Absent
              </Button>
            )}
            {canVerifyAttendance && (
              <>
                <Button
                  variant="outlined"
                  size={isMobile ? 'large' : 'medium'}
                  fullWidth={isMobile}
                  onClick={() => {
                    setVerifyMode('checkin');
                    setOpenVerifyDialog(true);
                  }}
                >
                  Verify Check-In
                </Button>
                <Button
                  variant="outlined"
                  size={isMobile ? 'large' : 'medium'}
                  fullWidth={isMobile}
                  onClick={() => {
                    setVerifyMode('checkout');
                    setOpenVerifyDialog(true);
                  }}
                >
                  Verify Check-Out
                </Button>
              </>
            )}
          </Box>
        ) : (
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', width: { xs: '100%', md: 'auto' } }}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Month</InputLabel>
              <Select value={selectedMonth} label="Month" onChange={(event) => setSelectedMonth(event.target.value)}>
                {monthOptions.map((month) => (
                  <MenuItem key={month.value} value={month.value}>
                    {month.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 110 }}>
              <InputLabel>Year</InputLabel>
              <Select value={selectedYear} label="Year" onChange={(event) => setSelectedYear(event.target.value)}>
                {['2024', '2025', '2026', '2027'].map((year) => (
                  <MenuItem key={year} value={year}>
                    {year}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        )}
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {!managementUser && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Your worker account can only view your own attendance records and bonus history.
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {(managementUser
          ? [
              ['Present', stats.present || 0],
              ['Late', stats.late || 0],
              ['Absent', stats.absent || 0],
              [canRunReports ? 'Night Bonuses' : 'Not Checked In', canRunReports ? stats.totalNightBonuses || 0 : stats.notCheckedIn || 0]
            ]
          : [
              ['Present', stats.present || 0],
              ['Late', stats.late || 0],
              ['Absent', stats.absent || 0],
              ['Night Bonuses', stats.nightBonuses || 0]
            ]
        ).map(([title, value]) => (
          <Grid item xs={12} sm={6} md={3} key={title}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {title}
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

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
                minWidth: isMobile ? (managementUser ? 980 : 760) : 'auto',
                '& .MuiDataGrid-cell, & .MuiDataGrid-columnHeaderTitle': {
                  whiteSpace: 'nowrap'
                }
              }}
            />
          </Box>
        </CardContent>
      </Card>

      <Dialog open={openAbsentDialog} onClose={() => setOpenAbsentDialog(false)} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle>Mark Employee Absent</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Employee</InputLabel>
                <Select
                  value={absentForm.employeeId}
                  label="Employee"
                  onChange={(event) => setAbsentForm((current) => ({ ...current, employeeId: event.target.value }))}
                >
                  {employees.map((employee) => (
                    <MenuItem key={employee.id} value={employee.id}>
                      {employee.firstName} {employee.lastName} ({employee.employeeCode})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="date"
                label="Date"
                value={absentForm.date}
                onChange={(event) => setAbsentForm((current) => ({ ...current, date: event.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Reason"
                value={absentForm.reason}
                onChange={(event) => setAbsentForm((current) => ({ ...current, reason: event.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAbsentDialog(false)} fullWidth={isMobile}>Cancel</Button>
          <Button variant="contained" onClick={handleMarkAbsent} fullWidth={isMobile}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openVerifyDialog} onClose={() => setOpenVerifyDialog(false)} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle>{verifyMode === 'checkin' ? 'Verify Check-In' : 'Verify Check-Out'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Employee Code"
                value={verifyForm.employeeCode}
                onChange={(event) => setVerifyForm((current) => ({ ...current, employeeCode: event.target.value }))}
              />
            </Grid>
            {verifyMode === 'checkin' && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Notes"
                  value={verifyForm.notes}
                  onChange={(event) => setVerifyForm((current) => ({ ...current, notes: event.target.value }))}
                />
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenVerifyDialog(false)} fullWidth={isMobile}>Cancel</Button>
          <Button variant="contained" onClick={handleVerifyAttendance} fullWidth={isMobile}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
