import React, { useEffect, useMemo, useState } from 'react';
import {
  Avatar,
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
  ListItemAvatar,
  ListItemText,
  MenuItem,
  Rating,
  Select,
  Snackbar,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import {
  Assignment,
  CheckCircle,
  School,
  Star,
  Warning
} from '@mui/icons-material';
import axios from 'axios';
import { format } from 'date-fns';
import { API_URL } from '../config/api';
import { getAuthConfig, getStoredUser } from '../utils/auth';

const recommendationMap = {
  continue: 'continue',
  promote: 'convert',
  train: 'train',
  terminate: 'review'
};

const recommendationLabelMap = {
  continue: 'Continue',
  convert: 'Convert',
  train: 'Training Needed',
  review: 'Needs Review'
};

export default function Performance() {
  const user = getStoredUser();
  const isDepartmentHead = user?.role === 'department_head';
  const [employees, setEmployees] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openEvalDialog, setOpenEvalDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [evalForm, setEvalForm] = useState({
    technicalSkills: 3,
    attendance: 3,
    teamwork: 3,
    quality: 3,
    comments: '',
    recommendation: 'continue'
  });

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const fetchPerformanceData = async () => {
    setLoading(true);
    try {
      const authConfig = getAuthConfig();
      const startDate = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd');
      const endDate = format(new Date(), 'yyyy-MM-dd');

      const [employeesRes, attendanceRes, sessionsRes, recommendationsRes] = await Promise.all([
        axios.get(`${API_URL}/employees?limit=500`, authConfig),
        axios.get(`${API_URL}/attendance/report?startDate=${startDate}&endDate=${endDate}`, authConfig),
        axios.get(`${API_URL}/training/sessions`, authConfig).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/conversion-recommendations`, authConfig).catch(() => ({ data: [] }))
      ]);

      const employeesData = employeesRes.data.data || [];
      const attendanceByEmployee = new Map(
        (attendanceRes.data.byEmployee || []).map((entry) => [entry.employee, entry])
      );
      const recommendationsData = recommendationsRes.data || [];
      const latestRecommendationByEmployee = new Map();

      recommendationsData.forEach((item) => {
        const current = latestRecommendationByEmployee.get(item.employeeId);
        if (!current || new Date(item.createdAt || item.created_at) > new Date(current.createdAt || current.created_at)) {
          latestRecommendationByEmployee.set(item.employeeId, item);
        }
      });

      const trainingSummaryByEmployee = new Map();
      (sessionsRes.data || []).forEach((session) => {
        (session.enrollments || []).forEach((enrollment) => {
          if (!enrollment.employeeId) {
            return;
          }

          const current = trainingSummaryByEmployee.get(enrollment.employeeId) || {
            trainings: 0,
            completed: 0,
            latestNotes: ''
          };

          current.trainings += 1;
          if (enrollment.status === 'completed') {
            current.completed += 1;
          }
          if (enrollment.performanceNotes) {
            current.latestNotes = enrollment.performanceNotes;
          }
          trainingSummaryByEmployee.set(enrollment.employeeId, current);
        });
      });

      const normalizedEmployees = employeesData.map((employee) => {
        const fullName = `${employee.firstName} ${employee.lastName}`;
        const attendance = attendanceByEmployee.get(fullName) || {
          present: 0,
          late: 0,
          absent: 0,
          nightBonuses: 0
        };
        const totalTrackedDays = attendance.present + attendance.late + attendance.absent;
        const attendanceRate = totalTrackedDays > 0
          ? Math.round(((attendance.present + attendance.late) / totalTrackedDays) * 100)
          : 0;
        const trainingSummary = trainingSummaryByEmployee.get(employee.id) || {
          trainings: 0,
          completed: 0,
          latestNotes: ''
        };
        const latestRecommendation = latestRecommendationByEmployee.get(employee.id);
        const fallbackScore = Number(
          (((attendanceRate / 20) + Math.min(trainingSummary.completed, 5)) / 2).toFixed(1)
        );
        const rating = latestRecommendation?.performanceRating || fallbackScore;

        return {
          id: employee.id,
          employeeCode: employee.employeeCode,
          name: fullName,
          position: employee.position?.name || '-',
          department: employee.department?.name || '-',
          line: employee.productionLine?.name || '-',
          status: employee.employmentStatus,
          hireDate: employee.hireDate,
          attendance: attendanceRate,
          trainings: trainingSummary.trainings,
          completedTrainings: trainingSummary.completed,
          trainingNotes: trainingSummary.latestNotes,
          rating,
          lastRecommendation: latestRecommendation || null
        };
      });

      setEmployees(normalizedEmployees);
      setRecommendations(recommendationsData);
      setEvaluations(
        recommendationsData.slice(0, 6).map((item) => ({
          id: item.id,
          employee: item.employee ? `${item.employee.firstName} ${item.employee.lastName}` : 'Employee',
          date: item.createdAt || item.created_at,
          score: item.performanceRating,
          evaluator: item.reviewer ? `${item.reviewer.firstName} ${item.reviewer.lastName}` : 'Reviewer',
          recommendation: item.recommendation,
          status: item.status
        }))
      );
    } catch (error) {
      showSnackbar(error.response?.data?.message || 'Failed to load performance data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPerformanceData();
  }, []);

  const stats = useMemo(
    () => ({
      total: employees.length,
      temporary: employees.filter((employee) => employee.status === 'temporary').length,
      completedTraining: employees.filter((employee) => employee.completedTrainings > 0).length,
      pendingReview: recommendations.filter((item) => item.status === 'pending').length,
      highPerformers: employees.filter((employee) => Number(employee.rating || 0) >= 4).length
    }),
    [employees, recommendations]
  );

  const conversionReadyEmployees = useMemo(
    () =>
      employees.filter(
        (employee) =>
          employee.status === 'temporary' &&
          Number(employee.rating || 0) >= 4 &&
          employee.completedTrainings > 0
      ),
    [employees]
  );

  const handleEvaluate = (employee) => {
    setSelectedEmployee(employee);
    setEvalForm({
      technicalSkills: Math.round(employee.rating || 3),
      attendance: employee.attendance >= 90 ? 5 : employee.attendance >= 75 ? 4 : 3,
      teamwork: 3,
      quality: Math.round(employee.rating || 3),
      comments: employee.trainingNotes || '',
      recommendation: employee.status === 'temporary' ? 'promote' : 'continue'
    });
    setOpenEvalDialog(true);
  };

  const handleSubmitEvaluation = async () => {
    if (!selectedEmployee) {
      return;
    }

    try {
      const totalScore = Math.max(
        1,
        Math.min(
          5,
          Math.round(
            (
              evalForm.technicalSkills +
              evalForm.attendance +
              evalForm.teamwork +
              evalForm.quality
            ) / 4
          )
        )
      );

      await axios.post(
        `${API_URL}/conversion-recommendations`,
        {
          employeeId: selectedEmployee.id,
          performanceRating: totalScore,
          reviewNotes: evalForm.comments,
          recommendation: recommendationMap[evalForm.recommendation] || 'continue'
        },
        getAuthConfig()
      );

      setOpenEvalDialog(false);
      showSnackbar(`Performance review saved for ${selectedEmployee.name}`);
      fetchPerformanceData();
    } catch (error) {
      showSnackbar(error.response?.data?.message || 'Failed to save performance review', 'error');
    }
  };

  const getStatusChip = (status) => (
    status === 'permanent'
      ? <Chip size="small" label="Permanent" color="success" />
      : <Chip size="small" label="Temporary" color="warning" />
  );

  const getRecommendationChip = (recommendation, status) => (
    <Chip
      size="small"
      label={`${recommendationLabelMap[recommendation] || 'Continue'}${status ? ` • ${status}` : ''}`}
      color={recommendation === 'convert' ? 'success' : recommendation === 'train' ? 'info' : recommendation === 'review' ? 'warning' : 'default'}
    />
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h4" color="primary.main">
            {isDepartmentHead ? 'Department Performance' : 'Performance Management'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isDepartmentHead
              ? 'Review employees in your department, track training completion, and submit conversion recommendations.'
              : 'Review employee performance, training progress, and conversion readiness.'}
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<Assignment />} onClick={fetchPerformanceData}>
          Refresh
        </Button>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>Total Employees</Typography>
              <Typography variant="h4">{stats.total}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#FFF8E1' }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>Temporary Staff</Typography>
              <Typography variant="h4" color="warning.main">{stats.temporary}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#E8F5E9' }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>Training Completed</Typography>
              <Typography variant="h4" color="success.main">{stats.completedTraining}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#E3F2FD' }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>Pending Recommendations</Typography>
              <Typography variant="h4" color="info.main">{stats.pendingReview}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {isDepartmentHead ? 'My Department Employees' : 'Employee Performance'}
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableRow>
                      <TableCell>Employee</TableCell>
                      <TableCell>Position</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Training</TableCell>
                      <TableCell>Attendance</TableCell>
                      <TableCell>Rating</TableCell>
                      <TableCell>Recommendation</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {employees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Avatar sx={{ mr: 1, width: 32, height: 32 }}>
                              {employee.name.charAt(0)}
                            </Avatar>
                            <Box>
                              <Typography variant="body2">{employee.name}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {employee.employeeCode} | {employee.department}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>{employee.position}</TableCell>
                        <TableCell>{getStatusChip(employee.status)}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            icon={<School />}
                            label={`${employee.completedTrainings}/${employee.trainings} completed`}
                            color={employee.completedTrainings > 0 ? 'success' : 'default'}
                          />
                        </TableCell>
                        <TableCell>{employee.attendance}%</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Rating value={Number(employee.rating || 0)} precision={1} readOnly size="small" />
                            <Typography variant="body2" sx={{ ml: 1 }}>
                              ({Number(employee.rating || 0).toFixed(1)})
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          {employee.lastRecommendation
                            ? getRecommendationChip(employee.lastRecommendation.recommendation, employee.lastRecommendation.status)
                            : <Chip size="small" label="No review yet" />}
                        </TableCell>
                        <TableCell align="center">
                          <Button size="small" variant="outlined" onClick={() => handleEvaluate(employee)}>
                            Review
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {employees.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} align="center">
                          No employee records available for this view.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Evaluations
              </Typography>
              <List>
                {evaluations.length === 0 ? (
                  <ListItem>
                    <ListItemText primary="No evaluations saved yet" secondary="New reviews will appear here." />
                  </ListItem>
                ) : (
                  evaluations.map((item) => (
                    <ListItem key={item.id}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: '#E3F2FD', color: '#1565C0' }}>
                          <Star />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={item.employee}
                        secondary={`${item.evaluator} | ${item.date ? format(new Date(item.date), 'dd MMM yyyy') : 'No date'}`}
                      />
                      <Chip size="small" label={`${item.score}/5`} color="info" />
                    </ListItem>
                  ))
                )}
              </List>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Pending Conversion Recommendations
              </Typography>
              {conversionReadyEmployees.length === 0 ? (
                <Typography color="text.secondary" align="center" sx={{ py: 2 }}>
                  No temporary employees are ready for conversion yet.
                </Typography>
              ) : (
                conversionReadyEmployees.map((employee) => (
                  <Box key={employee.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, gap: 2 }}>
                    <Box>
                      <Typography variant="subtitle2">{employee.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {employee.position} | {employee.completedTrainings} completed trainings
                      </Typography>
                    </Box>
                    {employee.lastRecommendation?.status === 'pending' ? (
                      <Chip size="small" color="warning" icon={<Warning />} label="Pending" />
                    ) : (
                      <Button size="small" variant="outlined" color="success" startIcon={<CheckCircle />} onClick={() => handleEvaluate(employee)}>
                        Recommend
                      </Button>
                    )}
                  </Box>
                ))
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={openEvalDialog} onClose={() => setOpenEvalDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Performance Review - {selectedEmployee?.name}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" gutterBottom>Technical Skills</Typography>
              <Rating
                value={evalForm.technicalSkills}
                onChange={(event, value) => setEvalForm((current) => ({ ...current, technicalSkills: value || 1 }))}
                size="large"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" gutterBottom>Attendance & Punctuality</Typography>
              <Rating
                value={evalForm.attendance}
                onChange={(event, value) => setEvalForm((current) => ({ ...current, attendance: value || 1 }))}
                size="large"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" gutterBottom>Teamwork</Typography>
              <Rating
                value={evalForm.teamwork}
                onChange={(event, value) => setEvalForm((current) => ({ ...current, teamwork: value || 1 }))}
                size="large"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" gutterBottom>Quality of Work</Typography>
              <Rating
                value={evalForm.quality}
                onChange={(event, value) => setEvalForm((current) => ({ ...current, quality: value || 1 }))}
                size="large"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Performance Notes"
                value={evalForm.comments}
                onChange={(event) => setEvalForm((current) => ({ ...current, comments: event.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Recommendation</InputLabel>
                <Select
                  value={evalForm.recommendation}
                  label="Recommendation"
                  onChange={(event) => setEvalForm((current) => ({ ...current, recommendation: event.target.value }))}
                >
                  <MenuItem value="continue">Continue Current Role</MenuItem>
                  <MenuItem value="promote">Recommend Permanent Conversion</MenuItem>
                  <MenuItem value="train">Additional Training Required</MenuItem>
                  <MenuItem value="terminate">Performance Review Needed</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEvalDialog(false)}>Cancel</Button>
          <Button onClick={handleSubmitEvaluation} variant="contained">
            Save Review
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((current) => ({ ...current, open: false }))}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((current) => ({ ...current, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
