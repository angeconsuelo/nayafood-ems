import React, { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';
import {
  AccessTime,
  Assessment,
  BeachAccess,
  Dashboard,
  Logout,
  Menu as MenuIcon,
  Notifications,
  People,
  Person,
  Schedule,
  School,
  Settings
} from '@mui/icons-material';
import { AdminPanelSettings, AttachMoney, HowToReg, TrendingUp } from '@mui/icons-material';
import axios from 'axios';
import { API_URL } from '../config/api';
import { getAuthConfig, getStoredUser, isManagementRole } from '../utils/auth';

const drawerWidth = 260;

const allMenuItems = [
  { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard', roles: ['director', 'hr', 'production_manager', 'department_head', 'shift_supervisor'] },
  { text: 'My Dashboard', icon: <Dashboard />, path: '/dashboard', roles: ['worker'] },
  { text: 'Employees', icon: <People />, path: '/employees', roles: ['director', 'hr', 'production_manager'] },
  { text: 'My Department', icon: <People />, path: '/employees', roles: ['department_head'] },
  { text: 'Attendance', icon: <AccessTime />, path: '/attendance', roles: ['director', 'hr', 'production_manager', 'shift_supervisor'] },
  { text: 'My Attendance', icon: <AccessTime />, path: '/attendance', roles: ['worker'] },
  { text: 'Shifts', icon: <Schedule />, path: '/shifts', roles: ['director', 'hr', 'production_manager'] },
  { text: 'My Schedule', icon: <Schedule />, path: '/shifts', roles: ['shift_supervisor'] },
  { text: 'My Schedule', icon: <Schedule />, path: '/shifts', roles: ['worker'] },
  { text: 'Leave', icon: <BeachAccess />, path: '/leave', roles: ['director', 'hr'] },
  { text: 'Leave Requests', icon: <BeachAccess />, path: '/leave', roles: ['worker'] },
  { text: 'Recruitment', icon: <HowToReg />, path: '/recruitment', roles: ['director', 'hr'] },
  { text: 'Training', icon: <School />, path: '/training', roles: ['director', 'hr', 'department_head'] },
  { text: 'Payroll', icon: <AttachMoney />, path: '/payroll', roles: ['hr'] },
  { text: 'Performance', icon: <TrendingUp />, path: '/performance', roles: ['hr', 'department_head'] },
  { text: 'Reports', icon: <Assessment />, path: '/reports', roles: ['director', 'hr', 'production_manager'] },
  { text: 'Profile', icon: <Person />, path: '/profile', roles: ['worker'] },
  { text: 'System Settings', icon: <Settings />, path: '/system-settings', roles: ['director'] },
  { text: 'User Management', icon: <AdminPanelSettings />, path: '/user-management', roles: ['director'] }
];

export default function Layout() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [open, setOpen] = useState(!isMobile);
  const [anchorEl, setAnchorEl] = useState(null);
  const [notificationsEl, setNotificationsEl] = useState(null);
  const [notificationItems, setNotificationItems] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();
  const user = getStoredUser() || {};
  const managementUser = isManagementRole(user.role);

  const menuItems = useMemo(
    () => allMenuItems.filter((item) => item.roles.includes(user.role)),
    [user.role]
  );

  useEffect(() => {
    setOpen(!isMobile);
  }, [isMobile]);

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const authConfig = getAuthConfig();

        if (user.role === 'director') {
          const [leaveRes, complaintsRes, usersRes] = await Promise.all([
            axios.get(`${API_URL}/leave/all`, authConfig).catch(() => ({ data: [] })),
            axios.get(`${API_URL}/complaints/all`, authConfig).catch(() => ({ data: [] })),
            axios.get(`${API_URL}/users`, authConfig).catch(() => ({ data: [] }))
          ]);

          const pendingLeave = (leaveRes.data || []).filter((item) => item.status === 'pending').length;
          const complaints = (complaintsRes.data || []).filter((item) => item.status === 'submitted').length;
          const inactiveUsers = (usersRes.data || []).filter((item) => item.isActive === false).length;

          setNotificationItems([
            { label: `${pendingLeave} pending leave requests`, path: '/leave' },
            { label: `${complaints} new complaints`, path: '/dashboard' },
            { label: `${inactiveUsers} inactive user accounts`, path: '/user-management' }
          ].filter((item) => !item.label.startsWith('0 ')));
          return;
        }

        if (managementUser) {
          if (user.role === 'department_head') {
            const [trainingRes, recommendationsRes] = await Promise.all([
              axios.get(`${API_URL}/training/sessions`, authConfig).catch(() => ({ data: [] })),
              axios.get(`${API_URL}/conversion-recommendations`, authConfig).catch(() => ({ data: [] }))
            ]);

            const pendingRecommendations = (recommendationsRes.data || []).filter((item) => item.status === 'pending').length;
            const activeSessions = (trainingRes.data || []).filter((item) => item.status === 'planned' || item.status === 'ongoing').length;

            setNotificationItems([
              { label: `${activeSessions} department training sessions`, path: '/training' },
              { label: `${pendingRecommendations} pending conversion recommendations`, path: '/performance' }
            ].filter((item) => !item.label.startsWith('0 ')));
            return;
          }

          const [leaveRes, complaintsRes] = await Promise.all([
            axios.get(`${API_URL}/leave/all`, authConfig).catch(() => ({ data: [] })),
            axios.get(`${API_URL}/complaints/all`, authConfig).catch(() => ({ data: [] }))
          ]);

          const pendingLeave = (leaveRes.data || []).filter((item) => item.status === 'pending').length;
          const complaints = (complaintsRes.data || []).filter((item) => item.status === 'submitted').length;

          setNotificationItems([
            { label: `${pendingLeave} pending leave requests`, path: '/leave' },
            { label: `${complaints} complaints need review`, path: '/dashboard' }
          ].filter((item) => !item.label.startsWith('0 ')));
          return;
        }

        const weekStart = new Date().toISOString().slice(0, 10);
        const [leaveRes, scheduleRes] = await Promise.all([
          axios.get(`${API_URL}/leave/my-requests`, authConfig).catch(() => ({ data: [] })),
          axios.get(`${API_URL}/shifts/my-schedule?weekStart=${weekStart}`, authConfig).catch(() => ({ data: [] }))
        ]);

        const pendingLeave = (leaveRes.data || []).filter((item) => item.status === 'pending').length;
        const upcomingSchedules = (scheduleRes.data || []).length;

        setNotificationItems([
          { label: `${pendingLeave} of your leave requests are pending`, path: '/leave' },
          { label: `${upcomingSchedules} schedule entries available`, path: '/shifts' }
        ].filter((item) => !item.label.startsWith('0 ')));
      } catch (error) {
        setNotificationItems([]);
      }
    };

    loadNotifications();
  }, [managementUser, user.role]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="fixed" sx={{ zIndex: theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton color="inherit" edge="start" onClick={() => setOpen((current) => !current)} sx={{ mr: 2 }}>
            <MenuIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" noWrap>
              Operations Hub
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.85 }}>
              {user.role === 'director' ? 'Director workspace' : user.role === 'department_head' ? 'Department leadership workspace' : managementUser ? 'Management workspace' : 'Employee self-service'}
            </Typography>
          </Box>

          <IconButton color="inherit" onClick={(event) => setNotificationsEl(event.currentTarget)}>
            <Badge badgeContent={notificationItems.length} color="error">
              <Notifications />
            </Badge>
          </IconButton>
          <Menu anchorEl={notificationsEl} open={Boolean(notificationsEl)} onClose={() => setNotificationsEl(null)}>
            {notificationItems.length === 0 ? (
              <MenuItem disabled>No new notifications</MenuItem>
            ) : (
              notificationItems.map((item) => (
                <MenuItem
                  key={item.label}
                  onClick={() => {
                    setNotificationsEl(null);
                    navigate(item.path);
                  }}
                >
                  {item.label}
                </MenuItem>
              ))
            )}
          </Menu>

          <IconButton color="inherit" onClick={(event) => setAnchorEl(event.currentTarget)} sx={{ ml: 1 }}>
            <Avatar sx={{ bgcolor: theme.palette.secondary.main }}>
              {user.firstName?.charAt(0) || 'U'}
            </Avatar>
          </IconButton>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
            <MenuItem disabled>
              <ListItemIcon>
                <Person fontSize="small" />
              </ListItemIcon>
              {user.firstName || 'User'} {user.lastName || ''}
            </MenuItem>
            <MenuItem
              onClick={() => {
                setAnchorEl(null);
                navigate('/profile');
              }}
            >
              <ListItemIcon>
                <Person fontSize="small" />
              </ListItemIcon>
              My Profile
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <Logout fontSize="small" />
              </ListItemIcon>
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        open={open}
        onClose={() => setOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          width: isMobile ? drawerWidth : open ? drawerWidth : theme.spacing(8),
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: isMobile ? drawerWidth : open ? drawerWidth : theme.spacing(8),
            transition: theme.transitions.create('width'),
            overflowX: 'hidden',
            mt: isMobile ? 0 : 8,
            borderRight: '1px solid rgba(123, 31, 162, 0.08)',
            bgcolor: 'background.paper'
          }
        }}
      >
        <List sx={{ pt: 1 }}>
          {menuItems.map((item) => {
            const selected = location.pathname === item.path;
            return (
              <ListItemButton
                key={item.path}
                selected={selected}
                onClick={() => {
                  navigate(item.path);
                  if (isMobile) {
                    setOpen(false);
                  }
                }}
                sx={{
                  minHeight: 48,
                  justifyContent: isMobile || open ? 'initial' : 'center',
                  px: 2.5,
                  mx: 1,
                  my: 0.5,
                  borderRadius: 2
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: isMobile || open ? 2 : 'auto',
                    justifyContent: 'center'
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.text} sx={{ opacity: isMobile || open ? 1 : 0 }} />
              </ListItemButton>
            );
          })}
        </List>
        <Divider sx={{ mt: 'auto' }} />
        <Box sx={{ p: isMobile || open ? 2 : 1.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            {user.role === 'director' ? 'Director access enabled' : managementUser ? 'Manager access enabled' : 'Employee access enabled'}
          </Typography>
        </Box>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, sm: 3 }, mt: 8, width: '100%', minWidth: 0 }}>
        <Outlet />
      </Box>
    </Box>
  );
}
