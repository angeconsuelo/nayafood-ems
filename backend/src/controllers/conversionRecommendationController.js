const { ConversionRecommendation, Employee, Department, User } = require('../models');

const getReviewerDepartment = async (userId) => {
  const reviewerEmployee = await Employee.findOne({
    where: { userId },
    attributes: ['departmentId']
  });

  return reviewerEmployee?.departmentId || null;
};

const getRecommendations = async (req, res) => {
  try {
    const where = {};

    if (req.user.role === 'department_head') {
      const departmentId = await getReviewerDepartment(req.user.id);
      if (!departmentId) {
        return res.json([]);
      }
      where.departmentId = departmentId;
    }

    if (req.query.employeeId) {
      where.employeeId = req.query.employeeId;
    }

    if (req.query.status) {
      where.status = req.query.status;
    }

    const recommendations = await ConversionRecommendation.findAll({
      where,
      include: [
        { model: Employee, as: 'employee' },
        { model: Department, as: 'department' },
        { model: User, as: 'reviewer', attributes: ['firstName', 'lastName', 'role'] }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createRecommendation = async (req, res) => {
  try {
    const { employeeId, performanceRating, reviewNotes, recommendation } = req.body;
    const employee = await Employee.findByPk(employeeId);

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const reviewerDepartmentId = await getReviewerDepartment(req.user.id);
    if (req.user.role === 'department_head' && employee.departmentId !== reviewerDepartmentId) {
      return res.status(403).json({ message: 'You can only review employees in your own department' });
    }

    const created = await ConversionRecommendation.create({
      employeeId,
      departmentId: employee.departmentId,
      reviewerId: req.user.id,
      performanceRating,
      reviewNotes,
      recommendation,
      status: 'pending'
    });

    const result = await ConversionRecommendation.findByPk(created.id, {
      include: [
        { model: Employee, as: 'employee' },
        { model: Department, as: 'department' },
        { model: User, as: 'reviewer', attributes: ['firstName', 'lastName', 'role'] }
      ]
    });

    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateRecommendationStatus = async (req, res) => {
  try {
    const recommendation = await ConversionRecommendation.findByPk(req.params.id);

    if (!recommendation) {
      return res.status(404).json({ message: 'Recommendation not found' });
    }

    await recommendation.update({
      status: req.body.status || recommendation.status
    });

    res.json(recommendation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getRecommendations,
  createRecommendation,
  updateRecommendationStatus
};
