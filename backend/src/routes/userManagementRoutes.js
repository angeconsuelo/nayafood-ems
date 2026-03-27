const express = require('express');
const router = express.Router();
const {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  resetUserPassword
} = require('../controllers/userManagementController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
router.use(authorize('director'));

router.route('/')
  .get(listUsers)
  .post(createUser);

router.put('/:id', updateUser);
router.delete('/:id', deleteUser);
router.put('/:id/reset-password', resetUserPassword);

module.exports = router;
