const express = require('express');
const router = express.Router();
const {
  createTraining,
  getAllTrainings,
  getTrainingById,
  updateTraining,
  createTrainingSession,
  getAllTrainingSessions,
  updateTrainingSession,
  enrollInTraining,
  updateEnrollment,
  getMyTrainings,
  getTrainingStats
} = require('../controllers/trainingController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// Employee routes
router.get('/my-trainings', getMyTrainings);

// Stats route
router.get('/stats', authorize('hr', 'director'), getTrainingStats);

// Session routes
router.get('/sessions', authorize('hr', 'department_head', 'production_manager', 'director'), getAllTrainingSessions);
router.put('/sessions/:id', authorize('hr', 'department_head', 'director'), updateTrainingSession);
router.post('/sessions/:sessionId/enroll', authorize('hr', 'department_head', 'director'), enrollInTraining);

// Enrollment routes
router.put('/enrollments/:id', authorize('hr', 'department_head', 'shift_supervisor', 'director'), updateEnrollment);

// Training routes
router.route('/')
  .get(authorize('hr', 'department_head', 'production_manager', 'director'), getAllTrainings)
  .post(authorize('hr', 'department_head', 'director'), createTraining);

router.route('/:id')
  .get(authorize('hr', 'department_head', 'production_manager', 'director'), getTrainingById)
  .put(authorize('hr', 'department_head', 'director'), updateTraining);

router.post('/:trainingId/sessions', authorize('hr', 'department_head', 'director'), createTrainingSession);

module.exports = router;
