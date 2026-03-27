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
  Snackbar,
  TextField,
  Typography
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { DataGrid } from '@mui/x-data-grid';
import axios from 'axios';
import { addDays, differenceInDays, format } from 'date-fns';
import { API_URL } from '../config/api';
import { getAuthConfig, getStoredUser, isManagementRole } from '../utils/auth';

const statusColor = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error'
};

function StatusChip({ value }) {
  return <Chip size="small" label={value || 'unknown'} color={statusColor[value] || 'default'} />;
}

export default function Leave() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const user = getStoredUser();
  const managementUser = isManagementRole(user?.role);
  const [loading, setLoading] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [balances, setBalances] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });
  const [formData, setFormData] = useState({
    leaveTypeId: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
    reason: '',
    medicalBookletPath: ''
  });

  const showMessage = (message) => setSnackbar({ open: true, message });

  const normalizedLeaveTypes = useMemo(
    () =>
      leaveTypes.map((type) => ({
        id: type.id,
        name: type.name || type.label || type.code || 'Leave',
        code: type.code || type.name,
        requiresMedical: Boolean(type.requiresMedical || type.requiresMedicalBooklet),
        paid: type.paid ?? type.isPaid ?? true
      })),
    [leaveTypes]
  );

  const normalizeRequest = (request) => ({
    id: request.id,
    employeeName: request.employee ? `${request.employee.firstName} ${request.employee.lastName}` : 'My request',
    employeeCode: request.employee?.employeeCode || '-',
    leaveType: request.leaveType?.name || '-',
    leaveTypeId: request.leaveType?.id,
    startDate: request.startDate,
    endDate: request.endDate,
    days: differenceInDays(new Date(request.endDate), new Date(request.startDate)) + 1,
    status: request.status,
    reason: request.reason,
    approvedBy: request.approver ? `${request.approver.firstName} ${request.approver.lastName}` : '-',
    medicalBookletPath: request.medicalBookletPath || '-'
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const authConfig = getAuthConfig();
      const [masterDataRes, requestsRes, balanceRes] = await Promise.all([
        axios.get(`${API_URL}/master-data`, authConfig),
        axios.get(`${API_URL}/leave/${managementUser ? 'all' : 'my-requests'}`, authConfig),
        axios.get(`${API_URL}/leave/my-balance`, authConfig).catch(() => ({ data: [] }))
      ]);

      setLeaveTypes(masterDataRes.data.leaveTypes || []);
      setLeaveRequests((requestsRes.data || []).map(normalizeRequest));
      setBalances(balanceRes.data || []);
    } catch (error) {
      console.error('Error loading leave data:', error);
      showMessage(error.response?.data?.message || 'Failed to load leave data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [managementUser]);

  const stats = useMemo(
    () => ({
      total: leaveRequests.length,
      pending: leaveRequests.filter((item) => item.status === 'pending').length,
      approved: leaveRequests.filter((item) => item.status === 'approved').length,
      rejected: leaveRequests.filter((item) => item.status === 'rejected').length
    }),
    [leaveRequests]
  );

  const handleSubmitRequest = async () => {
    try {
      if (!formData.leaveTypeId) {
        showMessage('Please select a leave type');
        return;
      }
      const selectedLeaveType = normalizedLeaveTypes.find((type) => Number(type.id) === Number(formData.leaveTypeId));
      if (selectedLeaveType?.requiresMedical && !formData.medicalBookletPath) {
        showMessage('Medical booklet file path or URL is required for this leave type');
        return;
      }
      await axios.post(`${API_URL}/leave/request`, formData, getAuthConfig());
      setOpenDialog(false);
      setFormData({
        leaveTypeId: '',
        startDate: format(new Date(), 'yyyy-MM-dd'),
        endDate: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
        reason: '',
        medicalBookletPath: ''
      });
      showMessage('Leave request submitted successfully');
      fetchData();
    } catch (error) {
      showMessage(error.response?.data?.message || 'Failed to submit leave request');
    }
  };

  const handleApprove = async (request) => {
    try {
      await axios.put(`${API_URL}/leave/${request.id}/approve`, {}, getAuthConfig());
      showMessage('Leave request approved');
      fetchData();
    } catch (error) {
      showMessage(error.response?.data?.message || 'Failed to approve leave request');
    }
  };

  const handleReject = async (request) => {
    try {
      await axios.put(
        `${API_URL}/leave/${request.id}/reject`,
        { rejectionReason: 'Rejected by manager' },
        getAuthConfig()
      );
      showMessage('Leave request rejected');
      fetchData();
    } catch (error) {
      showMessage(error.response?.data?.message || 'Failed to reject leave request');
    }
  };

  const columns = managementUser
    ? [
        { field: 'employeeName', headerName: 'Employee', width: 180 },
        { field: 'employeeCode', headerName: 'Code', width: 100 },
        { field: 'leaveType', headerName: 'Leave Type', width: 140 },
        { field: 'startDate', headerName: 'Start', width: 120 },
        { field: 'endDate', headerName: 'End', width: 120 },
        { field: 'days', headerName: 'Days', width: 80 },
        {
          field: 'medicalBookletPath',
          headerName: 'Medical Booklet',
          width: 170,
          renderCell: (params) => (
            params.row.medicalBookletPath && params.row.medicalBookletPath !== '-'
              ? <Button size="small" onClick={() => setSelectedRequest(params.row)}>View</Button>
              : <Chip size="small" label="Not attached" variant="outlined" />
          )
        },
        {
          field: 'status',
          headerName: 'Status',
          width: 120,
          renderCell: (params) => <StatusChip value={params.value} />
        },
        {
          field: 'actions',
          headerName: 'Actions',
          width: 220,
          renderCell: (params) => (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button size="small" variant="outlined" onClick={() => setSelectedRequest(params.row)}>
                View
              </Button>
              {params.row.status === 'pending' && (
                <>
                  <Button size="small" color="success" onClick={() => handleApprove(params.row)}>
                    Approve
                  </Button>
                  <Button size="small" color="error" onClick={() => handleReject(params.row)}>
                    Reject
                  </Button>
                </>
              )}
            </Box>
          )
        }
      ]
    : [
        { field: 'leaveType', headerName: 'Leave Type', width: 150 },
        { field: 'startDate', headerName: 'Start', width: 120 },
        { field: 'endDate', headerName: 'End', width: 120 },
        { field: 'days', headerName: 'Days', width: 80 },
        { field: 'reason', headerName: 'Reason', width: 220 },
        {
          field: 'status',
          headerName: 'Status',
          width: 120,
          renderCell: (params) => <StatusChip value={params.value} />
        }
      ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'stretch', md: 'center' }, mb: 3, gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h4" color="primary.main">
            {managementUser ? 'Leave Management' : 'Leave Requests'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {managementUser
              ? 'Review, approve, and track leave requests.'
              : 'Apply for leave, upload supporting medical documents when needed, and track your request status.'}
          </Typography>
        </Box>

        <Button
          variant="contained"
          sx={{ width: { xs: '100%', sm: 'auto' } }}
          onClick={() => {
            if (normalizedLeaveTypes.length === 0) {
              fetchData();
            }
            setOpenDialog(true);
          }}
        >
          New Request
        </Button>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {!managementUser && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Your employee account now loads only self-service leave data and balance records.
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {Object.entries(stats).map(([key, value]) => (
          <Grid item xs={12} sm={6} md={3} key={key}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {!managementUser && balances.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Leave Balance
            </Typography>
            <Grid container spacing={2}>
              {balances.map((balance) => (
                <Grid item xs={12} md={4} key={balance.leaveType}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1">{balance.leaveType}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Remaining: {balance.remaining} / {balance.total} days
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent>
          <Box sx={{ width: '100%', overflowX: 'auto' }}>
            <DataGrid
              rows={leaveRequests}
              columns={columns}
              autoHeight
              pageSize={10}
              rowsPerPageOptions={[10, 25, 50]}
              sx={{
                minWidth: isMobile ? (managementUser ? 1180 : 760) : 'auto',
                '& .MuiDataGrid-cell, & .MuiDataGrid-columnHeaderTitle': {
                  whiteSpace: 'nowrap'
                }
              }}
            />
          </Box>
        </CardContent>
      </Card>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth fullScreen={isMobile}>
        <DialogTitle>New Leave Request</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Leave Type</InputLabel>
                <Select
                  value={formData.leaveTypeId}
                  label="Leave Type"
                  onChange={(event) => setFormData((current) => ({ ...current, leaveTypeId: event.target.value }))}
                >
                  {normalizedLeaveTypes.map((type) => (
                    <MenuItem key={type.id} value={type.id}>
                      {type.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {normalizedLeaveTypes.length === 0 && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  No leave types are available yet. Refresh the page or initialize leave types in the database.
                </Alert>
              )}
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="Start Date"
                value={formData.startDate}
                onChange={(event) => setFormData((current) => ({ ...current, startDate: event.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="End Date"
                value={formData.endDate}
                onChange={(event) => setFormData((current) => ({ ...current, endDate: event.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Reason"
                value={formData.reason}
                onChange={(event) => setFormData((current) => ({ ...current, reason: event.target.value }))}
              />
            </Grid>
            {normalizedLeaveTypes.find((type) => Number(type.id) === Number(formData.leaveTypeId))?.requiresMedical && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Medical Booklet File Path or URL"
                  value={formData.medicalBookletPath}
                  onChange={(event) => setFormData((current) => ({ ...current, medicalBookletPath: event.target.value }))}
                  helperText="Required for sick leave. Enter the stored file path or document URL."
                />
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)} fullWidth={isMobile}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmitRequest} fullWidth={isMobile}>
            Submit
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(selectedRequest)} onClose={() => setSelectedRequest(null)} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle>Leave Request Details</DialogTitle>
        <DialogContent>
          {selectedRequest && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  Employee
                </Typography>
                <Typography>{selectedRequest.employeeName}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Leave Type
                </Typography>
                <Typography>{selectedRequest.leaveType}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Status
                </Typography>
                <StatusChip value={selectedRequest.status} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Start
                </Typography>
                <Typography>{selectedRequest.startDate}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  End
                </Typography>
                <Typography>{selectedRequest.endDate}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  Reason
                </Typography>
                <Typography>{selectedRequest.reason}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  Medical Booklet
                </Typography>
                <Typography>
                  {selectedRequest.medicalBookletPath && selectedRequest.medicalBookletPath !== '-'
                    ? selectedRequest.medicalBookletPath
                    : 'No medical booklet attached'}
                </Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedRequest(null)} fullWidth={isMobile}>Close</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar({ open: false, message: '' })}
        message={snackbar.message}
      />
    </Box>
  );
}
