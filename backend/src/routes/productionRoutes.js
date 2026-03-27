const express = require('express');
const router = express.Router();
const { getProductionOverview } = require('../controllers/productionController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/overview', authorize('director', 'hr', 'production_manager'), getProductionOverview);

module.exports = router;
