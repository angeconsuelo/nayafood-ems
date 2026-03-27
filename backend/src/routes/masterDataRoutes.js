const express = require('express');
const router = express.Router();
const { getMasterData } = require('../controllers/masterDataController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getMasterData);

module.exports = router;
