const express = require('express');
const router = express.Router();
const { getSystemSettings, updateSystemSettings } = require('../controllers/systemSettingsController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
router.use(authorize('director'));

router.get('/', getSystemSettings);
router.put('/', updateSystemSettings);

module.exports = router;
