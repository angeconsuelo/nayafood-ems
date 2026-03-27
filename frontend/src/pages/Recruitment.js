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
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Tab,
  Tabs,
  TextField,
  Typography
} from '@mui/material';
import {
  Add,
  Assessment,
  CheckCircle,
  Person,
  Schedule,
  Visibility,
  Work
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import axios from 'axios';
import { format } from 'date-fns';
import { API_URL } from '../config/api';
import { getAuthConfig } from '../utils/auth';

const applicantStatuses = ['pending', 'reviewed', 'shortlisted', 'interviewed', 'selected', 'converted', 'rejected'];

export default function Recruitment() {
  const [loading, setLoading] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [positions, setPositions] = useState([]);
  const [productionLines, setProductionLines] = useState([]);
  const [jobPostings, setJobPostings] = useState([]);
  const [applicants, setApplicants] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [openJobDialog, setOpenJobDialog] = useState(false);
  const [openApplicantDialog, setOpenApplicantDialog] = useState(false);
  const [openConvertDialog, setOpenConvertDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState('view');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const [jobForm, setJobForm] = useState({
    title: '',
    positionId: '',
    quantity: 1,
    employmentType: 'temporary',
    description: '',
    requirements: '',
    closingDate: format(new Date(), 'yyyy-MM-dd'),
    status: 'draft'
  });

  const [applicantStatusForm, setApplicantStatusForm] = useState({
    status: 'shortlisted',
    interviewDate: '',
    interviewScore: '',
    interviewFeedback: '',
    notes: ''
  });

  const [convertForm, setConvertForm] = useState({
    employeeCode: '',
    hireDate: format(new Date(), 'yyyy-MM-dd'),
    departmentId: '',
    productionLineId: '',
    emergencyContactName: '',
    emergencyContactPhone: ''
  });

  useEffect(() => {
    fetchRecruitmentData();
  }, []);

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const fetchRecruitmentData = async () => {
    setLoading(true);
    try {
      const [masterDataRes, recruitmentsRes, applicantsRes] = await Promise.all([
        axios.get(`${API_URL}/master-data`, getAuthConfig()),
        axios.get(`${API_URL}/recruitment`, getAuthConfig()),
        axios.get(`${API_URL}/recruitment/applicants`, getAuthConfig())
      ]);

      setPositions(masterDataRes.data.positions || []);
      setProductionLines(masterDataRes.data.productionLines || []);
      setJobPostings(recruitmentsRes.data || []);
      setApplicants(applicantsRes.data || []);
    } catch (error) {
      showSnackbar('Failed to load recruitment data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredApplicants = useMemo(() => {
    return applicants.filter((applicant) => {
      if (selectedJob && applicant.recruitmentId !== selectedJob.id) {
        return false;
      }

      if (tabValue === 1) {
        return applicant.status === 'pending';
      }
      if (tabValue === 2) {
        return applicant.status === 'shortlisted';
      }
      if (tabValue === 3) {
        return applicant.status === 'interviewed';
      }
      if (tabValue === 4) {
        return applicant.status === 'selected' || applicant.status === 'converted';
      }
      if (tabValue === 5) {
        return applicant.status === 'rejected';
      }
      return true;
    });
  }, [applicants, selectedJob, tabValue]);

  const stats = {
    totalJobs: jobPostings.length,
    openJobs: jobPostings.filter((job) => job.status === 'open').length,
    draftJobs: jobPostings.filter((job) => job.status === 'draft').length,
    totalApplicants: applicants.length,
    pending: applicants.filter((applicant) => applicant.status === 'pending').length,
    shortlisted: applicants.filter((applicant) => applicant.status === 'shortlisted').length,
    selected: applicants.filter((applicant) => applicant.status === 'selected' || applicant.status === 'converted').length
  };

  const getJobStatusChip = (status) => {
    const colorMap = {
      draft: 'default',
      open: 'success',
      'in-progress': 'info',
      closed: 'error',
      cancelled: 'warning'
    };
    return <Chip size="small" label={status} color={colorMap[status] || 'default'} />;
  };

  const getApplicantStatusChip = (status) => {
    const colorMap = {
      pending: 'warning',
      reviewed: 'default',
      shortlisted: 'info',
      interviewed: 'primary',
      selected: 'success',
      converted: 'success',
      rejected: 'error'
    };
    return <Chip size="small" label={status} color={colorMap[status] || 'default'} />;
  };

  const openNewJobDialog = () => {
    setJobForm({
      title: '',
      positionId: '',
      quantity: 1,
      employmentType: 'temporary',
      description: '',
      requirements: '',
      closingDate: format(new Date(), 'yyyy-MM-dd'),
      status: 'draft'
    });
    setDialogMode('new');
    setOpenJobDialog(true);
  };

  const openEditJobDialog = (job) => {
    setSelectedJob(job);
    setJobForm({
      title: job.title || '',
      positionId: job.positionId || '',
      quantity: job.quantity || 1,
      employmentType: job.employmentType || 'temporary',
      description: job.description || '',
      requirements: job.requirements || '',
      closingDate: job.closingDate || format(new Date(), 'yyyy-MM-dd'),
      status: job.status || 'draft'
    });
    setDialogMode('edit');
    setOpenJobDialog(true);
  };

  const handleSaveJob = async () => {
    try {
      if (dialogMode === 'new') {
        await axios.post(`${API_URL}/recruitment`, jobForm, getAuthConfig());
        showSnackbar('Job posting created', 'success');
      } else {
        await axios.put(`${API_URL}/recruitment/${selectedJob.id}`, jobForm, getAuthConfig());
        showSnackbar('Job posting updated', 'success');
      }
      setOpenJobDialog(false);
      fetchRecruitmentData();
    } catch (error) {
      showSnackbar(error.response?.data?.message || 'Failed to save job posting', 'error');
    }
  };

  const handleApplicantStatusUpdate = async () => {
    try {
      await axios.put(
        `${API_URL}/recruitment/applicants/${selectedApplicant.id}/status`,
        {
          status: applicantStatusForm.status,
          interviewDate: applicantStatusForm.interviewDate || undefined,
          interviewScore: applicantStatusForm.interviewScore ? Number(applicantStatusForm.interviewScore) : undefined,
          interviewFeedback: applicantStatusForm.interviewFeedback,
          notes: applicantStatusForm.notes
        },
        getAuthConfig()
      );
      showSnackbar('Applicant updated successfully', 'success');
      setOpenApplicantDialog(false);
      fetchRecruitmentData();
    } catch (error) {
      showSnackbar(error.response?.data?.message || 'Failed to update applicant', 'error');
    }
  };

  const openConvertApplicantDialog = (applicant) => {
    setSelectedApplicant(applicant);
    setConvertForm({
      employeeCode: '',
      hireDate: format(new Date(), 'yyyy-MM-dd'),
      departmentId: applicant.recruitment?.position?.departmentId || '',
      productionLineId: '',
      emergencyContactName: '',
      emergencyContactPhone: ''
    });
    setOpenConvertDialog(true);
  };

  const handleConvertApplicant = async () => {
    try {
      await axios.post(
        `${API_URL}/recruitment/applicants/${selectedApplicant.id}/convert`,
        convertForm,
        getAuthConfig()
      );
      showSnackbar('Applicant converted to employee successfully', 'success');
      setOpenConvertDialog(false);
      fetchRecruitmentData();
    } catch (error) {
      showSnackbar(error.response?.data?.message || 'Failed to convert applicant', 'error');
    }
  };

  const jobColumns = [
    { field: 'title', headerName: 'Job Title', width: 220 },
    {
      field: 'position',
      headerName: 'Position',
      width: 170,
      valueGetter: (params) => params.row.position?.name || '-'
    },
    { field: 'employmentType', headerName: 'Type', width: 110 },
    { field: 'quantity', headerName: 'Qty', width: 80 },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => getJobStatusChip(params.value)
    },
    {
      field: 'closingDate',
      headerName: 'Closing',
      width: 110,
      valueGetter: (params) => (params.value ? format(new Date(params.value), 'dd/MM/yy') : '-')
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      renderCell: (params) => (
        <Box>
          <Button size="small" onClick={() => { setSelectedJob(params.row); setDialogMode('view'); setOpenJobDialog(true); }}>
            <Visibility fontSize="small" />
          </Button>
          <Button size="small" onClick={() => openEditJobDialog(params.row)}>
            <Work fontSize="small" />
          </Button>
        </Box>
      )
    }
  ];

  const applicantColumns = [
    {
      field: 'name',
      headerName: 'Applicant',
      width: 200,
      valueGetter: (params) => `${params.row.firstName} ${params.row.lastName}`
    },
    {
      field: 'job',
      headerName: 'Job',
      width: 220,
      valueGetter: (params) => params.row.recruitment?.title || '-'
    },
    { field: 'email', headerName: 'Email', width: 220 },
    {
      field: 'applicationDate',
      headerName: 'Applied',
      width: 110,
      valueGetter: (params) => (params.value ? format(new Date(params.value), 'dd/MM/yy') : '-')
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => getApplicantStatusChip(params.value)
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      renderCell: (params) => (
        <Box>
          <Button
            size="small"
            onClick={() => {
              setSelectedApplicant(params.row);
              setApplicantStatusForm({
                status: params.row.status || 'shortlisted',
                interviewDate: params.row.interviewDate ? format(new Date(params.row.interviewDate), "yyyy-MM-dd'T'HH:mm") : '',
                interviewScore: params.row.interviewScore || '',
                interviewFeedback: params.row.interviewFeedback || '',
                notes: params.row.notes || ''
              });
              setOpenApplicantDialog(true);
            }}
          >
            <Visibility fontSize="small" />
          </Button>
          {(params.row.status === 'selected') && (
            <Button size="small" color="success" onClick={() => openConvertApplicantDialog(params.row)}>
              <CheckCircle fontSize="small" />
            </Button>
          )}
        </Box>
      )
    }
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" color="primary.main">
          Recruitment Management
        </Typography>
        <Box>
          <Button variant="outlined" startIcon={<Assessment />} sx={{ mr: 2 }} onClick={fetchRecruitmentData}>
            Refresh
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={openNewJobDialog}>
            New Job
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={2.4}><Card><CardContent><Typography color="textSecondary">Total Jobs</Typography><Typography variant="h5">{stats.totalJobs}</Typography></CardContent></Card></Grid>
        <Grid item xs={12} sm={6} md={2.4}><Card sx={{ bgcolor: '#F3E5F5' }}><CardContent><Typography color="textSecondary">Open Jobs</Typography><Typography variant="h5">{stats.openJobs}</Typography></CardContent></Card></Grid>
        <Grid item xs={12} sm={6} md={2.4}><Card sx={{ bgcolor: '#EDE7F6' }}><CardContent><Typography color="textSecondary">Draft Jobs</Typography><Typography variant="h5">{stats.draftJobs}</Typography></CardContent></Card></Grid>
        <Grid item xs={12} sm={6} md={2.4}><Card sx={{ bgcolor: '#E3F2FD' }}><CardContent><Typography color="textSecondary">Applicants</Typography><Typography variant="h5">{stats.totalApplicants}</Typography></CardContent></Card></Grid>
        <Grid item xs={12} sm={6} md={2.4}><Card sx={{ bgcolor: '#D1C4E9' }}><CardContent><Typography color="textSecondary">Selected</Typography><Typography variant="h5">{stats.selected}</Typography></CardContent></Card></Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Job Postings</Typography>
              <DataGrid
                rows={jobPostings}
                columns={jobColumns}
                pageSize={5}
                autoHeight
                loading={loading}
                disableSelectionOnClick
                getRowId={(row) => row.id}
                onRowClick={(params) => setSelectedJob(params.row)}
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  {selectedJob ? `Applicants - ${selectedJob.title}` : 'Applicants'}
                </Typography>
                {selectedJob && (
                  <Button size="small" onClick={() => setSelectedJob(null)}>Clear Filter</Button>
                )}
              </Box>
              <Paper sx={{ mb: 2 }}>
                <Tabs value={tabValue} onChange={(event, value) => setTabValue(value)}>
                  <Tab label="All" />
                  <Tab label="Pending" />
                  <Tab label="Shortlisted" />
                  <Tab label="Interviewed" />
                  <Tab label="Selected" />
                  <Tab label="Rejected" />
                </Tabs>
              </Paper>
              <DataGrid
                rows={filteredApplicants}
                columns={applicantColumns}
                pageSize={6}
                autoHeight
                loading={loading}
                disableSelectionOnClick
                getRowId={(row) => row.id}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={openJobDialog} onClose={() => setOpenJobDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {dialogMode === 'new' ? 'New Job Posting' : dialogMode === 'edit' ? 'Edit Job Posting' : 'Job Details'}
        </DialogTitle>
        <DialogContent>
          {dialogMode === 'view' && selectedJob ? (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6">{selectedJob.title}</Typography>
              <Box sx={{ mt: 2 }}>{getJobStatusChip(selectedJob.status)}</Box>
              <Typography sx={{ mt: 2 }}><strong>Position:</strong> {selectedJob.position?.name || '-'}</Typography>
              <Typography><strong>Type:</strong> {selectedJob.employmentType}</Typography>
              <Typography><strong>Quantity:</strong> {selectedJob.quantity}</Typography>
              <Typography><strong>Closing Date:</strong> {selectedJob.closingDate ? format(new Date(selectedJob.closingDate), 'dd MMM yyyy') : '-'}</Typography>
              <Typography sx={{ mt: 2 }}><strong>Description:</strong></Typography>
              <Paper variant="outlined" sx={{ p: 2, mt: 1 }}>{selectedJob.description || 'No description provided.'}</Paper>
              <Typography sx={{ mt: 2 }}><strong>Requirements:</strong></Typography>
              <Paper variant="outlined" sx={{ p: 2, mt: 1, whiteSpace: 'pre-line' }}>{selectedJob.requirements || 'No requirements provided.'}</Paper>
            </Box>
          ) : (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField fullWidth label="Job Title" value={jobForm.title} onChange={(e) => setJobForm((c) => ({ ...c, title: e.target.value }))} />
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Position</InputLabel>
                  <Select value={jobForm.positionId} label="Position" onChange={(e) => setJobForm((c) => ({ ...c, positionId: e.target.value }))}>
                    {positions.map((position) => (
                      <MenuItem key={position.id} value={position.id}>{position.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Employment Type</InputLabel>
                  <Select value={jobForm.employmentType} label="Employment Type" onChange={(e) => setJobForm((c) => ({ ...c, employmentType: e.target.value }))}>
                    <MenuItem value="temporary">Temporary</MenuItem>
                    <MenuItem value="permanent">Permanent</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth type="number" label="Quantity" value={jobForm.quantity} onChange={(e) => setJobForm((c) => ({ ...c, quantity: Number(e.target.value) }))} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth type="date" label="Closing Date" value={jobForm.closingDate} onChange={(e) => setJobForm((c) => ({ ...c, closingDate: e.target.value }))} InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth multiline rows={3} label="Description" value={jobForm.description} onChange={(e) => setJobForm((c) => ({ ...c, description: e.target.value }))} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth multiline rows={3} label="Requirements" value={jobForm.requirements} onChange={(e) => setJobForm((c) => ({ ...c, requirements: e.target.value }))} />
              </Grid>
              {dialogMode === 'edit' && (
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select value={jobForm.status} label="Status" onChange={(e) => setJobForm((c) => ({ ...c, status: e.target.value }))}>
                      <MenuItem value="draft">Draft</MenuItem>
                      <MenuItem value="open">Open</MenuItem>
                      <MenuItem value="in-progress">In Progress</MenuItem>
                      <MenuItem value="closed">Closed</MenuItem>
                      <MenuItem value="cancelled">Cancelled</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenJobDialog(false)}>Close</Button>
          {dialogMode !== 'view' && <Button variant="contained" onClick={handleSaveJob}>Save</Button>}
        </DialogActions>
      </Dialog>

      <Dialog open={openApplicantDialog} onClose={() => setOpenApplicantDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Applicant Details</DialogTitle>
        <DialogContent>
          {selectedApplicant && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Typography variant="h6">{selectedApplicant.firstName} {selectedApplicant.lastName}</Typography>
                <Typography color="textSecondary">{selectedApplicant.recruitment?.title || '-'}</Typography>
              </Grid>
              <Grid item xs={6}><Typography><strong>Email:</strong> {selectedApplicant.email}</Typography></Grid>
              <Grid item xs={6}><Typography><strong>Phone:</strong> {selectedApplicant.phone || '-'}</Typography></Grid>
              <Grid item xs={12}><Typography><strong>Address:</strong> {selectedApplicant.address || '-'}</Typography></Grid>
              <Grid item xs={12}><Typography><strong>Status:</strong> {getApplicantStatusChip(selectedApplicant.status)}</Typography></Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select value={applicantStatusForm.status} label="Status" onChange={(e) => setApplicantStatusForm((c) => ({ ...c, status: e.target.value }))}>
                    {applicantStatuses.map((status) => (
                      <MenuItem key={status} value={status}>{status}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  type="datetime-local"
                  label="Interview Date"
                  value={applicantStatusForm.interviewDate}
                  onChange={(e) => setApplicantStatusForm((c) => ({ ...c, interviewDate: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Interview Score"
                  value={applicantStatusForm.interviewScore}
                  onChange={(e) => setApplicantStatusForm((c) => ({ ...c, interviewScore: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Interview Feedback"
                  value={applicantStatusForm.interviewFeedback}
                  onChange={(e) => setApplicantStatusForm((c) => ({ ...c, interviewFeedback: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Notes"
                  value={applicantStatusForm.notes}
                  onChange={(e) => setApplicantStatusForm((c) => ({ ...c, notes: e.target.value }))}
                />
              </Grid>
              {selectedApplicant.status === 'selected' && (
                <Grid item xs={12}>
                  <Alert severity="info">
                    This applicant is ready for conversion to employee.
                  </Alert>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenApplicantDialog(false)}>Close</Button>
          {selectedApplicant?.status === 'selected' && (
            <Button color="success" variant="outlined" onClick={() => { setOpenApplicantDialog(false); openConvertApplicantDialog(selectedApplicant); }}>
              Convert
            </Button>
          )}
          <Button variant="contained" onClick={handleApplicantStatusUpdate}>Save Applicant</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openConvertDialog} onClose={() => setOpenConvertDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Convert Applicant to Employee</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Typography>{selectedApplicant?.firstName} {selectedApplicant?.lastName}</Typography>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="Employee Code" value={convertForm.employeeCode} onChange={(e) => setConvertForm((c) => ({ ...c, employeeCode: e.target.value }))} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth type="date" label="Hire Date" value={convertForm.hireDate} onChange={(e) => setConvertForm((c) => ({ ...c, hireDate: e.target.value }))} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="Department ID" value={convertForm.departmentId} onChange={(e) => setConvertForm((c) => ({ ...c, departmentId: e.target.value }))} />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Production Line</InputLabel>
                <Select value={convertForm.productionLineId} label="Production Line" onChange={(e) => setConvertForm((c) => ({ ...c, productionLineId: e.target.value }))}>
                  {productionLines.map((line) => (
                    <MenuItem key={line.id} value={line.id}>{line.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="Emergency Contact Name" value={convertForm.emergencyContactName} onChange={(e) => setConvertForm((c) => ({ ...c, emergencyContactName: e.target.value }))} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="Emergency Contact Phone" value={convertForm.emergencyContactPhone} onChange={(e) => setConvertForm((c) => ({ ...c, emergencyContactPhone: e.target.value }))} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenConvertDialog(false)}>Cancel</Button>
          <Button variant="contained" color="success" onClick={handleConvertApplicant}>Convert</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar((current) => ({ ...current, open: false }))}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
