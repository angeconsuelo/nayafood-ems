import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  LinearProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  TextField,
  Typography
} from '@mui/material';
import {
  AccessTime,
  Assessment,
  BeachAccess,
  CheckCircle,
  Feedback,
  Group,
  People,
  Person,
  Schedule,
  School,
  TrendingUp,
  Warning,
  Work
} from '@mui/icons-material';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import axios from 'axios';
import { addDays, format, startOfWeek, subDays } from 'date-fns';
import { API_URL } from '../config/api';
import { getAuthConfig, getStoredUser, isManagementRole } from '../utils/auth';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

function StatCard({ title, value, subtitle, icon, tint }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              {value}
            </Typography>
            {subtitle ? (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            ) : null}
          </Box>
          <Avatar sx={{ bgcolor: tint, color: '#fff', width: 48, height: 48 }}>
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );
}

const currency = (value) => `${Number(value || 0).toLocaleString()} CFA`;

export default function Dashboard() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const user = getStoredUser();
  const managementUser = isManagementRole(user?.role);
  const isDirector = user?.role === 'director';
  const isHr = user?.role === 'hr';
  const isProductionManager = user?.role === 'production_manager';
  const isDepartmentHead = user?.role === 'department_head';
  const isShiftSupervisor = user?.role === 'shift_supervisor';

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [primaryChart, setPrimaryChart] = useState([]);
  const [secondaryChart, setSecondaryChart] = useState([]);
  const [leftList, setLeftList] = useState([]);
  const [rightList, setRightList] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [quickAttendanceForm, setQuickAttendanceForm] = useState({ employeeCode: '', notes: '' });
  const [quickAttendanceMessage, setQuickAttendanceMessage] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const authConfig = getAuthConfig();
        const today = new Date();
        const weekStart = startOfWeek(today, { weekStartsOn: 1 });
        const weekStartString = format(weekStart, 'yyyy-MM-dd');
        const weekEndString = format(addDays(weekStart, 6), 'yyyy-MM-dd');
        const sevenDaysAgo = format(subDays(today, 6), 'yyyy-MM-dd');
        const todayString = format(today, 'yyyy-MM-dd');
        const month = format(today, 'MM');
        const year = format(today, 'yyyy');

        if (isDirector || isHr) {
          const [
            employeesRes,
            attendanceTodayRes,
            attendanceReportRes,
            schedulesRes,
            leaveRes,
            recruitmentsRes,
            applicantsRes,
            trainingSessionsRes,
            settingsRes,
            productionOverviewRes
          ] = await Promise.all([
            axios.get(`${API_URL}/employees?limit=500`, authConfig),
            axios.get(`${API_URL}/attendance/today`, authConfig),
            axios.get(`${API_URL}/attendance/report?startDate=${sevenDaysAgo}&endDate=${todayString}`, authConfig),
            axios.get(`${API_URL}/shifts/schedules?weekStart=${weekStartString}`, authConfig).catch(() => ({ data: { schedules: [] } })),
            axios.get(`${API_URL}/leave/all`, authConfig),
            axios.get(`${API_URL}/recruitment`, authConfig).catch(() => ({ data: [] })),
            axios.get(`${API_URL}/recruitment/applicants`, authConfig).catch(() => ({ data: [] })),
            axios.get(`${API_URL}/training/sessions`, authConfig).catch(() => ({ data: [] })),
            axios.get(`${API_URL}/system-settings`, authConfig).catch(() => ({ data: {} })),
            axios.get(`${API_URL}/production/overview?startDate=${sevenDaysAgo}&endDate=${todayString}`, authConfig).catch(() => ({
              data: { summary: {}, byLine: [], byDay: [], details: [] }
            }))
          ]);

          const employees = employeesRes.data.data || [];
          const attendanceToday = attendanceTodayRes.data.details || [];
          const attendanceDetails = attendanceReportRes.data.details || [];
          const schedules = schedulesRes.data.schedules || [];
          const leaveRequests = leaveRes.data || [];
          const recruitments = recruitmentsRes.data || [];
          const applicants = applicantsRes.data || [];
          const trainingSessions = trainingSessionsRes.data || [];
          const settings = settingsRes.data || {};
          const productionOverview = productionOverviewRes.data || { summary: {}, byLine: [], byDay: [], details: [] };

          const permanentCount = employees.filter((employee) => employee.employmentStatus === 'permanent').length;
          const temporaryCount = employees.filter((employee) => employee.employmentStatus === 'temporary').length;
          const pendingLeave = leaveRequests.filter((item) => item.status === 'pending').length;
          const approvedHiring = applicants.filter((item) => item.status === 'selected' || item.status === 'converted').length;
          const recentHires = [...employees]
            .filter((employee) => employee.hireDate)
            .sort((a, b) => new Date(b.hireDate) - new Date(a.hireDate))
            .slice(0, 6);

          const monthlyPayrollEstimate = employees.reduce((sum, employee) => {
            const baseSalary = Number(employee.position?.baseSalary || settings.baseSalary || 60000);
            const byEmployee = (attendanceReportRes.data.byEmployee || []).find(
              (entry) => entry.employee === `${employee.firstName} ${employee.lastName}`
            );
            const nightBonus = Number(byEmployee?.nightBonuses || 0) * Number(settings.nightBonusAmount || 500);
            const saturdayBonus = employee.employmentStatus === 'permanent'
              ? Number(settings.saturdayBonusAmount || 2000)
              : 0;
            return sum + baseSalary + nightBonus + saturdayBonus;
          }, 0);

          const attendanceByDay = Array.from({ length: 7 }, (_, index) => {
            const date = format(addDays(new Date(sevenDaysAgo), index), 'yyyy-MM-dd');
            const dayRecords = attendanceDetails.filter((record) => record.date === date);
            return {
              day: format(new Date(date), 'EEE'),
              present: dayRecords.filter((record) => record.status === 'present' || record.status === 'late').length,
              absent: dayRecords.filter((record) => record.status === 'absent').length
            };
          });

          if (isDirector) {
            const byLine = new Map();
            schedules.forEach((schedule) => {
              const line = schedule.productionLine?.name || 'Unassigned';
              const current = byLine.get(line) || { name: line, assignments: 0, night: 0, todayAssignments: 0 };
              current.assignments += 1;
              if (schedule.date === todayString) {
                current.todayAssignments += 1;
              }
              if (schedule.shift?.name === 'night') {
                current.night += 1;
              }
              byLine.set(line, current);
            });

            const activityItems = [
              ...leaveRequests.map((item) => ({
                id: `leave-${item.id}`,
                icon: <BeachAccess />,
                primary: `${item.employee?.firstName || 'Employee'} ${item.employee?.lastName || ''} requested ${item.leaveType?.name || 'leave'}`.trim(),
                secondary: item.createdAt || item.created_at || item.startDate
              })),
              ...recruitments.map((item) => ({
                id: `recruitment-${item.id}`,
                icon: <Work />,
                primary: `${item.title || 'Job posting'} is ${item.status || 'open'}`,
                secondary: item.updatedAt || item.updated_at || item.createdAt || item.created_at
              })),
              ...applicants.map((item) => ({
                id: `applicant-${item.id}`,
                icon: <Person />,
                primary: `${item.firstName || 'Applicant'} ${item.lastName || ''} is ${item.status || 'pending'}`.trim(),
                secondary: item.updatedAt || item.updated_at || item.applicationDate
              })),
              ...trainingSessions.map((item) => ({
                id: `training-${item.id}`,
                icon: <School />,
                primary: `${item.training?.name || 'Training'} session ${item.status || 'planned'}`,
                secondary: item.updatedAt || item.updated_at || item.startDate
              }))
            ]
              .filter((item) => item.secondary)
              .sort((a, b) => new Date(b.secondary) - new Date(a.secondary))
              .slice(0, 8);

            setStats({
              totalEmployees: employees.length,
              permanentCount,
              temporaryCount,
              presentToday: attendanceToday.filter((item) => item.status === 'present' || item.status === 'late').length,
              absentToday: attendanceToday.filter((item) => item.status === 'absent').length,
              monthlyPayrollEstimate,
              totalRevenue: Number(productionOverview.summary?.revenue || 0),
              totalProfit: Number(productionOverview.summary?.profit || 0),
              pendingLeave,
              approvedHiring,
              activeRecruitments: recruitments.filter((item) => item.status === 'open' || item.status === 'draft').length
            });
            setPrimaryChart(attendanceByDay);
            if ((productionOverview.byLine || []).length > 0) {
              setSecondaryChart(
                productionOverview.byLine.map((item) => ({
                  line: item.line,
                  revenue: Number(item.revenue || 0),
                  profit: Number(item.profit || 0)
                }))
              );
              setLeftList(
                productionOverview.byLine.slice(0, 5).map((line) => ({
                  id: line.line,
                  icon: <Work />,
                  primary: line.line,
                  secondary: `${currency(line.revenue || 0)} revenue | ${line.actualUnits || 0} units | ${line.downtimeMinutes || 0} min downtime`
                }))
              );
            } else {
              setSecondaryChart(Array.from(byLine.values()).map((item) => ({
                line: item.name,
                todayAssignments: item.todayAssignments,
                night: item.night
              })));
              setLeftList(
                Array.from(byLine.values())
                  .sort((a, b) => b.todayAssignments - a.todayAssignments)
                  .slice(0, 5)
                  .map((line) => ({
                    id: line.name,
                    icon: <Schedule />,
                    primary: line.name,
                    secondary: `${line.todayAssignments} scheduled today | ${line.night} night assignments this week`
                  }))
              );
            }
            setRightList(
              (attendanceReportRes.data.byEmployee || [])
                .slice()
                .sort((a, b) => (b.nightBonuses + b.sanctionAmount) - (a.nightBonuses + a.sanctionAmount))
                .slice(0, 5)
                .map((item) => ({
                  id: item.employee,
                  icon: <Assessment />,
                  primary: item.employee,
                  secondary: `${item.line || 'No line'} | ${item.nightBonuses || 0} night bonuses | ${currency(item.sanctionAmount || 0)}`
              }))
            );
            setRecentActivity(activityItems);
            return;
          }

          const departmentMap = new Map();
          const lineMap = new Map();
          employees.forEach((employee) => {
            const department = employee.department?.name || 'Unassigned';
            const line = employee.productionLine?.name || 'Unassigned';
            departmentMap.set(department, (departmentMap.get(department) || 0) + 1);
            lineMap.set(line, (lineMap.get(line) || 0) + 1);
          });

          setStats({
            totalEmployees: employees.length,
            permanentCount,
            temporaryCount,
            pendingLeave,
            openRecruitments: recruitments.filter((item) => item.status === 'open' || item.status === 'draft').length,
            totalApplicants: applicants.length,
            shortlisted: applicants.filter((item) => item.status === 'shortlisted').length
          });
          setPrimaryChart(
            Array.from(departmentMap.entries()).map(([department, total]) => ({ department, total }))
          );
          setSecondaryChart(
            Array.from(lineMap.entries()).map(([line, total]) => ({ line, total }))
          );
          setLeftList(
            recentHires.map((employee) => ({
              id: employee.id,
              icon: <Person />,
              primary: `${employee.firstName} ${employee.lastName}`,
              secondary: `${employee.position?.name || 'Position'} | Hired ${format(new Date(employee.hireDate), 'dd MMM yyyy')}`
            }))
          );
          setRightList(
            applicants
              .filter((item) => ['pending', 'shortlisted', 'interviewed', 'selected'].includes(item.status))
              .slice(0, 6)
              .map((applicant) => ({
                id: applicant.id,
                icon: <Work />,
                primary: `${applicant.firstName || ''} ${applicant.lastName || ''}`.trim(),
                secondary: `${applicant.status} | ${applicant.recruitment?.title || 'Applicant'}`
              }))
          );
          setRecentActivity(
            leaveRequests
              .filter((item) => item.status === 'pending')
              .slice(0, 8)
              .map((item) => ({
                id: item.id,
                icon: <BeachAccess />,
                primary: `${item.employee?.firstName || 'Employee'} ${item.employee?.lastName || ''} pending leave request`,
                secondary: item.createdAt || item.created_at || item.startDate
              }))
          );
          return;
        }

        if (managementUser) {
          if (isShiftSupervisor) {
            const [attendanceRes, myScheduleRes] = await Promise.all([
              axios.get(`${API_URL}/attendance/today`, authConfig),
              axios.get(`${API_URL}/shifts/my-schedule?weekStart=${weekStartString}`, authConfig)
            ]);

            const attendance = attendanceRes.data.details || [];
            const attendanceSummary = attendanceRes.data.summary || {};
            const mySchedules = myScheduleRes.data || [];
            const todaySchedule = mySchedules.find((schedule) => schedule.date === todayString) || mySchedules[0] || null;
            const lateEmployees = attendance.filter((item) => item.status === 'late');
            const absentEmployees = attendance.filter((item) => item.status === 'absent');

            setStats({
              today: format(today, 'dd MMM yyyy'),
              shift: todaySchedule?.shift?.name || 'No shift assigned',
              expected: attendanceSummary.totalExpected || 0,
              present: attendanceSummary.present || 0,
              late: attendanceSummary.late || 0,
              absent: attendanceSummary.absent || 0,
              notCheckedIn: attendanceSummary.notCheckedIn || 0
            });
            setLeftList(
              attendance.map((item) => ({
                id: item.id,
                icon: <CheckCircle />,
                primary: `${item.employee?.firstName || ''} ${item.employee?.lastName || ''}`.trim() || 'Employee',
                secondary: `${item.employee?.employeeCode || '-'} | ${item.status} | ${item.checkInTime ? format(new Date(item.checkInTime), 'HH:mm') : 'Not checked in'}`
              }))
            );
            setRightList(
              [...lateEmployees, ...absentEmployees].slice(0, 6).map((item) => ({
                id: `${item.id}-${item.status}`,
                icon: item.status === 'late' ? <Warning /> : <AccessTime />,
                primary: `${item.employee?.firstName || ''} ${item.employee?.lastName || ''}`.trim() || 'Employee',
                secondary: `${item.status} | ${item.lateMinutes || 0} late minutes | ${item.employee?.employeeCode || '-'}`
              }))
            );
            setRecentActivity([]);
            setPrimaryChart([]);
            setSecondaryChart([]);
            return;
          }

          if (isDepartmentHead) {
            const [employeesRes, trainingSessionsRes, recommendationsRes] = await Promise.all([
              axios.get(`${API_URL}/employees?limit=500`, authConfig),
              axios.get(`${API_URL}/training/sessions`, authConfig).catch(() => ({ data: [] })),
              axios.get(`${API_URL}/conversion-recommendations`, authConfig).catch(() => ({ data: [] }))
            ]);

            const employees = employeesRes.data.data || [];
            const sessions = trainingSessionsRes.data || [];
            const recommendations = recommendationsRes.data || [];
            const employeeProgress = new Map();

            sessions.forEach((session) => {
              (session.enrollments || []).forEach((enrollment) => {
                if (!enrollment.employeeId) {
                  return;
                }

                const current = employeeProgress.get(enrollment.employeeId) || {
                  total: 0,
                  completed: 0,
                  latestNotes: ''
                };
                current.total += 1;
                if (enrollment.status === 'completed') {
                  current.completed += 1;
                }
                if (enrollment.performanceNotes) {
                  current.latestNotes = enrollment.performanceNotes;
                }
                employeeProgress.set(enrollment.employeeId, current);
              });
            });

            const averagePerformance = recommendations.length > 0
              ? (recommendations.reduce((sum, item) => sum + Number(item.performanceRating || 0), 0) / recommendations.length).toFixed(1)
              : '0.0';

            setStats({
              departmentEmployees: employees.length,
              trainingCompleted: Array.from(employeeProgress.values()).filter((item) => item.completed > 0).length,
              performanceOverview: averagePerformance,
              pendingConversions: recommendations.filter((item) => item.status === 'pending').length
            });
            setPrimaryChart([]);
            setSecondaryChart([]);
            setLeftList(
              employees.slice(0, 8).map((employee) => ({
                id: employee.id,
                icon: <People />,
                primary: `${employee.firstName} ${employee.lastName}`,
                secondary: `${employee.position?.name || 'Employee'} | ${employee.productionLine?.name || employee.department?.name || 'Department'}`
              }))
            );
            setRightList(
              employees.slice(0, 8).map((employee) => {
                const progress = employeeProgress.get(employee.id) || { total: 0, completed: 0, latestNotes: '' };
                return {
                  id: `training-${employee.id}`,
                  icon: <School />,
                  primary: `${employee.firstName} ${employee.lastName}`,
                  secondary: `${progress.completed}/${progress.total} completed${progress.latestNotes ? ` | ${progress.latestNotes}` : ''}`
                };
              })
            );
            setRecentActivity(
              recommendations.slice(0, 8).map((item) => ({
                id: item.id,
                icon: <TrendingUp />,
                primary: `${item.employee?.firstName || 'Employee'} ${item.employee?.lastName || ''}`.trim(),
                secondary: `${item.recommendation} | ${item.status}`
              }))
            );
            return;
          }

          const [employeesRes, attendanceRes, schedulesRes, leaveRes, complaintsRes, productionOverviewRes] = await Promise.all([
            axios.get(`${API_URL}/employees?limit=500`, authConfig),
            axios.get(`${API_URL}/attendance/today`, authConfig),
            axios.get(`${API_URL}/shifts/schedules?weekStart=${weekStartString}`, authConfig),
            axios.get(`${API_URL}/leave/all`, authConfig).catch(() => ({ data: [] })),
            axios.get(`${API_URL}/complaints/all`, authConfig).catch(() => ({ data: [] })),
            axios.get(`${API_URL}/production/overview?startDate=${weekStartString}&endDate=${weekEndString}`, authConfig).catch(() => ({
              data: { summary: {}, byLine: [] }
            }))
          ]);

          const employees = employeesRes.data.data || [];
          const attendance = attendanceRes.data.details || [];
          const schedules = schedulesRes.data.schedules || [];
          const complaints = complaintsRes.data || [];
          const productionOverview = productionOverviewRes.data || { summary: {}, byLine: [] };

          if (isProductionManager) {
            const byLine = new Map();
            employees.forEach((employee) => {
              const line = employee.productionLine?.name || 'Unassigned';
              byLine.set(line, (byLine.get(line) || 0) + 1);
            });

            const byShift = new Map();
            attendance.forEach((item) => {
              const shift = item.scheduledShift?.name || item.shift?.name || 'unassigned';
              const current = byShift.get(shift) || { shift, present: 0, late: 0, absent: 0 };
              if (item.status === 'absent') {
                current.absent += 1;
              } else if (item.status === 'late') {
                current.late += 1;
              } else {
                current.present += 1;
              }
              byShift.set(shift, current);
            });

            const dryWeek = Boolean(schedulesRes.data.isDryBiscuitWeek);
            const linePerformance = (productionOverview.byLine || []).slice(0, 5);

            setStats({
              employees: employees.length,
              lines: byLine.size,
              weeklySchedules: schedules.length,
              dryWeek: dryWeek ? 'Active' : 'Inactive',
              late: attendance.filter((item) => item.status === 'late').length
            });
            setPrimaryChart(
              Array.from(byLine.entries()).map(([line, total]) => ({ line, total }))
            );
            setSecondaryChart(
              Array.from(byShift.values()).map((shift) => ({
                shift: shift.shift,
                present: shift.present,
                late: shift.late,
                absent: shift.absent
              }))
            );
            setLeftList(
              schedules
                .slice(0, 6)
                .map((schedule) => ({
                  id: schedule.id,
                  icon: <Schedule />,
                  primary: `${schedule.employee?.firstName || ''} ${schedule.employee?.lastName || ''}`.trim() || 'Employee',
                  secondary: `${schedule.date} | ${schedule.shift?.name || 'Shift'} | ${schedule.productionLine?.name || 'Unassigned line'}`
                }))
            );
            setRightList(
              linePerformance.length > 0
                ? linePerformance.map((line) => ({
                    id: line.line,
                    icon: <Work />,
                    primary: line.line,
                    secondary: `${line.actualUnits || 0} units | ${line.downtimeMinutes || 0} min downtime`
                  }))
                : [
                    {
                      id: 'dry-week-status',
                      icon: <Assessment />,
                      primary: `Dry biscuit week: ${dryWeek ? 'Active' : 'Inactive'}`,
                      secondary: `Late records today: ${attendance.filter((item) => item.status === 'late').length}`
                    }
                  ]
            );
            setRecentActivity([]);
            return;
          }

          setStats({
            employees: employees.length,
            present: attendance.filter((item) => item.status === 'present' || item.status === 'late').length,
            absent: attendance.filter((item) => item.status === 'absent').length,
            pendingLeave: (leaveRes.data || []).filter((item) => item.status === 'pending').length,
            complaints: complaints.length
          });
          setLeftList(
            schedules
              .filter((schedule) => schedule.date === todayString)
              .slice(0, 6)
              .map((schedule) => ({
                id: schedule.id,
                icon: <Schedule />,
                primary: `${schedule.employee?.firstName || ''} ${schedule.employee?.lastName || ''}`.trim() || 'Employee',
                secondary: `${schedule.shift?.name || 'Shift'} | ${schedule.productionLine?.name || 'Unassigned line'}`
              }))
          );
          setRightList(
            complaints.slice(0, 5).map((item) => ({
              id: item.id,
              icon: <Feedback />,
              primary: `${item.employee?.firstName || item.user?.firstName || 'Employee'}: ${item.subject}`,
              secondary: `${item.category} | ${item.status}`
            }))
          );
          return;
        }

        const [profileRes, attendanceRes, schedulesRes, leaveRes, balancesRes] = await Promise.all([
          axios.get(`${API_URL}/auth/profile`, authConfig).catch(() => ({ data: {} })),
          axios.get(`${API_URL}/attendance/my-history?month=${month}&year=${year}`, authConfig),
          axios.get(`${API_URL}/shifts/my-schedule?weekStart=${weekStartString}`, authConfig),
          axios.get(`${API_URL}/leave/my-requests`, authConfig),
          axios.get(`${API_URL}/leave/my-balance`, authConfig).catch(() => ({ data: [] }))
        ]);

        const profile = profileRes.data || {};
        const records = attendanceRes.data?.records || [];
        const schedules = schedulesRes.data || [];
        const leaveRequests = leaveRes.data || [];
        const leaveBalances = balancesRes.data || [];
        const thisWeekSchedules = schedules.filter(
          (schedule) => schedule.date >= weekStartString && schedule.date <= weekEndString
        );
        const todaySchedule = schedules.find((schedule) => schedule.date === todayString) || null;
        const todayAttendance = records.find((record) => record.date === todayString) || null;
        const leaveRemaining = leaveBalances.reduce((sum, item) => sum + Number(item.remaining || 0), 0);
        const saturdayBonus = records.reduce((sum, item) => sum + Number(item.sanctionAmount || 0), 0);
        const monthlyBonus = (Number(records.filter((item) => item.nightBonusEarned).length) * 500) + saturdayBonus;

        setStats({
          welcomeName: profile.employee?.firstName || user?.firstName || 'Employee',
          todayShift: todaySchedule?.shift?.name || 'No shift assigned',
          todayTime: todaySchedule ? `${todaySchedule.shift?.startTime || '--:--'} - ${todaySchedule.shift?.endTime || '--:--'}` : 'No shift assigned',
          todayLine: todaySchedule?.productionLine?.name || 'No line assigned',
          todayAttendance: todayAttendance?.status || 'Not recorded',
          monthlyPresent: records.filter((item) => item.status === 'present' || item.status === 'late').length,
          monthlyLate: records.filter((item) => item.status === 'late').length,
          monthlyAbsent: records.filter((item) => item.status === 'absent').length,
          scheduled: thisWeekSchedules.length,
          pendingLeave: leaveRequests.filter((item) => item.status === 'pending').length,
          leaveRemaining,
          monthlyBonus
        });
        setLeftList(
          thisWeekSchedules.slice(0, 7).map((schedule) => ({
            id: schedule.id,
            icon: <Schedule />,
            primary: `${format(new Date(schedule.date), 'EEE, dd MMM')} | ${schedule.shift?.name || 'Shift'}`,
            secondary: `${schedule.shift?.startTime || '--:--'} - ${schedule.shift?.endTime || '--:--'} | ${schedule.productionLine?.name || 'No line assigned'}`
          }))
        );
        setRightList(
          records.slice(0, 6).map((item) => ({
            id: item.id,
            icon: item.status === 'absent' ? <Warning /> : item.status === 'late' ? <AccessTime /> : <CheckCircle />,
            primary: `${item.date} | ${item.status}`,
            secondary: `${item.checkInTime ? format(new Date(item.checkInTime), 'HH:mm') : '--:--'} - ${item.checkOutTime ? format(new Date(item.checkOutTime), 'HH:mm') : '--:--'} | ${item.lateMinutes || 0} late minutes`
          }))
        );
        setRecentActivity(
          leaveRequests.slice(0, 6).map((item) => ({
            id: item.id,
            icon: <BeachAccess />,
            primary: `${item.leaveType?.name || 'Leave'} request`,
            secondary: `${item.status || 'pending'} | ${item.startDate} to ${item.endDate}`
          }))
        );
      } catch (error) {
        console.error('Error loading dashboard:', error);
        setPrimaryChart([]);
        setSecondaryChart([]);
        setLeftList([]);
        setRightList([]);
        setRecentActivity([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [isDirector, isHr, isProductionManager, isShiftSupervisor, managementUser, refreshKey]);

  const handleQuickAttendance = async (mode) => {
    try {
      if (!quickAttendanceForm.employeeCode) {
        setQuickAttendanceMessage('Enter an employee code first.');
        return;
      }

      await axios.post(
        `${API_URL}/attendance/${mode}`,
        mode === 'checkin'
          ? quickAttendanceForm
          : { employeeCode: quickAttendanceForm.employeeCode },
        getAuthConfig()
      );

      setQuickAttendanceMessage(`${mode === 'checkin' ? 'Check-in' : 'Check-out'} successful.`);
      setQuickAttendanceForm({ employeeCode: '', notes: '' });
      setRefreshKey((current) => current + 1);
    } catch (error) {
      setQuickAttendanceMessage(error.response?.data?.message || 'Attendance action failed.');
    }
  };

  const cards = useMemo(() => {
    if (isDirector) {
      return [
        {
          title: 'Employees',
          value: stats.totalEmployees || 0,
          subtitle: `${stats.permanentCount || 0} permanent | ${stats.temporaryCount || 0} temporary`,
          icon: <People />,
          tint: '#7B1FA2'
        },
        {
          title: 'Present Today',
          value: stats.presentToday || 0,
          subtitle: 'Company-wide attendance',
          icon: <CheckCircle />,
          tint: '#8E24AA'
        },
        {
          title: 'Absent Today',
          value: stats.absentToday || 0,
          subtitle: 'All scheduled staff',
          icon: <Warning />,
          tint: '#C62828'
        },
        {
          title: 'Monthly Salary Summary',
          value: currency(stats.monthlyPayrollEstimate || 0),
          subtitle: 'Estimated gross payroll',
          icon: <Assessment />,
          tint: '#5E35B1'
        }
      ];
    }

    if (isHr) {
      return [
        {
          title: 'Employees',
          value: stats.totalEmployees || 0,
          subtitle: `${stats.permanentCount || 0} permanent | ${stats.temporaryCount || 0} temporary`,
          icon: <People />,
          tint: '#7B1FA2'
        },
        {
          title: 'Pending Leave',
          value: stats.pendingLeave || 0,
          subtitle: 'Requests to review',
          icon: <BeachAccess />,
          tint: '#8E24AA'
        },
        {
          title: 'Recruitment',
          value: stats.openRecruitments || 0,
          subtitle: `${stats.totalApplicants || 0} applicants`,
          icon: <Work />,
          tint: '#5E35B1'
        },
        {
          title: 'Shortlisted',
          value: stats.shortlisted || 0,
          subtitle: 'Candidates in progress',
          icon: <TrendingUp />,
          tint: '#6A1B9A'
        }
      ];
    }

    if (managementUser) {
      if (isShiftSupervisor) {
        return [
          { title: 'Today', value: stats.today || '-', icon: <AccessTime />, tint: '#7B1FA2' },
          { title: 'Current Shift', value: stats.shift || '-', icon: <Schedule />, tint: '#8E24AA' },
          { title: 'Expected', value: stats.expected || 0, icon: <People />, tint: '#5E35B1' },
          { title: 'Present', value: stats.present || 0, icon: <CheckCircle />, tint: '#6A1B9A' }
        ];
      }

      if (isProductionManager) {
        return [
          { title: 'Employees By Line', value: stats.lines || 0, icon: <People />, tint: '#7B1FA2' },
          { title: 'Today Late Records', value: stats.late || 0, icon: <Warning />, tint: '#C62828' },
          { title: 'Weekly Schedules', value: stats.weeklySchedules || 0, icon: <Schedule />, tint: '#5E35B1' },
          { title: 'Dry Biscuit Week', value: stats.dryWeek || 'Inactive', icon: <Assessment />, tint: '#6A1B9A' }
        ];
      }

      if (isDepartmentHead) {
        return [
          { title: 'Department Employees', value: stats.departmentEmployees || 0, icon: <People />, tint: '#7B1FA2' },
          { title: 'Training Status', value: stats.trainingCompleted || 0, subtitle: 'Employees with completed training', icon: <School />, tint: '#8E24AA' },
          { title: 'Performance Overview', value: stats.performanceOverview || '0.0', subtitle: 'Average review score', icon: <TrendingUp />, tint: '#5E35B1' },
          { title: 'Pending Conversions', value: stats.pendingConversions || 0, icon: <Assessment />, tint: '#6A1B9A' }
        ];
      }

      return [
        { title: 'Total Employees', value: stats.employees || 0, icon: <People />, tint: '#7B1FA2' },
        { title: 'Present Today', value: stats.present || 0, icon: <CheckCircle />, tint: '#8E24AA' },
        { title: 'Pending Leave', value: stats.pendingLeave || 0, icon: <BeachAccess />, tint: '#5E35B1' },
        { title: 'Complaints', value: stats.complaints || 0, icon: <Feedback />, tint: '#6A1B9A' }
      ];
    }

    return [
      { title: 'Today Attendance', value: stats.todayAttendance || 'Not recorded', icon: <CheckCircle />, tint: '#7B1FA2' },
      { title: 'Today Schedule', value: stats.todayShift || 'No shift assigned', subtitle: stats.todayTime || '', icon: <Schedule />, tint: '#8E24AA' },
      { title: 'Leave Balance', value: stats.leaveRemaining || 0, subtitle: 'Remaining days', icon: <BeachAccess />, tint: '#5E35B1' },
      { title: 'Monthly Bonus', value: currency(stats.monthlyBonus || 0), subtitle: 'Night + Saturday bonuses', icon: <Assessment />, tint: '#6A1B9A' }
    ];
  }, [isDirector, isHr, isProductionManager, isDepartmentHead, isShiftSupervisor, managementUser, stats]);

  if (loading) {
    return <LinearProgress />;
  }

  return (
    <Box>
      <Typography variant={isMobile ? 'h5' : 'h4'} gutterBottom color="primary.main">
        {isDirector ? 'Director Dashboard' : isHr ? 'HR Dashboard' : isDepartmentHead ? 'Department Head Dashboard' : isShiftSupervisor ? 'Shift Supervisor Dashboard' : managementUser ? 'Dashboard' : 'My Dashboard'}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 900 }}>
        {isDirector
          ? 'Company-wide director overview with staffing, attendance, salary summary, production coverage, and recent activity.'
          : isHr
            ? 'HR overview of staffing, departments, production lines, leave, recruitment, and training.'
            : isDepartmentHead
              ? 'Department overview with employee list, training progress, performance insight, and conversion recommendations.'
            : isShiftSupervisor
              ? 'Track your active shift, expected employees, and attendance recording for today.'
            : isProductionManager
              ? 'Production overview of staffing by line, attendance by shift, weekly schedules, dry biscuit status, and line efficiency.'
            : managementUser
              ? 'Monitor workforce activity, complaints, attendance, and operational planning.'
              : `Welcome ${stats.welcomeName || user?.firstName || 'Employee'}. Review today's schedule, attendance, leave balance, and monthly bonuses.`}
      </Typography>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {cards.map((card) => (
          <Grid item xs={12} sm={6} md={3} key={card.title}>
            <StatCard {...card} />
          </Grid>
        ))}
      </Grid>

      {(isDirector || isHr || isProductionManager) && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={7}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {isDirector ? 'Company-Wide Attendance Chart' : isHr ? 'Employees by Department' : 'Employees By Production Line'}
                </Typography>
                <ResponsiveContainer width="100%" height={isMobile ? 240 : 280}>
                  <BarChart data={primaryChart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey={isDirector ? 'day' : isHr ? 'department' : 'line'} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {isDirector ? (
                      <>
                        <Bar dataKey="present" fill="#7B1FA2" />
                        <Bar dataKey="absent" fill="#C62828" />
                      </>
                    ) : (
                      <Bar dataKey="total" fill="#7B1FA2" />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={5}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {isDirector ? 'Revenue / Production Overview' : isHr ? 'Employees by Production Line' : "Today's Attendance By Shift"}
                </Typography>
                <ResponsiveContainer width="100%" height={isMobile ? 220 : 220}>
                  <BarChart data={secondaryChart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey={isProductionManager ? 'shift' : 'line'} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {isDirector ? (
                      <>
                        <Bar dataKey="revenue" fill="#7B1FA2" />
                        <Bar dataKey="profit" fill="#8E24AA" />
                      </>
                    ) : isProductionManager ? (
                      <>
                        <Bar dataKey="present" fill="#7B1FA2" />
                        <Bar dataKey="late" fill="#FB8C00" />
                        <Bar dataKey="absent" fill="#C62828" />
                      </>
                    ) : (
                      <Bar dataKey="total" fill="#5E35B1" />
                    )}
                  </BarChart>
                </ResponsiveContainer>
                <Alert severity="info" sx={{ mt: 2 }}>
                  {isDirector
                    ? stats.totalRevenue
                      ? 'This production overview is now connected to your production revenue data.'
                      : 'No production revenue rows were found yet, so this panel is using operational fallback data.'
                    : isProductionManager
                      ? `Dry biscuit week is currently ${stats.dryWeek || 'Inactive'}.`
                    : 'This HR view is connected to live employee records grouped by department and production line.'}
                </Alert>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={(isDirector || isHr || isProductionManager || isShiftSupervisor) ? 4 : 6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {isDirector ? 'Production Performance' : isHr ? 'Recent Hires' : isProductionManager ? 'Weekly Schedule Overview' : isDepartmentHead ? 'Department Employees' : isShiftSupervisor ? 'Employees Expected For Current Shift' : managementUser ? 'Today Schedule Snapshot' : 'My Schedule'}
              </Typography>
              <List>
                {leftList.length === 0 ? (
                  <ListItem>
                    <ListItemText
                      primary={isDirector ? 'No production records found for this period' : isHr ? 'No recent hires found' : isProductionManager ? 'No schedules found for this week' : isDepartmentHead ? 'No department employees found' : isShiftSupervisor ? 'No employees found for your current shift' : managementUser ? 'No schedules found for today' : 'No schedules found for this week'}
                      secondary="Once records are available, they will appear here."
                    />
                  </ListItem>
                ) : (
                  leftList.map((item) => (
                    <ListItem key={item.id}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: '#E1BEE7', color: '#5E35B1' }}>
                          {item.icon}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText primary={item.primary} secondary={item.secondary} />
                    </ListItem>
                  ))
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={(isDirector || isHr || isProductionManager || isShiftSupervisor) ? 4 : 6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {isDirector ? 'Bonuses and Sanctions Snapshot' : isHr ? 'Recruitment Statistics' : isProductionManager ? 'Production Line Efficiency' : isDepartmentHead ? 'Training Status' : isShiftSupervisor ? 'Late And Absent Employees' : managementUser ? 'Complaints' : 'My Attendance Summary'}
              </Typography>
              <List>
                {rightList.length === 0 ? (
                  <ListItem>
                    <ListItemText
                      primary={isDirector ? 'No bonus or sanction activity found' : isHr ? 'No recruitment activity found' : isProductionManager ? 'No line efficiency data found' : isDepartmentHead ? 'No training records found for this department' : isShiftSupervisor ? 'No late or absent employees for your shift' : managementUser ? 'No complaints received yet' : 'No attendance records found for this month'}
                      secondary="New items will appear here."
                    />
                  </ListItem>
                ) : (
                  rightList.map((item) => (
                    <ListItem key={item.id}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: '#F3E5F5', color: '#6A1B9A' }}>
                          {item.icon}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText primary={item.primary} secondary={item.secondary} />
                    </ListItem>
                  ))
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={(isDirector || isHr || isProductionManager || isShiftSupervisor) ? 4 : 12}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {isDirector ? 'Recent Activity Log' : isHr ? 'Pending HR Activity' : isProductionManager ? 'Operations Summary' : isDepartmentHead ? 'Conversion Activity' : isShiftSupervisor ? 'Quick Check-In' : 'Leave Requests'}
              </Typography>
              {(isDirector || isHr || isDepartmentHead) ? (
                <List>
                  {recentActivity.length === 0 ? (
                    <ListItem>
                      <ListItemText primary={isDepartmentHead ? 'No conversion recommendations found' : 'No recent activity found'} secondary="New activity will appear here." />
                    </ListItem>
                  ) : (
                    recentActivity.map((item) => (
                      <ListItem key={item.id}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: '#EDE7F6', color: '#5E35B1' }}>
                            {item.icon}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={item.primary}
                          secondary={isDepartmentHead || !item.secondary ? item.secondary : format(new Date(item.secondary), 'dd MMM yyyy HH:mm')}
                        />
                      </ListItem>
                    ))
                  )}
                </List>
              ) : isProductionManager ? (
                <Typography variant="body2" color="text.secondary">
                  Production Manager access is limited to staffing, attendance, shifts, and reports. Employee records are view-only here.
                </Typography>
              ) : isShiftSupervisor ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField
                    size="small"
                    label="Employee Code"
                    value={quickAttendanceForm.employeeCode}
                    onChange={(event) => setQuickAttendanceForm((current) => ({ ...current, employeeCode: event.target.value }))}
                  />
                  <TextField
                    size="small"
                    label="Notes"
                    value={quickAttendanceForm.notes}
                    onChange={(event) => setQuickAttendanceForm((current) => ({ ...current, notes: event.target.value }))}
                  />
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Button variant="contained" onClick={() => handleQuickAttendance('checkin')}>
                      Check In
                    </Button>
                    <Button variant="outlined" onClick={() => handleQuickAttendance('checkout')}>
                      Check Out
                    </Button>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {quickAttendanceMessage || 'Enter an employee code to record attendance for your current shift.'}
                  </Typography>
                </Box>
              ) : !managementUser ? (
                <List>
                  {recentActivity.length === 0 ? (
                    <ListItem>
                      <ListItemText primary="No leave requests found" secondary="Your leave requests will appear here." />
                    </ListItem>
                  ) : (
                    recentActivity.map((item) => (
                      <ListItem key={item.id}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: '#EDE7F6', color: '#5E35B1' }}>
                            {item.icon}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText primary={item.primary} secondary={item.secondary} />
                      </ListItem>
                    ))
                  )}
                </List>
              ) : (
                <>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                    <Chip label={stats.todayLine || 'No line assigned'} color="primary" />
                    <Chip label={stats.todayTime || 'No shift assigned'} variant="outlined" />
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Apply leave from the Leave Requests page, check your weekly schedule, and review your attendance and earned bonuses here.
                  </Typography>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {!managementUser && (
        <Alert severity="info" sx={{ mt: 3 }}>
          Your worker account is limited to your own dashboard, schedule, attendance, leave requests, and profile details.
        </Alert>
      )}
    </Box>
  );
}
