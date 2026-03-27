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
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Tab,
  Tabs,
  TextField,
  Typography
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import axios from 'axios';
import { addDays, format } from 'date-fns';
import { API_URL } from '../config/api';
import { getAuthConfig, getStoredUser, isManagementRole } from '../utils/auth';

export default function Training() {
  const user = getStoredUser();
  const managementUser = isManagementRole(user?.role);
  const isDepartmentHead = user?.role === 'department_head';
  const [loading, setLoading] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [trainings, setTrainings] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [myTrainings, setMyTrainings] = useState({ all: [], enrolled: [], inProgress: [], completed: [] });
  const [openTrainingDialog, setOpenTrainingDialog] = useState(false);
  const [openSessionDialog, setOpenSessionDialog] = useState(false);
  const [openEnrollDialog, setOpenEnrollDialog] = useState(false);
  const [openProgressDialog, setOpenProgressDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState('new');
  const [selectedTraining, setSelectedTraining] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [selectedEnrollment, setSelectedEnrollment] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });

  const [trainingForm, setTrainingForm] = useState({
    name: '',
    description: '',
    departmentId: '',
    durationDays: 1,
    isMandatory: false
  });

  const [sessionForm, setSessionForm] = useState({
    trainingId: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
    trainerEmployeeId: '',
    location: '',
    maxParticipants: 10,
    notes: ''
  });

  const [enrollForm, setEnrollForm] = useState({
    employeeId: ''
  });

  const [progressForm, setProgressForm] = useState({
    status: 'completed',
    performanceScore: 3,
    performanceNotes: ''
  });

  const visibleDepartments = useMemo(
    () => (
      isDepartmentHead
        ? departments.filter((department) => Number(department.id) === Number(user?.employee?.departmentId))
        : departments
    ),
    [departments, isDepartmentHead, user?.employee?.departmentId]
  );

  const showMessage = (message) => {
    setSnackbar({ open: true, message });
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const authConfig = getAuthConfig();

      if (managementUser) {
        const [masterDataRes, employeesRes, trainingsRes, sessionsRes, myTrainingsRes] = await Promise.all([
          axios.get(`${API_URL}/master-data`, authConfig),
          axios.get(`${API_URL}/employees?limit=500`, authConfig),
          axios.get(`${API_URL}/training`, authConfig),
          axios.get(`${API_URL}/training/sessions`, authConfig),
          axios.get(`${API_URL}/training/my-trainings`, authConfig).catch(() => ({
            data: { all: [], enrolled: [], inProgress: [], completed: [] }
          }))
        ]);

        setDepartments(masterDataRes.data.departments || []);
        setEmployees(employeesRes.data.data || []);
        setTrainings(trainingsRes.data || []);
        setSessions(sessionsRes.data || []);
        setMyTrainings(myTrainingsRes.data || { all: [], enrolled: [], inProgress: [], completed: [] });
      } else {
        const myTrainingsRes = await axios.get(`${API_URL}/training/my-trainings`, authConfig);
        setMyTrainings(myTrainingsRes.data || { all: [], enrolled: [], inProgress: [], completed: [] });
        setTrainings([]);
        setSessions([]);
      }
    } catch (error) {
      console.error('Error loading training data:', error);
      showMessage(error.response?.data?.message || 'Failed to load training data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [managementUser]);

  const trainingRows = useMemo(
    () =>
      trainings.map((training) => ({
        ...training,
        departmentName: training.department?.name || '-',
        plannedSessions: training.sessions?.length || 0
      })),
    [trainings]
  );

  const sessionRows = useMemo(
    () =>
      sessions.map((session) => ({
        ...session,
        trainingName: session.training?.name || '-',
        trainerName: session.trainer ? `${session.trainer.firstName} ${session.trainer.lastName}` : '-',
        enrolledCount: session.enrollments?.length || 0
      })),
    [sessions]
  );

  const enrollmentRows = useMemo(
    () =>
      sessions.flatMap((session) =>
        (session.enrollments || []).map((enrollment) => ({
          id: enrollment.id,
          sessionId: session.id,
          employeeId: enrollment.employeeId,
          trainingName: session.training?.name || '-',
          sessionWindow: `${session.startDate || '-'} to ${session.endDate || '-'}`,
          participantName: enrollment.employee
            ? `${enrollment.employee.firstName} ${enrollment.employee.lastName}`
            : enrollment.applicant
              ? `${enrollment.applicant.firstName} ${enrollment.applicant.lastName}`
              : 'Participant',
          participantType: enrollment.employee ? 'Employee' : 'Applicant',
          status: enrollment.status || 'enrolled',
          score: enrollment.performanceScore || '-',
          performanceNotes: enrollment.performanceNotes || ''
        }))
      ),
    [sessions]
  );

  const myTrainingRows = useMemo(
    () =>
      (myTrainings.all || []).map((enrollment) => ({
        id: enrollment.id,
        trainingName: enrollment.session?.training?.name || 'Training',
        trainerName: enrollment.session?.trainer
          ? `${enrollment.session.trainer.firstName} ${enrollment.session.trainer.lastName}`
          : '-',
        startDate: enrollment.session?.startDate || null,
        endDate: enrollment.session?.endDate || null,
        status: enrollment.status || 'enrolled',
        score: enrollment.performanceScore || '-'
      })),
    [myTrainings]
  );

  const handleSaveTraining = async () => {
    try {
      if (dialogMode === 'edit' && selectedTraining) {
        await axios.put(`${API_URL}/training/${selectedTraining.id}`, trainingForm, getAuthConfig());
      } else {
        await axios.post(`${API_URL}/training`, trainingForm, getAuthConfig());
      }
      setOpenTrainingDialog(false);
      showMessage('Training saved successfully');
      fetchData();
    } catch (error) {
      showMessage(error.response?.data?.message || 'Failed to save training');
    }
  };

  const handleSaveSession = async () => {
    try {
      await axios.post(`${API_URL}/training/${sessionForm.trainingId}/sessions`, sessionForm, getAuthConfig());
      setOpenSessionDialog(false);
      showMessage('Training session created successfully');
      fetchData();
    } catch (error) {
      showMessage(error.response?.data?.message || 'Failed to save session');
    }
  };

  const handleEnrollEmployee = async () => {
    try {
      if (!selectedSession || !enrollForm.employeeId) {
        showMessage('Please select an employee');
        return;
      }

      await axios.post(
        `${API_URL}/training/sessions/${selectedSession.id}/enroll`,
        { employeeId: enrollForm.employeeId },
        getAuthConfig()
      );
      setOpenEnrollDialog(false);
      setSelectedSession(null);
      setEnrollForm({ employeeId: '' });
      showMessage('Employee enrolled successfully');
      fetchData();
    } catch (error) {
      showMessage(error.response?.data?.message || 'Failed to enroll employee');
    }
  };

  const handleUpdateEnrollment = async () => {
    try {
      if (!selectedEnrollment) {
        showMessage('Please select an enrollment record');
        return;
      }

      await axios.put(
        `${API_URL}/training/enrollments/${selectedEnrollment.id}`,
        progressForm,
        getAuthConfig()
      );
      setOpenProgressDialog(false);
      setSelectedEnrollment(null);
      setProgressForm({ status: 'completed', performanceScore: 3, performanceNotes: '' });
      showMessage('Training progress updated successfully');
      fetchData();
    } catch (error) {
      showMessage(error.response?.data?.message || 'Failed to update training progress');
    }
  };

  const trainingColumns = [
    { field: 'name', headerName: 'Program', width: 220 },
    { field: 'departmentName', headerName: 'Department', width: 160 },
    { field: 'durationDays', headerName: 'Duration', width: 100 },
    {
      field: 'isMandatory',
      headerName: 'Mandatory',
      width: 120,
      renderCell: (params) => <Chip size="small" label={params.value ? 'Yes' : 'No'} color={params.value ? 'success' : 'default'} />
    },
    { field: 'plannedSessions', headerName: 'Sessions', width: 100 }
  ];

  const sessionColumns = [
    { field: 'trainingName', headerName: 'Training', width: 220 },
    { field: 'trainerName', headerName: 'Trainer', width: 170 },
    { field: 'location', headerName: 'Location', width: 150 },
    { field: 'enrolledCount', headerName: 'Enrolled', width: 100 },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => <Chip size="small" label={params.value} color={params.value === 'completed' ? 'success' : 'info'} />
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 140,
      renderCell: (params) => (
        <Button
          size="small"
          variant="outlined"
          onClick={() => {
            setSelectedSession(params.row);
            setEnrollForm({ employeeId: '' });
            setOpenEnrollDialog(true);
          }}
        >
          Enroll
        </Button>
      )
    }
  ];

  const myColumns = [
    { field: 'trainingName', headerName: 'Training', width: 220 },
    { field: 'trainerName', headerName: 'Trainer', width: 170 },
    {
      field: 'startDate',
      headerName: 'Start',
      width: 120,
      valueGetter: (params) => (params.value ? format(new Date(params.value), 'dd/MM/yyyy') : '-')
    },
    {
      field: 'endDate',
      headerName: 'End',
      width: 120,
      valueGetter: (params) => (params.value ? format(new Date(params.value), 'dd/MM/yyyy') : '-')
    },
    { field: 'score', headerName: 'Score', width: 100 },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => <Chip size="small" label={params.value} color={params.value === 'completed' ? 'success' : 'warning'} />
    }
  ];

  const enrollmentColumns = [
    { field: 'trainingName', headerName: 'Training', width: 220 },
    { field: 'sessionWindow', headerName: 'Session', width: 220 },
    { field: 'participantName', headerName: 'Participant', width: 200 },
    { field: 'participantType', headerName: 'Type', width: 110 },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: (params) => <Chip size="small" label={params.value} color={params.value === 'completed' ? 'success' : 'warning'} />
    },
    { field: 'score', headerName: 'Score', width: 90 },
    ...(isDepartmentHead ? [{
      field: 'actions',
      headerName: 'Actions',
      width: 160,
      renderCell: (params) => (
        <Button
          size="small"
          variant="outlined"
          onClick={() => {
            setSelectedEnrollment(params.row);
            setProgressForm({
              status: params.row.status === 'completed' ? 'completed' : 'in-progress',
              performanceScore: Number(params.row.score) || 3,
              performanceNotes: params.row.performanceNotes || ''
            });
            setOpenProgressDialog(true);
          }}
        >
          Update
        </Button>
      )
    }] : [])
  ];

  const stats = managementUser
    ? {
        trainings: trainings.length,
        sessions: sessions.length,
        enrollments: enrollmentRows.length,
        mandatory: trainings.filter((item) => item.isMandatory).length,
        completed: myTrainings.completed?.length || 0
      }
    : {
        total: myTrainingRows.length,
        enrolled: myTrainings.enrolled?.length || 0,
        progress: myTrainings.inProgress?.length || 0,
        completed: myTrainings.completed?.length || 0
      };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h4" color="primary.main">
            {managementUser ? (isDepartmentHead ? 'Department Training' : 'Training Management') : 'My Training'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {managementUser
              ? isDepartmentHead
                ? 'Manage training for your department, conduct sessions, and record completion notes.'
                : 'Manage training programs, sessions, and learning progress.'
              : 'Review your training enrollments and completion history.'}
          </Typography>
        </Box>

        {managementUser && (
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button variant="outlined" onClick={fetchData}>
              Refresh
            </Button>
            <Button
              variant="contained"
              onClick={() => {
                setDialogMode('new');
                setSelectedTraining(null);
                setTrainingForm({
                  name: '',
                  description: '',
                  departmentId: isDepartmentHead ? user?.employee?.departmentId || '' : '',
                  durationDays: 1,
                  isMandatory: false
                });
                setOpenTrainingDialog(true);
              }}
            >
              New Training
            </Button>
          </Box>
        )}
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {!managementUser && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Employee login now stays on self-service training records and does not call manager-only training pages.
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

      {managementUser ? (
        <>
          <Paper sx={{ mb: 3 }}>
            <Tabs value={tabValue} onChange={(event, value) => setTabValue(value)}>
              <Tab label="Programs" />
              <Tab label="Sessions" />
              <Tab label={isDepartmentHead ? 'Department Progress' : 'Enrollments'} />
              <Tab label="My Trainings" />
            </Tabs>
          </Paper>

          {tabValue === 0 && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      const training = trainingRows[0];
                      if (training) {
                        setSessionForm({
                          trainingId: training.id,
                          startDate: format(new Date(), 'yyyy-MM-dd'),
                          endDate: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
                          trainerEmployeeId: '',
                          location: '',
                          maxParticipants: 10,
                          notes: ''
                        });
                        setOpenSessionDialog(true);
                      }
                    }}
                  >
                    Quick Session
                  </Button>
                </Box>
                <DataGrid rows={trainingRows} columns={trainingColumns} autoHeight pageSize={8} rowsPerPageOptions={[8, 16]} />
              </CardContent>
            </Card>
          )}

          {tabValue === 1 && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <DataGrid rows={sessionRows} columns={sessionColumns} autoHeight pageSize={8} rowsPerPageOptions={[8, 16]} />
              </CardContent>
            </Card>
          )}

          {tabValue === 2 && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <DataGrid rows={enrollmentRows} columns={enrollmentColumns} autoHeight pageSize={8} rowsPerPageOptions={[8, 16]} />
              </CardContent>
            </Card>
          )}

          {tabValue === 3 && (
            <Card>
              <CardContent>
                <DataGrid rows={myTrainingRows} columns={myColumns} autoHeight pageSize={8} rowsPerPageOptions={[8, 16]} />
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  My Training Records
                </Typography>
                <DataGrid rows={myTrainingRows} columns={myColumns} autoHeight pageSize={8} rowsPerPageOptions={[8, 16]} />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Summary
                </Typography>
                <List>
                  <ListItem>
                    <ListItemText primary="Enrolled" secondary={myTrainings.enrolled?.length || 0} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="In Progress" secondary={myTrainings.inProgress?.length || 0} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Completed" secondary={myTrainings.completed?.length || 0} />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Dialog open={openTrainingDialog} onClose={() => setOpenTrainingDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>{dialogMode === 'edit' ? 'Edit Training' : 'New Training'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Training Name"
                value={trainingForm.name}
                onChange={(event) => setTrainingForm((current) => ({ ...current, name: event.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Department</InputLabel>
                <Select
                  value={trainingForm.departmentId}
                  label="Department"
                  onChange={(event) => setTrainingForm((current) => ({ ...current, departmentId: event.target.value }))}
                >
                  {visibleDepartments.map((department) => (
                    <MenuItem key={department.id} value={department.id}>
                      {department.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Duration (days)"
                value={trainingForm.durationDays}
                onChange={(event) => setTrainingForm((current) => ({ ...current, durationDays: Number(event.target.value) || 1 }))}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Mandatory</InputLabel>
                <Select
                  value={trainingForm.isMandatory}
                  label="Mandatory"
                  onChange={(event) => setTrainingForm((current) => ({ ...current, isMandatory: event.target.value }))}
                >
                  <MenuItem value={false}>No</MenuItem>
                  <MenuItem value={true}>Yes</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                value={trainingForm.description}
                onChange={(event) => setTrainingForm((current) => ({ ...current, description: event.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenTrainingDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveTraining}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openSessionDialog} onClose={() => setOpenSessionDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>New Training Session</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Training</InputLabel>
                <Select
                  value={sessionForm.trainingId}
                  label="Training"
                  onChange={(event) => setSessionForm((current) => ({ ...current, trainingId: event.target.value }))}
                >
                  {trainingRows.map((training) => (
                    <MenuItem key={training.id} value={training.id}>
                      {training.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="Start Date"
                value={sessionForm.startDate}
                onChange={(event) => setSessionForm((current) => ({ ...current, startDate: event.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="End Date"
                value={sessionForm.endDate}
                onChange={(event) => setSessionForm((current) => ({ ...current, endDate: event.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Trainer</InputLabel>
                <Select
                  value={sessionForm.trainerEmployeeId}
                  label="Trainer"
                  onChange={(event) => setSessionForm((current) => ({ ...current, trainerEmployeeId: event.target.value }))}
                >
                  {employees.map((employee) => (
                    <MenuItem key={employee.id} value={employee.id}>
                      {employee.firstName} {employee.lastName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Location"
                value={sessionForm.location}
                onChange={(event) => setSessionForm((current) => ({ ...current, location: event.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Notes"
                value={sessionForm.notes}
                onChange={(event) => setSessionForm((current) => ({ ...current, notes: event.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenSessionDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveSession}>
            Save Session
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openEnrollDialog} onClose={() => setOpenEnrollDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Enroll Employee</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary">
                {selectedSession?.trainingName || 'Training session'}
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Employee</InputLabel>
                <Select
                  value={enrollForm.employeeId}
                  label="Employee"
                  onChange={(event) => setEnrollForm((current) => ({ ...current, employeeId: event.target.value }))}
                >
                  {employees.map((employee) => (
                    <MenuItem key={employee.id} value={employee.id}>
                      {employee.firstName} {employee.lastName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEnrollDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleEnrollEmployee}>
            Enroll
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openProgressDialog} onClose={() => setOpenProgressDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Update Training Progress</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary">
                {selectedEnrollment?.participantName || 'Participant'}
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={progressForm.status}
                  label="Status"
                  onChange={(event) => setProgressForm((current) => ({ ...current, status: event.target.value }))}
                >
                  <MenuItem value="enrolled">Enrolled</MenuItem>
                  <MenuItem value="in-progress">In Progress</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="number"
                label="Performance Score (1-5)"
                inputProps={{ min: 1, max: 5 }}
                value={progressForm.performanceScore}
                onChange={(event) => setProgressForm((current) => ({ ...current, performanceScore: Number(event.target.value) || 1 }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Performance Notes"
                value={progressForm.performanceNotes}
                onChange={(event) => setProgressForm((current) => ({ ...current, performanceNotes: event.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenProgressDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleUpdateEnrollment}>
            Save Progress
          </Button>
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
