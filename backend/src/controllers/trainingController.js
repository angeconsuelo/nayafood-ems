const { Training, TrainingSession, TrainingEnrollment, Employee, Applicant, Department, User, sequelize } = require('../models');
const { Op } = require('sequelize');
const moment = require('moment');

const getRequesterDepartmentId = async (userId) => {
  const employee = await Employee.findOne({
    where: { userId },
    attributes: ['departmentId']
  });

  return employee?.departmentId || null;
};

const enforceDepartmentHeadScope = async (req, res, departmentId) => {
  if (req.user.role !== 'department_head') {
    return true;
  }

  const requesterDepartmentId = await getRequesterDepartmentId(req.user.id);
  if (!requesterDepartmentId) {
    res.status(403).json({ message: 'Department assignment is required for this action' });
    return false;
  }

  if (Number(requesterDepartmentId) !== Number(departmentId)) {
    res.status(403).json({ message: 'You can only manage training for your own department' });
    return false;
  }

  return true;
};

// @desc    Create a training program
// @route   POST /api/training
// @access  Private (HR, Department Head, Director)
const createTraining = async (req, res) => {
  try {
    const {
      name,
      description,
      departmentId,
      durationDays,
      isMandatory
    } = req.body;

    let resolvedDepartmentId = departmentId;
    if (req.user.role === 'department_head') {
      resolvedDepartmentId = await getRequesterDepartmentId(req.user.id);
      if (!resolvedDepartmentId) {
        return res.status(403).json({ message: 'Department assignment is required for this action' });
      }
    }

    const training = await Training.create({
      name,
      description,
      departmentId: resolvedDepartmentId,
      durationDays,
      isMandatory: isMandatory || false,
      createdBy: req.user.id,
      isActive: true
    });

    const result = await Training.findByPk(training.id, {
      include: [
        { model: Department, as: 'department' },
        { model: User, as: 'creator', attributes: ['firstName', 'lastName', 'email'] }
      ]
    });

    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all trainings
// @route   GET /api/training
// @access  Private (HR, Department Head, Manager, Director)
const getAllTrainings = async (req, res) => {
  try {
    const { departmentId, isMandatory } = req.query;

    let where = { isActive: true };
    if (req.user.role === 'department_head') {
      const requesterDepartmentId = await getRequesterDepartmentId(req.user.id);
      if (!requesterDepartmentId) {
        return res.json([]);
      }
      where.departmentId = requesterDepartmentId;
    } else if (departmentId) {
      where.departmentId = departmentId;
    }
    if (isMandatory) where.isMandatory = isMandatory === 'true';

    const trainings = await Training.findAll({
      where,
      include: [
        { model: Department, as: 'department' },
        { 
          model: TrainingSession, 
          as: 'sessions',
          where: { status: 'planned' },
          required: false,
          limit: 1,
          order: [['start_date', 'ASC']]
        }
      ],
      order: [['name', 'ASC']]
    });

    res.json(trainings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get training by ID
// @route   GET /api/training/:id
// @access  Private (HR, Department Head, Manager, Director)
const getTrainingById = async (req, res) => {
  try {
    const training = await Training.findByPk(req.params.id, {
      include: [
        { model: Department, as: 'department' },
        { model: User, as: 'creator', attributes: ['firstName', 'lastName', 'email'] },
        { 
          model: TrainingSession, 
          as: 'sessions',
          include: [
            { model: Employee, as: 'trainer', attributes: ['firstName', 'lastName'] },
            { 
              model: TrainingEnrollment, 
              as: 'enrollments',
              include: [
                { model: Employee, as: 'employee' },
                { model: Applicant, as: 'applicant' }
              ]
            }
          ],
          order: [['start_date', 'DESC']]
        }
      ]
    });

    if (!training) {
      return res.status(404).json({ message: 'Training not found' });
    }

    const allowed = await enforceDepartmentHeadScope(req, res, training.departmentId);
    if (!allowed) {
      return;
    }

    res.json(training);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update training
// @route   PUT /api/training/:id
// @access  Private (HR, Department Head, Director)
const updateTraining = async (req, res) => {
  try {
    const training = await Training.findByPk(req.params.id);

    if (!training) {
      return res.status(404).json({ message: 'Training not found' });
    }

    const allowed = await enforceDepartmentHeadScope(req, res, training.departmentId);
    if (!allowed) {
      return;
    }

    const {
      name,
      description,
      departmentId,
      durationDays,
      isMandatory,
      isActive
    } = req.body;

    let resolvedDepartmentId = departmentId;
    if (req.user.role === 'department_head') {
      resolvedDepartmentId = training.departmentId;
    }

    await training.update({
      name,
      description,
      departmentId: resolvedDepartmentId,
      durationDays,
      isMandatory,
      isActive
    });

    const updated = await Training.findByPk(training.id, {
      include: [
        { model: Department, as: 'department' },
        { model: User, as: 'creator', attributes: ['firstName', 'lastName', 'email'] }
      ]
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create training session
// @route   POST /api/training/:trainingId/sessions
// @access  Private (HR, Department Head, Director)
const createTrainingSession = async (req, res) => {
  try {
    const { trainingId } = req.params;
    const {
      startDate,
      endDate,
      trainerEmployeeId,
      location,
      maxParticipants,
      notes
    } = req.body;

    const training = await Training.findByPk(trainingId);
    if (!training) {
      return res.status(404).json({ message: 'Training not found' });
    }

    const allowed = await enforceDepartmentHeadScope(req, res, training.departmentId);
    if (!allowed) {
      return;
    }

    const session = await TrainingSession.create({
      trainingId,
      startDate,
      endDate,
      trainerEmployeeId,
      location,
      maxParticipants,
      notes,
      status: 'planned'
    });

    const result = await TrainingSession.findByPk(session.id, {
      include: [
        { model: Training, as: 'training' },
        { model: Employee, as: 'trainer', attributes: ['firstName', 'lastName'] }
      ]
    });

    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get training sessions
// @route   GET /api/training/sessions
// @access  Private (HR, Department Head, Manager, Director)
const getAllTrainingSessions = async (req, res) => {
  try {
    const { status, trainingId, startDate, endDate } = req.query;

    let where = {};
    if (status) where.status = status;
    if (trainingId) where.trainingId = trainingId;
    if (startDate && endDate) {
      where.startDate = { [Op.gte]: startDate };
      where.endDate = { [Op.lte]: endDate };
    }

    const trainingInclude = { model: Training, as: 'training' };
    if (req.user.role === 'department_head') {
      const requesterDepartmentId = await getRequesterDepartmentId(req.user.id);
      if (!requesterDepartmentId) {
        return res.json([]);
      }
      trainingInclude.where = { departmentId: requesterDepartmentId };
      trainingInclude.required = true;
    }

    const sessions = await TrainingSession.findAll({
      where,
      include: [
        trainingInclude,
        { model: Employee, as: 'trainer', attributes: ['firstName', 'lastName'] },
        { 
          model: TrainingEnrollment, 
          as: 'enrollments',
          include: [
            { model: Employee, as: 'employee' },
            { model: Applicant, as: 'applicant' }
          ]
        }
      ],
      order: [['start_date', 'ASC']]
    });

    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update training session
// @route   PUT /api/training/sessions/:id
// @access  Private (HR, Department Head, Director)
const updateTrainingSession = async (req, res) => {
  try {
    const session = await TrainingSession.findByPk(req.params.id, {
      include: [{ model: Training, as: 'training' }]
    });

    if (!session) {
      return res.status(404).json({ message: 'Training session not found' });
    }

    const allowed = await enforceDepartmentHeadScope(req, res, session.training?.departmentId);
    if (!allowed) {
      return;
    }

    const {
      startDate,
      endDate,
      trainerEmployeeId,
      location,
      maxParticipants,
      status,
      notes
    } = req.body;

    await session.update({
      startDate,
      endDate,
      trainerEmployeeId,
      location,
      maxParticipants,
      status,
      notes
    });

    const updated = await TrainingSession.findByPk(session.id, {
      include: [
        { model: Training, as: 'training' },
        { model: Employee, as: 'trainer', attributes: ['firstName', 'lastName'] }
      ]
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Enroll employee in training session
// @route   POST /api/training/sessions/:sessionId/enroll
// @access  Private (HR, Department Head, Manager)
const enrollInTraining = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { employeeId, applicantId } = req.body;

    if (!employeeId && !applicantId) {
      return res.status(400).json({ message: 'Either employeeId or applicantId is required' });
    }

    const session = await TrainingSession.findByPk(sessionId, {
      include: [
        'enrollments',
        { model: Training, as: 'training' }
      ]
    });

    if (!session) {
      return res.status(404).json({ message: 'Training session not found' });
    }

    const allowed = await enforceDepartmentHeadScope(req, res, session.training?.departmentId);
    if (!allowed) {
      return;
    }

    if (req.user.role === 'department_head' && applicantId) {
      return res.status(403).json({ message: 'Department heads can only enroll employees from their department' });
    }

    // Check if session is full
    if (session.enrollments.length >= session.maxParticipants) {
      return res.status(400).json({ message: 'Training session is full' });
    }

    // Check if already enrolled
    let existingEnrollment;
    if (employeeId) {
      const employee = await Employee.findByPk(employeeId);
      if (!employee) {
        return res.status(404).json({ message: 'Employee not found' });
      }

      const employeeAllowed = await enforceDepartmentHeadScope(req, res, employee.departmentId);
      if (!employeeAllowed) {
        return;
      }

      existingEnrollment = await TrainingEnrollment.findOne({
        where: { sessionId, employeeId }
      });
    } else {
      existingEnrollment = await TrainingEnrollment.findOne({
        where: { sessionId, applicantId }
      });
    }

    if (existingEnrollment) {
      return res.status(400).json({ message: 'Already enrolled in this session' });
    }

    const enrollment = await TrainingEnrollment.create({
      sessionId,
      employeeId,
      applicantId,
      enrollmentDate: moment().format('YYYY-MM-DD'),
      status: 'enrolled'
    });

    const result = await TrainingEnrollment.findByPk(enrollment.id, {
      include: [
        { model: TrainingSession, as: 'session', include: ['training'] },
        { model: Employee, as: 'employee' },
        { model: Applicant, as: 'applicant' }
      ]
    });

    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update enrollment status (mark completion)
// @route   PUT /api/training/enrollments/:id
// @access  Private (HR, Department Head, Trainer)
const updateEnrollment = async (req, res) => {
  try {
    const { status, performanceNotes, performanceScore } = req.body;
    const enrollment = await TrainingEnrollment.findByPk(req.params.id, {
      include: [
        {
          model: TrainingSession,
          as: 'session',
          include: [{ model: Training, as: 'training' }]
        },
        {
          model: Employee,
          as: 'employee',
          attributes: ['id', 'departmentId']
        }
      ]
    });

    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    const trainingAllowed = await enforceDepartmentHeadScope(req, res, enrollment.session?.training?.departmentId);
    if (!trainingAllowed) {
      return;
    }

    if (req.user.role === 'department_head' && !enrollment.employee) {
      return res.status(403).json({ message: 'Department heads can only update employee enrollments in their department' });
    }

    if (req.user.role === 'department_head' && enrollment.employee) {
      const employeeAllowed = await enforceDepartmentHeadScope(req, res, enrollment.employee.departmentId);
      if (!employeeAllowed) {
        return;
      }
    }

    const updateData = { status, performanceNotes, performanceScore };
    
    if (status === 'completed') {
      updateData.completionDate = moment().format('YYYY-MM-DD');
    }

    await enrollment.update(updateData);

    // If this is for an applicant, track progress for conversion
    if (enrollment.applicantId && status === 'completed') {
      // Could trigger conversion readiness check
      console.log(`Applicant ${enrollment.applicantId} completed training`);
    }

    const result = await TrainingEnrollment.findByPk(enrollment.id, {
      include: [
        { model: TrainingSession, as: 'session', include: ['training'] },
        { model: Employee, as: 'employee' },
        { model: Applicant, as: 'applicant' }
      ]
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get my trainings (for logged in employee)
// @route   GET /api/training/my-trainings
// @access  Private (All employees)
const getMyTrainings = async (req, res) => {
  try {
    const employee = await Employee.findOne({ where: { userId: req.user.id } });

    if (!employee) {
      return res.status(404).json({ message: 'Employee record not found' });
    }

    const enrollments = await TrainingEnrollment.findAll({
      where: { employeeId: employee.id },
      include: [
        {
          model: TrainingSession,
          as: 'session',
          include: [
            { model: Training, as: 'training' },
            { model: Employee, as: 'trainer', attributes: ['firstName', 'lastName'] }
          ]
        }
      ],
      order: [['enrollmentDate', 'DESC']]
    });

    // Group by status
    const result = {
      completed: enrollments.filter(e => e.status === 'completed'),
      inProgress: enrollments.filter(e => e.status === 'in-progress'),
      enrolled: enrollments.filter(e => e.status === 'enrolled'),
      all: enrollments
    };

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get training statistics
// @route   GET /api/training/stats
// @access  Private (HR, Director)
const getTrainingStats = async (req, res) => {
  try {
    const totalTrainings = await Training.count({ where: { isActive: true } });
    
    const totalSessions = await TrainingSession.count();
    const plannedSessions = await TrainingSession.count({ where: { status: 'planned' } });
    const ongoingSessions = await TrainingSession.count({ where: { status: 'ongoing' } });
    const completedSessions = await TrainingSession.count({ where: { status: 'completed' } });

    const totalEnrollments = await TrainingEnrollment.count();
    const completedEnrollments = await TrainingEnrollment.count({ where: { status: 'completed' } });
    const inProgressEnrollments = await TrainingEnrollment.count({ where: { status: 'in-progress' } });
    
    // Trainings by department
    const byDepartment = await Training.findAll({
      attributes: [
        'departmentId',
        [sequelize.fn('COUNT', sequelize.col('Training.id')), 'count']
      ],
      include: [{
        model: Department,
        as: 'department',
        attributes: ['name']
      }],
      group: ['Training.departmentId', 'department.id', 'department.name']
    });

    // Upcoming sessions
    const upcomingSessions = await TrainingSession.findAll({
      where: {
        startDate: { [Op.gte]: moment().format('YYYY-MM-DD') },
        status: 'planned'
      },
      include: ['training'],
      limit: 5,
      order: [['startDate', 'ASC']]
    });

    res.json({
      trainings: {
        total: totalTrainings,
        byDepartment
      },
      sessions: {
        total: totalSessions,
        planned: plannedSessions,
        ongoing: ongoingSessions,
        completed: completedSessions
      },
      enrollments: {
        total: totalEnrollments,
        completed: completedEnrollments,
        inProgress: inProgressEnrollments,
        completionRate: totalEnrollments > 0 
          ? ((completedEnrollments / totalEnrollments) * 100).toFixed(2) + '%' 
          : '0%'
      },
      upcomingSessions
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
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
};
