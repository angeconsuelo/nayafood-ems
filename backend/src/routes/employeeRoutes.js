const express = require('express');
const router = express.Router();
const {
  createEmployee,
  getAllEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
  convertToPermanent,
  assignEmployeeLine,
  getEmployeesByLine,
  getEmployeeStats
} = require('../controllers/employeeController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// Statistics route (specific before /:id routes)
router.get('/stats/summary', authorize('director', 'hr'), getEmployeeStats);

// Get employees by line
router.get('/line/:lineId', authorize('production_manager', 'hr', 'director'), getEmployeesByLine);

// Employee CRUD routes
router.route('/')
  .get(authorize('hr', 'director', 'production_manager', 'department_head'), getAllEmployees)
  .post(authorize('hr', 'director'), createEmployee);

router.route('/:id')
  .get(getEmployeeById)  // Role-based check inside controller
  .put(authorize('hr', 'director'), updateEmployee)
  .delete(authorize('hr', 'director'), deleteEmployee);

// Convert temporary to permanent
router.put('/:id/convert', authorize('hr', 'director'), convertToPermanent);
router.put('/:id/assign-line', authorize('production_manager', 'director'), assignEmployeeLine);

module.exports = router;
