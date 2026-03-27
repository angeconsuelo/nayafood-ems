import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
  Avatar,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  FormControl,
  InputLabel,
  Select,
  ListItemIcon,
  Tab,
  Tabs,
  Paper,
  Alert,
  Snackbar
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { DataGrid } from '@mui/x-data-grid';
import {
  Search,
  Add,
  MoreVert,
  Edit,
  Delete,
  Person,
  FilterList,
  Refresh,
  Visibility,
  CheckCircle,
  Cancel,
  PictureAsPdf,
  Email
} from '@mui/icons-material';
import axios from 'axios';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import { API_URL } from '../config/api';
import { getAuthConfig, getStoredUser } from '../utils/auth';

export default function Employees() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const user = getStoredUser();
  const canManageEmployees = ['director', 'hr'].includes(user?.role);
  const isDepartmentHead = user?.role === 'department_head';
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState('add'); // 'add', 'edit', 'view'
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openConvertDialog, setOpenConvertDialog] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // Filters
  const [filters, setFilters] = useState({
    status: '',
    department: '',
    line: ''
  });
  
  // Master data
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [productionLines, setProductionLines] = useState([]);

  // Form state
  const [formData, setFormData] = useState({
    employeeCode: '',
    firstName: '',
    lastName: '',
    birthDate: '',
    hireDate: format(new Date(), 'yyyy-MM-dd'),
    employmentStatus: 'temporary',
    departmentId: '',
    positionId: '',
    productionLineId: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    email: '',
    phone: ''
  });

  useEffect(() => {
    fetchEmployees();
    fetchMasterData();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/employees?limit=500`, getAuthConfig());
      setEmployees(response.data.data || []);
    } catch (error) {
      showSnackbar('Failed to fetch employees', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchMasterData = async () => {
    try {
      const response = await axios.get(`${API_URL}/master-data`, getAuthConfig());
      setDepartments(response.data.departments || []);
      setPositions(response.data.positions || []);
      setProductionLines(response.data.productionLines || []);
    } catch (error) {
      console.error('Error fetching master data:', error);
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleMenuClick = (event, employee) => {
    setAnchorEl(event.currentTarget);
    setSelectedEmployee(employee);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEdit = () => {
    setFormData(selectedEmployee);
    setDialogMode('edit');
    setOpenDialog(true);
    handleMenuClose();
  };

  const handleView = () => {
    setFormData(selectedEmployee);
    setDialogMode('view');
    setOpenDialog(true);
    handleMenuClose();
  };

  const handleDeleteClick = () => {
    setOpenDeleteDialog(true);
    handleMenuClose();
  };

  const handleConvertClick = () => {
    setOpenConvertDialog(true);
    handleMenuClose();
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${API_URL}/employees/${selectedEmployee.id}`, getAuthConfig());
      showSnackbar('Employee deactivated successfully');
      fetchEmployees();
    } catch (error) {
      showSnackbar('Failed to deactivate employee', 'error');
    } finally {
      setOpenDeleteDialog(false);
    }
  };

  const handleConvert = async () => {
    try {
      await axios.put(`${API_URL}/employees/${selectedEmployee.id}/convert`, {}, getAuthConfig());
      showSnackbar('Employee converted to permanent successfully');
      fetchEmployees();
    } catch (error) {
      showSnackbar('Failed to convert employee', 'error');
    } finally {
      setOpenConvertDialog(false);
    }
  };

  const handleAddNew = () => {
    setFormData({
      employeeCode: '',
      firstName: '',
      lastName: '',
      birthDate: '',
      hireDate: format(new Date(), 'yyyy-MM-dd'),
      employmentStatus: 'temporary',
      departmentId: '',
      positionId: '',
      productionLineId: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      email: '',
      phone: ''
    });
    setDialogMode('add');
    setOpenDialog(true);
  };

  const handleSubmit = async () => {
    try {
      if (dialogMode === 'add') {
        await axios.post(`${API_URL}/employees`, formData, getAuthConfig());
        showSnackbar('Employee added successfully');
      } else if (dialogMode === 'edit') {
        await axios.put(`${API_URL}/employees/${selectedEmployee.id}`, formData, getAuthConfig());
        showSnackbar('Employee updated successfully');
      }
      setOpenDialog(false);
      fetchEmployees();
    } catch (error) {
      showSnackbar(error.response?.data?.message || 'Operation failed', 'error');
    }
  };

  const handleExportPDF = () => {
    showSnackbar('Exporting to PDF...', 'info');
    // Implement PDF export
  };

  const columns = [
    { 
      field: 'avatar', 
      headerName: '', 
      width: 50,
      renderCell: () => <Avatar sx={{ width: 32, height: 32 }}><Person /></Avatar>
    },
    { field: 'employeeCode', headerName: 'ID', width: 100 },
    {
      field: 'name',
      headerName: 'Name',
      width: 180,
      valueGetter: (params) => `${params.row.firstName || ''} ${params.row.lastName || ''}`,
    },
    {
      field: 'employmentStatus',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value === 'permanent' ? 'Permanent' : 'Temporary'}
          color={params.value === 'permanent' ? 'success' : 'warning'}
          size="small"
        />
      ),
    },
    {
      field: 'position',
      headerName: 'Position',
      width: 150,
      valueGetter: (params) => params.row.position?.name || 'N/A',
    },
    {
      field: 'department',
      headerName: 'Department',
      width: 150,
      valueGetter: (params) => params.row.department?.name || 'N/A',
    },
    {
      field: 'productionLine',
      headerName: 'Line',
      width: 130,
      valueGetter: (params) => params.row.productionLine?.name || 'N/A',
    },
    {
      field: 'hireDate',
      headerName: 'Hire Date',
      width: 100,
      valueGetter: (params) => params.row.hireDate ? format(new Date(params.row.hireDate), 'dd/MM/yy') : 'N/A',
    },
    {
      field: 'phone',
      headerName: 'Phone',
      width: 120,
    },
    ...(canManageEmployees ? [{
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      renderCell: (params) => (
        <IconButton onClick={(e) => handleMenuClick(e, params.row)}>
          <MoreVert />
        </IconButton>
      ),
    }] : []),
  ];

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = search === '' || 
      emp.firstName?.toLowerCase().includes(search.toLowerCase()) ||
      emp.lastName?.toLowerCase().includes(search.toLowerCase()) ||
      emp.employeeCode?.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = filters.status === '' || emp.employmentStatus === filters.status;
    const matchesDept = filters.department === '' || emp.departmentId === parseInt(filters.department);
    const matchesLine = filters.line === '' || emp.productionLineId === parseInt(filters.line);
    
    return matchesSearch && matchesStatus && matchesDept && matchesLine;
  });

  const stats = {
    total: employees.length,
    permanent: employees.filter(e => e.employmentStatus === 'permanent').length,
    temporary: employees.filter(e => e.employmentStatus === 'temporary').length,
    active: employees.filter(e => e.isActive !== false).length
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" color="primary.main">
          {canManageEmployees ? 'Employees' : isDepartmentHead ? 'My Department' : 'Employees Overview'}
        </Typography>
        {canManageEmployees && (
          <Box>
            <Button
              variant="outlined"
              startIcon={<PictureAsPdf />}
              onClick={handleExportPDF}
              sx={{ mr: 2 }}
            >
              Export
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleAddNew}
            >
              Add Employee
            </Button>
          </Box>
        )}
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Total Employees</Typography>
              <Typography variant="h4">{stats.total}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Permanent</Typography>
              <Typography variant="h4" color="success.main">{stats.permanent}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Temporary</Typography>
              <Typography variant="h4" color="warning.main">{stats.temporary}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Active</Typography>
              <Typography variant="h4" color="info.main">{stats.active}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={(e, v) => setTabValue(v)}
          variant={isMobile ? 'scrollable' : 'standard'}
          scrollButtons="auto"
        >
          <Tab label="All Employees" />
          <Tab label="Permanent" />
          <Tab label="Temporary" />
          <Tab label="By Line" />
        </Tabs>
      </Paper>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Search by name or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status}
                  label="Status"
                  onChange={(e) => setFilters({...filters, status: e.target.value})}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="permanent">Permanent</MenuItem>
                  <MenuItem value="temporary">Temporary</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Department</InputLabel>
                <Select
                  value={filters.department}
                  label="Department"
                  onChange={(e) => setFilters({...filters, department: e.target.value})}
                >
                  <MenuItem value="">All</MenuItem>
                  {departments.map(dept => (
                    <MenuItem key={dept.id} value={dept.id}>{dept.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Line</InputLabel>
                <Select
                  value={filters.line}
                  label="Line"
                  onChange={(e) => setFilters({...filters, line: e.target.value})}
                >
                  <MenuItem value="">All</MenuItem>
                  {productionLines.map(line => (
                    <MenuItem key={line.id} value={line.id}>{line.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Refresh />}
                onClick={fetchEmployees}
                size={isMobile ? 'large' : 'medium'}
              >
                Refresh
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Employee Table */}
      <Card>
        <CardContent>
          <Box sx={{ width: '100%', overflowX: 'auto' }}>
            <DataGrid
              rows={filteredEmployees}
              columns={columns}
              pageSize={10}
              rowsPerPageOptions={[10, 25, 50]}
              checkboxSelection={false}
              disableSelectionOnClick
              autoHeight
              loading={loading}
              getRowId={(row) => row.id}
              sx={{
                minWidth: isMobile ? 980 : 'auto',
                '& .MuiDataGrid-columnHeaders': {
                  backgroundColor: '#f5f5f5',
                },
                '& .MuiDataGrid-cell, & .MuiDataGrid-columnHeaderTitle': {
                  whiteSpace: 'nowrap'
                }
              }}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleView}>
          <ListItemIcon><Visibility fontSize="small" /></ListItemIcon>
          View Details
        </MenuItem>
        {canManageEmployees && (
          <MenuItem onClick={handleEdit}>
            <ListItemIcon><Edit fontSize="small" /></ListItemIcon>
            Edit
          </MenuItem>
        )}
        {canManageEmployees && selectedEmployee?.employmentStatus === 'temporary' && (
          <MenuItem onClick={handleConvertClick}>
            <ListItemIcon><CheckCircle fontSize="small" /></ListItemIcon>
            Convert to Permanent
          </MenuItem>
        )}
        {canManageEmployees && (
          <MenuItem onClick={handleDeleteClick}>
            <ListItemIcon><Delete fontSize="small" /></ListItemIcon>
            Deactivate
          </MenuItem>
        )}
      </Menu>

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth fullScreen={isMobile}>
        <DialogTitle>
          {dialogMode === 'add' ? 'Add New Employee' : 
           dialogMode === 'edit' ? 'Edit Employee' : 'Employee Details'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Employee Code"
                value={formData.employeeCode}
                onChange={(e) => setFormData({...formData, employeeCode: e.target.value})}
                disabled={dialogMode === 'view'}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.employmentStatus}
                  label="Status"
                  onChange={(e) => setFormData({...formData, employmentStatus: e.target.value})}
                  disabled={dialogMode === 'view'}
                >
                  <MenuItem value="temporary">Temporary</MenuItem>
                  <MenuItem value="permanent">Permanent</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="First Name"
                value={formData.firstName}
                onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                disabled={dialogMode === 'view'}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Last Name"
                value={formData.lastName}
                onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                disabled={dialogMode === 'view'}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                disabled={dialogMode === 'view'}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Phone"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                disabled={dialogMode === 'view'}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Birth Date"
                type="date"
                value={formData.birthDate}
                onChange={(e) => setFormData({...formData, birthDate: e.target.value})}
                disabled={dialogMode === 'view'}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Hire Date"
                type="date"
                value={formData.hireDate}
                onChange={(e) => setFormData({...formData, hireDate: e.target.value})}
                disabled={dialogMode === 'view'}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Department</InputLabel>
                <Select
                  value={formData.departmentId}
                  label="Department"
                  onChange={(e) => setFormData({...formData, departmentId: e.target.value})}
                  disabled={dialogMode === 'view'}
                >
                  {departments.map(dept => (
                    <MenuItem key={dept.id} value={dept.id}>{dept.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Position</InputLabel>
                <Select
                  value={formData.positionId}
                  label="Position"
                  onChange={(e) => setFormData({...formData, positionId: e.target.value})}
                  disabled={dialogMode === 'view'}
                >
                  {positions.filter(p => !formData.departmentId || p.departmentId === formData.departmentId)
                    .map(pos => (
                      <MenuItem key={pos.id} value={pos.id}>{pos.name}</MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Production Line</InputLabel>
                <Select
                  value={formData.productionLineId}
                  label="Production Line"
                  onChange={(e) => setFormData({...formData, productionLineId: e.target.value})}
                  disabled={dialogMode === 'view'}
                >
                  {productionLines.map(line => (
                    <MenuItem key={line.id} value={line.id}>{line.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Emergency Contact Name"
                value={formData.emergencyContactName}
                onChange={(e) => setFormData({...formData, emergencyContactName: e.target.value})}
                disabled={dialogMode === 'view'}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Emergency Contact Phone"
                value={formData.emergencyContactPhone}
                onChange={(e) => setFormData({...formData, emergencyContactPhone: e.target.value})}
                disabled={dialogMode === 'view'}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)} fullWidth={isMobile}>Cancel</Button>
          {dialogMode !== 'view' && (
            <Button onClick={handleSubmit} variant="contained" color="primary" fullWidth={isMobile}>
              {dialogMode === 'add' ? 'Add Employee' : 'Save Changes'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)} fullScreen={isMobile}>
        <DialogTitle>Deactivate Employee</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to deactivate {selectedEmployee?.firstName} {selectedEmployee?.lastName}?
            This action can be reversed later.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)} fullWidth={isMobile}>Cancel</Button>
          <Button onClick={handleDelete} variant="contained" color="error" fullWidth={isMobile}>
            Deactivate
          </Button>
        </DialogActions>
      </Dialog>

      {/* Convert Confirmation Dialog */}
      <Dialog open={openConvertDialog} onClose={() => setOpenConvertDialog(false)} fullScreen={isMobile}>
        <DialogTitle>Convert to Permanent</DialogTitle>
        <DialogContent>
          <Typography>
            Convert {selectedEmployee?.firstName} {selectedEmployee?.lastName} to permanent employee?
            This will update their status and benefits.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenConvertDialog(false)} fullWidth={isMobile}>Cancel</Button>
          <Button onClick={handleConvert} variant="contained" color="success" fullWidth={isMobile}>
            Convert
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({...snackbar, open: false})}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
