import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { DIRECTOR_ONLY_ROLES } from './utils/auth';
import Login from './pages/Login';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Attendance from './pages/Attendance';
import Shifts from './pages/Shifts';
import Leave from './pages/Leave';
import Recruitment from './pages/Recruitment';
import Training from './pages/Training';
import Payroll from './pages/Payroll';
import Performance from './pages/Performance';
import Profile from './pages/Profile';
import Reports from './pages/Reports';
import SystemSettings from './pages/SystemSettings';
import UserManagement from './pages/UserManagement';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';

const theme = createTheme({
  palette: {
    primary: {
      main: '#7B1FA2',
      light: '#BA68C8',
      dark: '#4A148C'
    },
    secondary: {
      main: '#AB47BC',
      light: '#CE93D8',
      dark: '#6A1B9A'
    },
    success: {
      main: '#8E24AA',
      light: '#E1BEE7',
      dark: '#6A1B9A'
    },
    warning: {
      main: '#BA68C8',
      light: '#F3E5F5',
      dark: '#7B1FA2'
    },
    info: {
      main: '#9575CD',
      light: '#EDE7F6',
      dark: '#5E35B1'
    },
    background: {
      default: '#F7F1E8',
      paper: '#FFF9F1'
    }
  }
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ToastContainer position="top-right" autoClose={3000} />
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />

          <Route
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route
              path="/attendance"
              element={
                <PrivateRoute allowedRoles={['director', 'hr', 'production_manager', 'shift_supervisor', 'worker']}>
                  <Attendance />
                </PrivateRoute>
              }
            />
            <Route
              path="/shifts"
              element={
                <PrivateRoute allowedRoles={['director', 'hr', 'production_manager', 'shift_supervisor', 'worker']}>
                  <Shifts />
                </PrivateRoute>
              }
            />
            <Route
              path="/leave"
              element={
                <PrivateRoute allowedRoles={['director', 'hr', 'worker']}>
                  <Leave />
                </PrivateRoute>
              }
            />
            <Route
              path="/training"
              element={
                <PrivateRoute allowedRoles={['director', 'hr', 'department_head']}>
                  <Training />
                </PrivateRoute>
              }
            />
            <Route
              path="/payroll"
              element={
                <PrivateRoute allowedRoles={['hr']}>
                  <Payroll />
                </PrivateRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <PrivateRoute allowedRoles={['director', 'hr', 'production_manager']}>
                  <Reports />
                </PrivateRoute>
              }
            />
            <Route
              path="/system-settings"
              element={
                <PrivateRoute allowedRoles={DIRECTOR_ONLY_ROLES}>
                  <SystemSettings />
                </PrivateRoute>
              }
            />
            <Route
              path="/user-management"
              element={
                <PrivateRoute allowedRoles={DIRECTOR_ONLY_ROLES}>
                  <UserManagement />
                </PrivateRoute>
              }
            />
            <Route
              path="/employees"
              element={
                <PrivateRoute allowedRoles={['director', 'hr', 'production_manager', 'department_head']}>
                  <Employees />
                </PrivateRoute>
              }
            />
            <Route
              path="/recruitment"
              element={
                <PrivateRoute allowedRoles={['director', 'hr']}>
                  <Recruitment />
                </PrivateRoute>
              }
            />
            <Route
              path="/performance"
              element={
                <PrivateRoute allowedRoles={['hr', 'department_head']}>
                  <Performance />
                </PrivateRoute>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
