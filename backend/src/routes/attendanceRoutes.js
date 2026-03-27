const express = require('express');
const router = express.Router();
const {
  checkIn,
  checkOut,
  markAbsent,
  getTodayAttendance,
  getAttendanceReport,
  getMyAttendance,
  calculateNightBonus
} = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// Employee self-service
router.get('/my-history', getMyAttendance);

// Supervisor/Manager routes
router.post('/checkin', authorize('shift_supervisor', 'production_manager', 'hr', 'director'), checkIn);
router.post('/checkout', authorize('shift_supervisor', 'production_manager', 'hr', 'director'), checkOut);
router.get('/today', authorize('shift_supervisor', 'production_manager', 'hr', 'director'), getTodayAttendance);

// HR/Manager routes
router.post('/mark-absent', authorize('hr', 'director'), markAbsent);
router.get('/report', authorize('hr', 'director', 'department_head'), getAttendanceReport);
router.get('/night-bonus/:month/:year', authorize('hr', 'director'), calculateNightBonus);

module.exports = router;
