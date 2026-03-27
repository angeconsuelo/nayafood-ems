import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  LinearProgress,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stack,
  Typography
} from '@mui/material';
import axios from 'axios';
import { format } from 'date-fns';
import { API_URL } from '../config/api';
import { getAuthConfig, getStoredUser, isManagementRole } from '../utils/auth';

const months = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' }
];

const formatCurrency = (value) => `${Number(value || 0).toLocaleString()} CFA`;

export default function Payroll() {
  const user = getStoredUser();
  const managementUser = isManagementRole(user?.role);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'MM'));
  const [selectedYear, setSelectedYear] = useState(format(new Date(), 'yyyy'));
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [employeePayroll, setEmployeePayroll] = useState(null);

  useEffect(() => {
    const fetchPayroll = async () => {
      setLoading(true);
      try {
        const authConfig = getAuthConfig();
        const startDate = `${selectedYear}-${selectedMonth}-01`;
        const endDate = `${selectedYear}-${selectedMonth}-31`;

        if (managementUser) {
          const [employeesRes, attendanceRes] = await Promise.all([
            axios.get(`${API_URL}/employees?limit=500`, authConfig),
            axios.get(`${API_URL}/attendance/report?startDate=${startDate}&endDate=${endDate}`, authConfig)
          ]);

          const employeeRows = employeesRes.data.data || [];
          const attendanceByEmployee = new Map(
            (attendanceRes.data.byEmployee || []).map((entry) => [entry.employee, entry])
          );

          setRows(
            employeeRows.map((employee) => {
              const fullName = `${employee.firstName} ${employee.lastName}`;
              const attendance = attendanceByEmployee.get(fullName) || {};
              const baseSalary = Number(employee.position?.baseSalary || 60000);
              const nightBonus = (attendance.nightBonuses || 0) * 500;
              const saturdayBonus = employee.employmentStatus === 'permanent' ? 2000 : 0;
              const netSalary = baseSalary + nightBonus + saturdayBonus;

              return {
                id: employee.id,
                name: fullName,
                code: employee.employeeCode,
                position: employee.position?.name || '-',
                line: employee.productionLine?.name || '-',
                baseSalary,
                nightBonus,
                saturdayBonus,
                netSalary
              };
            })
          );
        } else {
          const [profileRes, attendanceRes] = await Promise.all([
            axios.get(`${API_URL}/auth/profile`, authConfig),
            axios.get(`${API_URL}/attendance/my-history?month=${selectedMonth}&year=${selectedYear}`, authConfig)
          ]);

          const profile = profileRes.data;
          const stats = attendanceRes.data.stats || {};
          const employee = profile.employee || {};
          const baseSalary = Number(employee.position?.baseSalary || 60000);
          const nightBonus = (stats.nightBonuses || 0) * 500;
          const saturdayBonus = employee.employmentStatus === 'permanent' ? 2000 : 0;
          const netSalary = baseSalary + nightBonus + saturdayBonus;

          setEmployeePayroll({
            name: `${employee.firstName || profile.firstName || ''} ${employee.lastName || profile.lastName || ''}`.trim(),
            code: employee.employeeCode || '-',
            department: employee.department?.name || '-',
            position: employee.position?.name || '-',
            line: employee.productionLine?.name || '-',
            baseSalary,
            nightShifts: stats.nightBonuses || 0,
            nightBonus,
            saturdayBonus,
            absentDays: stats.absent || 0,
            lateDays: stats.late || 0,
            netSalary
          });
        }
      } catch (error) {
        console.error('Error loading payroll:', error);
        setRows([]);
        setEmployeePayroll(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPayroll();
  }, [managementUser, selectedMonth, selectedYear]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, row) => ({
          baseSalary: acc.baseSalary + row.baseSalary,
          nightBonus: acc.nightBonus + row.nightBonus,
          saturdayBonus: acc.saturdayBonus + row.saturdayBonus,
          netSalary: acc.netSalary + row.netSalary
        }),
        { baseSalary: 0, nightBonus: 0, saturdayBonus: 0, netSalary: 0 }
      ),
    [rows]
  );

  const payrollExportRows = useMemo(
    () =>
      rows.map((row) => ({
        Employee: row.name,
        Code: row.code,
        Position: row.position,
        Line: row.line,
        'Base Salary': row.baseSalary,
        'Night Bonus': row.nightBonus,
        'Saturday Bonus': row.saturdayBonus,
        'Net Salary': row.netSalary
      })),
    [rows]
  );

  const downloadFile = (content, fileName, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportCsv = () => {
    const headers = ['Employee', 'Code', 'Position', 'Line', 'Base Salary', 'Night Bonus', 'Saturday Bonus', 'Net Salary'];
    const csvRows = payrollExportRows.map((row) =>
      headers.map((header) => `"${row[header] ?? ''}"`).join(',')
    );
    const csvContent = [headers.join(','), ...csvRows].join('\n');
    downloadFile(
      csvContent,
      `payroll-${selectedYear}-${selectedMonth}.csv`,
      'text/csv;charset=utf-8;'
    );
  };

  const handleExportExcel = () => {
    const htmlRows = payrollExportRows.map(
      (row) => `
        <tr>
          <td>${row.Employee}</td>
          <td>${row.Code}</td>
          <td>${row.Position}</td>
          <td>${row.Line}</td>
          <td>${row['Base Salary']}</td>
          <td>${row['Night Bonus']}</td>
          <td>${row['Saturday Bonus']}</td>
          <td>${row['Net Salary']}</td>
        </tr>`
    ).join('');

    const htmlTable = `
      <table>
        <thead>
          <tr>
            <th>Employee</th>
            <th>Code</th>
            <th>Position</th>
            <th>Line</th>
            <th>Base Salary</th>
            <th>Night Bonus</th>
            <th>Saturday Bonus</th>
            <th>Net Salary</th>
          </tr>
        </thead>
        <tbody>
          ${htmlRows}
          <tr>
            <td colspan="4"><strong>Total</strong></td>
            <td><strong>${totals.baseSalary}</strong></td>
            <td><strong>${totals.nightBonus}</strong></td>
            <td><strong>${totals.saturdayBonus}</strong></td>
            <td><strong>${totals.netSalary}</strong></td>
          </tr>
        </tbody>
      </table>
    `;

    downloadFile(
      `\ufeff${htmlTable}`,
      `payroll-${selectedYear}-${selectedMonth}.xls`,
      'application/vnd.ms-excel;charset=utf-8;'
    );
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'stretch', md: 'center' }, mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" color="primary.main">
            {managementUser ? 'Payroll Management' : 'My Payroll'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {managementUser
              ? 'Review monthly payroll calculations.'
              : 'Review your salary estimate based on base pay, night bonus, and Saturday bonus.'}
          </Typography>
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ width: { xs: '100%', md: 'auto' } }}>
          <Select size="small" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)}>
            {months.map((month) => (
              <MenuItem key={month.value} value={month.value}>
                {month.label}
              </MenuItem>
            ))}
          </Select>
          <Select size="small" value={selectedYear} onChange={(event) => setSelectedYear(event.target.value)}>
            {['2024', '2025', '2026', '2027'].map((year) => (
              <MenuItem key={year} value={year}>
                {year}
              </MenuItem>
            ))}
          </Select>
          {managementUser && (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button variant="outlined" onClick={handleExportCsv}>
                Export CSV
              </Button>
              <Button variant="contained" onClick={handleExportExcel}>
                Export Excel
              </Button>
            </Stack>
          )}
        </Stack>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {!managementUser && (
        <Alert severity="info" sx={{ mb: 3 }}>
          This employee payroll page uses your own attendance and job data. It does not depend on the HR payroll screen.
        </Alert>
      )}

      {managementUser ? (
        <Card>
          <CardContent>
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Employee</TableCell>
                    <TableCell>Code</TableCell>
                    <TableCell>Position</TableCell>
                    <TableCell>Base Salary</TableCell>
                    <TableCell>Night Bonus</TableCell>
                    <TableCell>Saturday Bonus</TableCell>
                    <TableCell>Net Salary</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>{row.code}</TableCell>
                      <TableCell>{row.position}</TableCell>
                      <TableCell>{formatCurrency(row.baseSalary)}</TableCell>
                      <TableCell>{formatCurrency(row.nightBonus)}</TableCell>
                      <TableCell>{formatCurrency(row.saturdayBonus)}</TableCell>
                      <TableCell>{formatCurrency(row.netSalary)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={3}><strong>Total</strong></TableCell>
                    <TableCell><strong>{formatCurrency(totals.baseSalary)}</strong></TableCell>
                    <TableCell><strong>{formatCurrency(totals.nightBonus)}</strong></TableCell>
                    <TableCell><strong>{formatCurrency(totals.saturdayBonus)}</strong></TableCell>
                    <TableCell><strong>{formatCurrency(totals.netSalary)}</strong></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      ) : (
        employeePayroll && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Salary Summary
                  </Typography>
                  <TableContainer sx={{ overflowX: 'auto' }}>
                    <Table>
                      <TableBody>
                        <TableRow><TableCell>Name</TableCell><TableCell>{employeePayroll.name}</TableCell></TableRow>
                        <TableRow><TableCell>Employee Code</TableCell><TableCell>{employeePayroll.code}</TableCell></TableRow>
                        <TableRow><TableCell>Department</TableCell><TableCell>{employeePayroll.department}</TableCell></TableRow>
                        <TableRow><TableCell>Position</TableCell><TableCell>{employeePayroll.position}</TableCell></TableRow>
                        <TableRow><TableCell>Production Line</TableCell><TableCell>{employeePayroll.line}</TableCell></TableRow>
                        <TableRow><TableCell>Base Salary</TableCell><TableCell>{formatCurrency(employeePayroll.baseSalary)}</TableCell></TableRow>
                        <TableRow><TableCell>Night Shifts</TableCell><TableCell>{employeePayroll.nightShifts}</TableCell></TableRow>
                        <TableRow><TableCell>Night Bonus</TableCell><TableCell>{formatCurrency(employeePayroll.nightBonus)}</TableCell></TableRow>
                        <TableRow><TableCell>Saturday Bonus</TableCell><TableCell>{formatCurrency(employeePayroll.saturdayBonus)}</TableCell></TableRow>
                        <TableRow><TableCell>Estimated Net Salary</TableCell><TableCell><strong>{formatCurrency(employeePayroll.netSalary)}</strong></TableCell></TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Attendance Notes
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                    <Chip label={`Late: ${employeePayroll.lateDays}`} color="warning" />
                    <Chip label={`Absent: ${employeePayroll.absentDays}`} color="error" />
                    <Chip label={`Night: ${employeePayroll.nightShifts}`} color="primary" />
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    This page uses the base salary of 60,000 CFA by default and applies the 2,000 CFA Saturday bonus for permanent employees.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )
      )}
    </Box>
  );
}
