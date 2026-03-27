import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Typography
} from '@mui/material';
import axios from 'axios';
import { format } from 'date-fns';
import { API_URL } from '../config/api';
import { getAuthConfig, getStoredUser } from '../utils/auth';

const downloadFile = (content, filename, type) => {
  const blob = new Blob([content], { type });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
};

export default function Reports() {
  const user = getStoredUser();
  const isHr = user?.role === 'hr';
  const isProductionManager = user?.role === 'production_manager';
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [stats, setStats] = useState({
    totalEmployees: 0,
    attendanceRecords: 0,
    pendingLeave: 0,
    salaryEstimate: 0,
    nightBonuses: 0,
    bonusAmount: 0,
    totalRevenue: 0,
    totalProfit: 0,
    openRecruitments: 0
  });

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      try {
        const month = format(new Date(), 'MM');
        const year = format(new Date(), 'yyyy');
        const startDate = `${year}-${month}-01`;
        const endDate = `${year}-${month}-31`;

        const [employeesRes, attendanceRes, leaveRes, settingsRes, recruitmentRes, productionRes] = await Promise.all([
          axios.get(`${API_URL}/employees?limit=500`, getAuthConfig()),
          axios.get(`${API_URL}/attendance/report?startDate=${startDate}&endDate=${endDate}`, getAuthConfig()),
          axios.get(`${API_URL}/leave/all`, getAuthConfig()),
          axios.get(`${API_URL}/system-settings`, getAuthConfig()).catch(() => ({ data: {} })),
          axios.get(`${API_URL}/recruitment`, getAuthConfig()).catch(() => ({ data: [] })),
          axios.get(`${API_URL}/production/overview?startDate=${startDate}&endDate=${endDate}`, getAuthConfig()).catch(() => ({
            data: { summary: {} }
          }))
        ]);

        const employees = employeesRes.data.data || [];
        const settings = settingsRes.data || {};
        const bonusAmount = (attendanceRes.data.summary?.totalNightBonuses || 0) * Number(settings.nightBonusAmount || 500);
        const salaryEstimate = employees.reduce(
          (sum, employee) => sum + Number(employee.position?.baseSalary || settings.baseSalary || 60000),
          0
        );

        setStats({
          totalEmployees: employeesRes.data.total || employees.length || 0,
          attendanceRecords: attendanceRes.data.summary?.total || 0,
          pendingLeave: (leaveRes.data || []).filter((item) => item.status === 'pending').length,
          salaryEstimate,
          nightBonuses: attendanceRes.data.summary?.totalNightBonuses || 0,
          bonusAmount,
          totalRevenue: Number(productionRes.data.summary?.revenue || 0),
          totalProfit: Number(productionRes.data.summary?.profit || 0),
          openRecruitments: (recruitmentRes.data || []).filter((item) => item.status === 'open' || item.status === 'draft').length
        });
      } catch (error) {
        setMessage(error.response?.data?.message || 'Failed to load reports');
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  const reportRows = useMemo(
    () => [
      ['Total Employees', stats.totalEmployees],
      ['Attendance Records', stats.attendanceRecords],
      ['Pending Leave', stats.pendingLeave],
      ['Monthly Salary Estimate', stats.salaryEstimate],
      ['Night Bonuses', stats.nightBonuses],
      ['Bonus Amount', stats.bonusAmount],
      ['Production Revenue', stats.totalRevenue],
      ['Production Profit', stats.totalProfit],
      ['Open Recruitment', stats.openRecruitments]
    ],
    [stats]
  );

  const handleExportExcel = () => {
    const csv = ['Metric,Value', ...reportRows.map(([label, value]) => `"${label}",${value}`)].join('\n');
    downloadFile(csv, `${isHr ? 'hr' : isProductionManager ? 'production-manager' : 'director'}-report-${format(new Date(), 'yyyy-MM-dd')}.csv`, 'text/csv;charset=utf-8;');
  };

  const handleExportPdf = () => {
    const reportHtml = `
      <html>
        <head><title>Director Report</title></head>
        <body style="font-family: Arial, sans-serif; padding: 24px;">
          <h1>${isHr ? 'HR Report' : isProductionManager ? 'Production Manager Report' : 'Director Report'}</h1>
          <p>Date: ${format(new Date(), 'dd MMM yyyy HH:mm')}</p>
          <table border="1" cellspacing="0" cellpadding="8" style="border-collapse: collapse; width: 100%;">
            <tr><th align="left">Metric</th><th align="left">Value</th></tr>
            ${reportRows.map(([label, value]) => `<tr><td>${label}</td><td>${value}</td></tr>`).join('')}
          </table>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      setMessage('Popup was blocked. Please allow popups to export PDF.');
      return;
    }

    printWindow.document.write(reportHtml);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <Box>
      <Typography variant="h4" color="primary.main" gutterBottom>
        {isHr ? 'HR Reports' : isProductionManager ? 'Production Reports' : 'Reports'}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {isHr
          ? 'HR reporting center for workforce, attendance, leave, recruitment, and training oversight.'
          : isProductionManager
            ? 'Production reporting center for shifts, attendance by shift, and staffing by production line.'
          : 'Director reporting center for workforce, salary, attendance, bonus, leave, recruitment, and operational reporting.'}
      </Typography>
      {loading && <LinearProgress sx={{ mb: 2 }} />}
      {message && <Alert severity="info" sx={{ mb: 3 }}>{message}</Alert>}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {Object.entries(stats).map(([key, value]) => (
          <Grid item xs={12} sm={6} md={3} key={key}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {key
                    .replace(/([A-Z])/g, ' $1')
                    .replace(/^./, (char) => char.toUpperCase())}
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {['salaryEstimate', 'bonusAmount', 'totalRevenue', 'totalProfit'].includes(key)
                    ? `${Number(value || 0).toLocaleString()} CFA`
                    : value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button variant="outlined" onClick={handleExportExcel}>Export Excel</Button>
            <Button variant="outlined" onClick={handleExportPdf}>Export PDF</Button>
          </Box>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Available Report Areas
          </Typography>
          <List>
            {isHr ? (
              <>
                <ListItem><ListItemText primary="Employee turnover report" /></ListItem>
                <ListItem><ListItemText primary="Recruitment report" /></ListItem>
                <ListItem><ListItemText primary="Training completion report" /></ListItem>
                <ListItem><ListItemText primary="Attendance and leave oversight report" /></ListItem>
              </>
            ) : isProductionManager ? (
              <>
                <ListItem><ListItemText primary="Shift report" /></ListItem>
                <ListItem><ListItemText primary="Attendance by shift report" /></ListItem>
                <ListItem><ListItemText primary="Production line staffing report" /></ListItem>
              </>
            ) : (
              <>
                <ListItem><ListItemText primary="Salary reports and monthly salary summary" /></ListItem>
                <ListItem><ListItemText primary="Attendance reports with sanctions and bonus totals" /></ListItem>
                <ListItem><ListItemText primary="Leave oversight and approval monitoring" /></ListItem>
                <ListItem><ListItemText primary="Recruitment and training activity overview" /></ListItem>
                <ListItem><ListItemText primary="Operational production scheduling summary" /></ListItem>
              </>
            )}
          </List>
        </CardContent>
      </Card>
    </Box>
  );
}
