const express = require('express');
const router = express.Router();
const {
  initLeaveTypes,
  createLeaveRequest,
  getMyLeaveRequests,
  getAllLeaveRequests,
  approveLeaveRequest,
  rejectLeaveRequest,
  getLeaveBalance
} = require('../controllers/leaveController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// Employee routes
router.post('/request', createLeaveRequest);
router.get('/my-requests', getMyLeaveRequests);
router.get('/my-balance', getLeaveBalance);

// Management routes
router.get('/all', authorize('hr', 'director'), getAllLeaveRequests);
router.get('/balance/:employeeId', authorize('hr', 'director'), getLeaveBalance);
router.put('/:id/approve', authorize('hr', 'director'), approveLeaveRequest);
router.put('/:id/reject', authorize('hr', 'director'), rejectLeaveRequest);
router.post('/init-types', authorize('hr', 'director'), initLeaveTypes);

module.exports = router;
