const express = require('express');
const router = express.Router();
const { createComplaint, getMyComplaints, getAllComplaints } = require('../controllers/complaintController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/all', authorize('director', 'hr', 'production_manager', 'department_head', 'shift_supervisor'), getAllComplaints);
router.get('/my', getMyComplaints);
router.post('/', createComplaint);

module.exports = router;
