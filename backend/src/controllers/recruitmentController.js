const { Recruitment, Applicant, Position, Employee, User } = require('../models');
const { Op } = require('sequelize');
const moment = require('moment');

const ALLOWED_APPLICANT_STATUSES = [
  'pending',
  'reviewed',
  'shortlisted',
  'interviewed',
  'selected',
  'converted',
  'rejected',
  'withdrawn'
];

// @desc    Create a job posting
// @route   POST /api/recruitment
// @access  Private (HR, Director)
const createRecruitment = async (req, res) => {
  try {
    const {
      positionId,
      title,
      description,
      requirements,
      quantity,
      employmentType,
      closingDate
    } = req.body;

    const recruitment = await Recruitment.create({
      positionId,
      title,
      description,
      requirements,
      quantity,
      employmentType,
      status: 'draft',
      postedDate: moment().format('YYYY-MM-DD'),
      closingDate,
      createdBy: req.user.id
    });

    const result = await Recruitment.findByPk(recruitment.id, {
      include: [
        { model: Position, as: 'position' },
        { model: User, as: 'creator', attributes: ['firstName', 'lastName', 'email'] }
      ]
    });

    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all job postings
// @route   GET /api/recruitment
// @access  Private (HR, Manager, Director)
const getAllRecruitments = async (req, res) => {
  try {
    const { status, positionId } = req.query;
    
    let where = {};
    if (status) where.status = status;
    if (positionId) where.positionId = positionId;

    const recruitments = await Recruitment.findAll({
      where,
      include: [
        { model: Position, as: 'position' },
        { 
          model: Applicant, 
          as: 'applicants',
          separate: true,
          limit: 5,
          order: [['created_at', 'DESC']]
        }
      ],
      order: [['created_at', 'DESC']]
    });

    // Add stats for each recruitment
    const result = recruitments.map(rec => {
      const data = rec.toJSON();
      data.stats = {
        total: rec.applicants?.length || 0,
        pending: rec.applicants?.filter(a => a.status === 'pending').length || 0,
        shortlisted: rec.applicants?.filter(a => a.status === 'shortlisted').length || 0,
        interviewed: rec.applicants?.filter(a => a.status === 'interviewed').length || 0,
        selected: rec.applicants?.filter(a => a.status === 'selected').length || 0,
        rejected: rec.applicants?.filter(a => a.status === 'rejected').length || 0
      };
      return data;
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get recruitment by ID
// @route   GET /api/recruitment/:id
// @access  Private (HR, Manager, Director)
const getRecruitmentById = async (req, res) => {
  try {
    const recruitment = await Recruitment.findByPk(req.params.id, {
      include: [
        { model: Position, as: 'position' },
        { model: User, as: 'creator', attributes: ['firstName', 'lastName', 'email'] },
        { 
          model: Applicant, 
          as: 'applicants',
          order: [['created_at', 'DESC']]
        }
      ]
    });

    if (!recruitment) {
      return res.status(404).json({ message: 'Recruitment not found' });
    }

    res.json(recruitment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update recruitment
// @route   PUT /api/recruitment/:id
// @access  Private (HR, Director)
const updateRecruitment = async (req, res) => {
  try {
    const recruitment = await Recruitment.findByPk(req.params.id);

    if (!recruitment) {
      return res.status(404).json({ message: 'Recruitment not found' });
    }

    const {
      title,
      description,
      requirements,
      quantity,
      employmentType,
      status,
      closingDate
    } = req.body;

    await recruitment.update({
      title,
      description,
      requirements,
      quantity,
      employmentType,
      status,
      closingDate
    });

    const updated = await Recruitment.findByPk(recruitment.id, {
      include: [
        { model: Position, as: 'position' },
        { model: User, as: 'creator', attributes: ['firstName', 'lastName', 'email'] }
      ]
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Change recruitment status
// @route   PUT /api/recruitment/:id/status
// @access  Private (HR, Director)
const changeRecruitmentStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const recruitment = await Recruitment.findByPk(req.params.id);

    if (!recruitment) {
      return res.status(404).json({ message: 'Recruitment not found' });
    }

    await recruitment.update({ status });

    res.json({ message: `Recruitment status changed to ${status}`, recruitment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Apply to a job (public - but we'll keep it authenticated)
// @route   POST /api/recruitment/:id/apply
// @access  Private (Anyone with account)
const applyForJob = async (req, res) => {
  try {
    const recruitment = await Recruitment.findByPk(req.params.id);

    if (!recruitment) {
      return res.status(404).json({ message: 'Job posting not found' });
    }

    if (recruitment.status !== 'open') {
      return res.status(400).json({ message: 'This position is not open for applications' });
    }

    const {
      firstName,
      lastName,
      email,
      phone,
      address,
      notes
    } = req.body;

    // Check if already applied
    const existingApplicant = await Applicant.findOne({
      where: {
        recruitmentId: recruitment.id,
        email: email
      }
    });

    if (existingApplicant) {
      return res.status(400).json({ message: 'You have already applied for this position' });
    }

    const applicant = await Applicant.create({
      recruitmentId: recruitment.id,
      firstName,
      lastName,
      email,
      phone,
      address,
      notes,
      status: 'pending'
    });

    res.status(201).json({
      message: 'Application submitted successfully',
      applicant
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all applicants (with filters)
// @route   GET /api/recruitment/applicants
// @access  Private (HR, Manager, Director)
const getAllApplicants = async (req, res) => {
  try {
    const { status, recruitmentId, search } = req.query;

    let where = {};
    if (status) where.status = status;
    if (recruitmentId) where.recruitmentId = recruitmentId;
    if (search) {
      where[Op.or] = [
        { firstName: { [Op.like]: `%${search}%` } },
        { lastName: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }

    const applicants = await Applicant.findAll({
      where,
      include: [
        { 
          model: Recruitment, 
          as: 'recruitment',
          include: ['position']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json(applicants);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get applicant by ID
// @route   GET /api/recruitment/applicants/:id
// @access  Private (HR, Manager, Director)
const getApplicantById = async (req, res) => {
  try {
    const applicant = await Applicant.findByPk(req.params.id, {
      include: [
        { 
          model: Recruitment, 
          as: 'recruitment',
          include: ['position']
        }
      ]
    });

    if (!applicant) {
      return res.status(404).json({ message: 'Applicant not found' });
    }

    res.json(applicant);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update applicant status
// @route   PUT /api/recruitment/applicants/:id/status
// @access  Private (HR, Manager, Director)
const updateApplicantStatus = async (req, res) => {
  try {
    const { status, interviewDate, interviewFeedback, interviewScore, notes } = req.body;
    const applicant = await Applicant.findByPk(req.params.id);

    if (!applicant) {
      return res.status(404).json({ message: 'Applicant not found' });
    }

    if (!ALLOWED_APPLICANT_STATUSES.includes(status)) {
      return res.status(400).json({ message: 'Invalid applicant status' });
    }

    await applicant.update({
      status,
      interviewDate,
      interviewFeedback,
      interviewScore,
      notes
    });

    res.json({
      message: `Applicant status updated to ${status}`,
      applicant
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Convert applicant to employee
// @route   POST /api/recruitment/applicants/:id/convert
// @access  Private (HR, Director)
const convertApplicantToEmployee = async (req, res) => {
  try {
    const applicant = await Applicant.findByPk(req.params.id, {
      include: ['recruitment']
    });

    if (!applicant) {
      return res.status(404).json({ message: 'Applicant not found' });
    }

    if (applicant.status !== 'selected') {
      return res.status(400).json({ message: 'Applicant must be selected first' });
    }

    const {
      employeeCode,
      hireDate,
      departmentId,
      productionLineId,
      emergencyContactName,
      emergencyContactPhone
    } = req.body;

    // Check if employee code already exists
    const existingEmployee = await Employee.findOne({ where: { employeeCode } });
    if (existingEmployee) {
      return res.status(400).json({ message: 'Employee code already exists' });
    }

    // Create employee
    const employee = await Employee.create({
      employeeCode,
      firstName: applicant.firstName,
      lastName: applicant.lastName,
      hireDate: hireDate || moment().format('YYYY-MM-DD'),
      employmentStatus: applicant.recruitment.employmentType || 'temporary',
      departmentId,
      positionId: applicant.recruitment.positionId,
      productionLineId,
      emergencyContactName,
      emergencyContactPhone,
      isActive: true
    });

    // Update applicant
    await applicant.update({
      convertedToEmployeeId: employee.id,
      status: 'converted'
    });

    // Update recruitment stats
    const recruitment = await Recruitment.findByPk(applicant.recruitmentId);
    const selectedCount = await Applicant.count({
      where: {
        recruitmentId: recruitment.id,
        status: 'selected'
      }
    });

    if (selectedCount >= recruitment.quantity) {
      await recruitment.update({ status: 'closed' });
    }

    res.status(201).json({
      message: 'Applicant successfully converted to employee',
      employee,
      applicant
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get recruitment statistics
// @route   GET /api/recruitment/stats
// @access  Private (HR, Director)
const getRecruitmentStats = async (req, res) => {
  try {
    const total = await Recruitment.count();
    const open = await Recruitment.count({ where: { status: 'open' } });
    const inProgress = await Recruitment.count({ where: { status: 'in-progress' } });
    const closed = await Recruitment.count({ where: { status: 'closed' } });

    const totalApplicants = await Applicant.count();
    const pending = await Applicant.count({ where: { status: 'pending' } });
    const shortlisted = await Applicant.count({ where: { status: 'shortlisted' } });
    const interviewed = await Applicant.count({ where: { status: 'interviewed' } });
    const selected = await Applicant.count({ where: { status: 'selected' } });
    const rejected = await Applicant.count({ where: { status: 'rejected' } });

    // Applicants by recruitment
    const byRecruitment = await Recruitment.findAll({
      attributes: ['id', 'title'],
      include: [{
        model: Applicant,
        as: 'applicants',
        attributes: []
      }],
      group: ['Recruitment.id']
    });

    res.json({
      recruitments: {
        total,
        open,
        inProgress,
        closed
      },
      applicants: {
        total: totalApplicants,
        pending,
        shortlisted,
        interviewed,
        selected,
        rejected,
        conversionRate: totalApplicants > 0 ? (selected / totalApplicants * 100).toFixed(2) + '%' : '0%'
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createRecruitment,
  getAllRecruitments,
  getRecruitmentById,
  updateRecruitment,
  changeRecruitmentStatus,
  applyForJob,
  getAllApplicants,
  getApplicantById,
  updateApplicantStatus,
  convertApplicantToEmployee,
  getRecruitmentStats
};
