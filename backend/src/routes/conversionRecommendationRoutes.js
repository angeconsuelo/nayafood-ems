const express = require('express');
const router = express.Router();
const {
  getRecommendations,
  createRecommendation,
  updateRecommendationStatus
} = require('../controllers/conversionRecommendationController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', authorize('department_head', 'hr', 'director'), getRecommendations);
router.post('/', authorize('department_head', 'hr', 'director'), createRecommendation);
router.put('/:id/status', authorize('hr', 'director'), updateRecommendationStatus);

module.exports = router;
