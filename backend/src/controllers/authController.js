const { User, Employee, Department, Position, ProductionLine } = require('../models');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs').promises;
const path = require('path');

const dataDir = path.join(__dirname, '../../data');
const profileMetaFile = path.join(dataDir, 'profile-meta.json');
let inMemoryProfileMeta = {};

const ensureProfileMetaStore = async () => {
  try {
    await fs.mkdir(dataDir, { recursive: true });
    try {
      await fs.access(profileMetaFile);
    } catch (error) {
      await fs.writeFile(profileMetaFile, '{}', 'utf8');
    }
    return true;
  } catch (error) {
    return false;
  }
};

const readProfileMeta = async () => {
  const hasFileStore = await ensureProfileMetaStore();
  if (!hasFileStore) {
    return inMemoryProfileMeta;
  }

  try {
    const raw = await fs.readFile(profileMetaFile, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    return inMemoryProfileMeta;
  }
};

const writeProfileMeta = async (meta) => {
  inMemoryProfileMeta = meta;
  const hasFileStore = await ensureProfileMetaStore();
  if (!hasFileStore) {
    return;
  }

  try {
    await fs.writeFile(profileMetaFile, JSON.stringify(meta, null, 2), 'utf8');
  } catch (error) {
    // Keep runtime profile metadata available even when filesystem writes fail.
  }
};

// Generate JWT Token
const generateToken = (id, role) => {
  return jwt.sign(
    { id, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Private (Director only)
const registerUser = async (req, res) => {
  try {
    const { email, password, role, firstName, lastName } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ where: { email } });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create user
    const user = await User.create({
      email,
      password,
      role,
      firstName,
      lastName
    });

    res.status(201).json({
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      token: generateToken(user.id, user.role)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    // Validate password
    const isValidPassword = await user.validatePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Update last login
    await user.update({ lastLogin: new Date() });

    const userWithEmployee = await User.findByPk(user.id, {
      attributes: ['id', 'email', 'role', 'firstName', 'lastName'],
      include: [
        {
          model: Employee,
          as: 'employee',
          include: [
            { model: Department, as: 'department' },
            { model: Position, as: 'position' },
            { model: ProductionLine, as: 'productionLine' }
          ]
        }
      ]
    });

    res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      employee: userWithEmployee?.employee || null,
      token: generateToken(user.id, user.role)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/profile
// @access  Private
const getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] },
      include: [
        {
          model: Employee,
          as: 'employee',
          include: [
            { model: Department, as: 'department' },
            { model: Position, as: 'position' },
            { model: ProductionLine, as: 'productionLine' }
          ]
        }
      ]
    });
    const profileMeta = await readProfileMeta();
    const userProfile = user.toJSON();
    userProfile.profileMeta = profileMeta[String(req.user.id)] || {};
    res.json(userProfile);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const {
      firstName,
      lastName,
      currentPassword,
      newPassword,
      password,
      employeeFirstName,
      employeeLastName,
      birthDate,
      phoneNumber,
      emergencyContactName,
      emergencyContactPhone
    } = req.body;
    
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (newPassword || password) {
      const nextPassword = newPassword || password;
      if (!currentPassword) {
        return res.status(400).json({ message: 'Current password is required to set a new password' });
      }

      const isValidPassword = await user.validatePassword(currentPassword);
      if (!isValidPassword) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }

      user.password = nextPassword;
    }

    await user.save();

    const profileMeta = await readProfileMeta();
    profileMeta[String(req.user.id)] = {
      ...(profileMeta[String(req.user.id)] || {}),
      phoneNumber: phoneNumber !== undefined ? phoneNumber : profileMeta[String(req.user.id)]?.phoneNumber || ''
    };
    await writeProfileMeta(profileMeta);

    const employee = await Employee.findOne({ where: { userId: req.user.id } });
    if (employee) {
      await employee.update({
        firstName: employeeFirstName || firstName || employee.firstName,
        lastName: employeeLastName || lastName || employee.lastName,
        birthDate: birthDate !== undefined ? birthDate : employee.birthDate,
        emergencyContactName:
          emergencyContactName !== undefined ? emergencyContactName : employee.emergencyContactName,
        emergencyContactPhone:
          emergencyContactPhone !== undefined ? emergencyContactPhone : employee.emergencyContactPhone
      });
    }

    const updatedUser = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] },
      include: [
        {
          model: Employee,
          as: 'employee',
          include: [
            { model: Department, as: 'department' },
            { model: Position, as: 'position' },
            { model: ProductionLine, as: 'productionLine' }
          ]
        }
      ]
    });
    const updatedProfile = updatedUser.toJSON();
    updatedProfile.profileMeta = profileMeta[String(req.user.id)] || {};

    res.json(updatedProfile);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getProfile,
  updateProfile
};
