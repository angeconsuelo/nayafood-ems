const express = require('express');
const router = express.Router();
const {
  initShifts,
  generateShiftRotation,
  generateDailySchedules,
  overrideSchedule,
  getMySchedule,
  getAllSchedules,
  markDryBiscuitWeek
} = require('../controllers/shiftController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// Employee schedule (accessible by all)
router.get('/my-schedule', getMySchedule);

// Management routes
router.get('/schedules', authorize('production_manager', 'hr', 'director'), getAllSchedules);
router.put('/schedules/:id', authorize('director'), overrideSchedule);
router.post('/generate-rotation', authorize('production_manager', 'director'), generateShiftRotation);
router.post('/generate-schedules', authorize('production_manager', 'director'), generateDailySchedules);
router.post('/dry-week', authorize('production_manager', 'director'), markDryBiscuitWeek);
router.post('/init', authorize('director'), initShifts);

module.exports = router;
