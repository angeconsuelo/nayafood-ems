const { User, Employee } = require('../models');

const sanitizeUser = (user) => ({
  id: user.id,
  email: user.email,
  role: user.role,
  firstName: user.firstName,
  lastName: user.lastName,
  isActive: user.isActive,
  lastLogin: user.lastLogin,
  employee: user.employee
});

const listUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      include: [{ model: Employee, as: 'employee' }],
      order: [['created_at', 'DESC']]
    });

    res.json(users.map(sanitizeUser));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createUser = async (req, res) => {
  try {
    const { email, password, role, firstName, lastName } = req.body;

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
      email,
      password,
      role,
      firstName,
      lastName
    });

    const created = await User.findByPk(user.id, {
      include: [{ model: Employee, as: 'employee' }]
    });

    res.status(201).json(sanitizeUser(created));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { role, firstName, lastName, email, isActive } = req.body;
    if (email) user.email = email;
    if (role) user.role = role;
    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    const updated = await User.findByPk(user.id, {
      include: [{ model: Employee, as: 'employee' }]
    });

    res.json(sanitizeUser(updated));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (Number(req.params.id) === Number(req.user.id)) {
      return res.status(400).json({ message: 'Director cannot deactivate the current logged-in account' });
    }

    await user.update({ isActive: false });
    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const resetUserPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword) {
      return res.status(400).json({ message: 'New password is required' });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  resetUserPassword
};
