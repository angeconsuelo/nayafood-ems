const express = require('express');
const router = express.Router();
const {
  createRecruitment,
  getAllRecruitments,
  getRecruitmentById,
  updateRecruitment,
  changeRecruitmentStatus,
  applyForJob,
  getAllApplicants,
  getApplicantById,
  updateApplicantStatus,
  convertApplicantToEmployee,
  getRecruitmentStats
} = require('../controllers/recruitmentController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// Statistics route
router.get('/stats', authorize('hr', 'director'), getRecruitmentStats);

// Applicant routes
router.get('/applicants', authorize('hr', 'director'), getAllApplicants);
router.get('/applicants/:id', authorize('hr', 'director'), getApplicantById);
router.put('/applicants/:id/status', authorize('hr', 'director'), updateApplicantStatus);
router.post('/applicants/:id/convert', authorize('hr', 'director'), convertApplicantToEmployee);

// Recruitment routes
router.route('/')
  .get(authorize('hr', 'director'), getAllRecruitments)
  .post(authorize('hr', 'director'), createRecruitment);

router.route('/:id')
  .get(authorize('hr', 'director'), getRecruitmentById)
  .put(authorize('hr', 'director'), updateRecruitment);

router.put('/:id/status', authorize('hr', 'director'), changeRecruitmentStatus);
router.post('/:id/apply', applyForJob);

module.exports = router;
