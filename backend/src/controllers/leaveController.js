const { LeaveRequest, LeaveType, Employee, User, sequelize } = require('../models');
const { Op } = require('sequelize');
const moment = require('moment');

// @desc    Create default leave types
// @route   POST /api/leave/init-types
// @access  Private (HR, Director)
const initLeaveTypes = async (req, res) => {
  try {
    const defaultTypes = [
      { 
        name: 'annual', 
        description: 'Annual paid leave', 
        daysPerYear: 22, 
        requiresMedicalBooklet: false,
        isPaid: true 
      },
      { 
        name: 'sick', 
        description: 'Sick leave with medical certificate', 
        daysPerYear: 30, 
        requiresMedicalBooklet: true,
        isPaid: true 
      },
      { 
        name: 'unpaid', 
        description: 'Unpaid leave', 
        daysPerYear: 0, 
        requiresMedicalBooklet: false,
        isPaid: false 
      },
      { 
        name: 'maternity', 
        description: 'Maternity leave', 
        daysPerYear: 98, 
        requiresMedicalBooklet: true,
        isPaid: true 
      },
      { 
        name: 'paternity', 
        description: 'Paternity leave', 
        daysPerYear: 10, 
        requiresMedicalBooklet: false,
        isPaid: true 
      }
    ];

    for (const typeData of defaultTypes) {
      await LeaveType.findOrCreate({
        where: { name: typeData.name },
        defaults: typeData
      });
    }

    const types = await LeaveType.findAll();
    res.status(201).json({ message: 'Default leave types created', data: types });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create leave request
// @route   POST /api/leave/request
// @access  Private (All employees)
const createLeaveRequest = async (req, res) => {
  try {
    const { leaveTypeId, startDate, endDate, reason, medicalBookletPath } = req.body;
    
    // Find employee associated with user
    const employee = await Employee.findOne({ where: { userId: req.user.id } });
    
    if (!employee) {
      return res.status(404).json({ message: 'Employee record not found' });
    }
    
    const leaveType = await LeaveType.findByPk(leaveTypeId);
    if (!leaveType) {
      return res.status(404).json({ message: 'Leave type not found' });
    }
    
    // Calculate number of days
    const start = moment(startDate);
    const end = moment(endDate);
    const days = end.diff(start, 'days') + 1;
    
    // Check for overlapping requests
    const overlapping = await LeaveRequest.findOne({
      where: {
        employeeId: employee.id,
        status: { [Op.in]: ['pending', 'approved'] },
        [Op.or]: [
          {
            startDate: { [Op.between]: [startDate, endDate] }
          },
          {
            endDate: { [Op.between]: [startDate, endDate] }
          }
        ]
      }
    });
    
    if (overlapping) {
      return res.status(400).json({ message: 'Overlapping leave request exists' });
    }
    
    const leaveRequest = await LeaveRequest.create({
      employeeId: employee.id,
      leaveTypeId,
      startDate,
      endDate,
      reason,
      medicalBookletPath: medicalBookletPath || null,
      status: 'pending'
    });
    
    const result = await LeaveRequest.findByPk(leaveRequest.id, {
      include: [
        { model: LeaveType, as: 'leaveType' },
        { model: Employee, as: 'employee' }
      ]
    });
    
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get my leave requests
// @route   GET /api/leave/my-requests
// @access  Private (All employees)
const getMyLeaveRequests = async (req, res) => {
  try {
    const employee = await Employee.findOne({ where: { userId: req.user.id } });
    
    if (!employee) {
      return res.status(404).json({ message: 'Employee record not found' });
    }
    
    const requests = await LeaveRequest.findAll({
      where: { employeeId: employee.id },
      include: ['leaveType'],
      order: [['created_at', 'DESC']]
    });
    
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all leave requests (management)
// @route   GET /api/leave/all
// @access  Private (HR, Manager, Director)
const getAllLeaveRequests = async (req, res) => {
  try {
    const { status, employeeId, startDate, endDate } = req.query;
    
    let where = {};
    if (status) where.status = status;
    if (employeeId) where.employeeId = employeeId;
    if (startDate && endDate) {
      where.startDate = { [Op.gte]: startDate };
      where.endDate = { [Op.lte]: endDate };
    }
    
    const requests = await LeaveRequest.findAll({
      where,
      include: [
        { 
          model: Employee, 
          as: 'employee',
          include: ['position', 'productionLine']
        },
        { model: LeaveType, as: 'leaveType' }
      ],
      order: [['created_at', 'DESC']]
    });
    
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Approve leave request
// @route   PUT /api/leave/:id/approve
// @access  Private (HR, Manager, Director)
const approveLeaveRequest = async (req, res) => {
  try {
    const leaveRequest = await LeaveRequest.findByPk(req.params.id);
    
    if (!leaveRequest) {
      return res.status(404).json({ message: 'Leave request not found' });
    }
    
    if (leaveRequest.status !== 'pending') {
      return res.status(400).json({ message: `Request already ${leaveRequest.status}` });
    }
    
    await leaveRequest.update({
      status: 'approved',
      approvedBy: req.user.id,
      approvedAt: new Date()
    });
    
    res.json({ message: 'Leave request approved', leaveRequest });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reject leave request
// @route   PUT /api/leave/:id/reject
// @access  Private (HR, Manager, Director)
const rejectLeaveRequest = async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    const leaveRequest = await LeaveRequest.findByPk(req.params.id);
    
    if (!leaveRequest) {
      return res.status(404).json({ message: 'Leave request not found' });
    }
    
    if (leaveRequest.status !== 'pending') {
      return res.status(400).json({ message: `Request already ${leaveRequest.status}` });
    }
    
    await leaveRequest.update({
      status: 'rejected',
      rejectionReason,
      approvedBy: req.user.id,
      approvedAt: new Date()
    });
    
    res.json({ message: 'Leave request rejected', leaveRequest });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get leave balance for employee
// @route   GET /api/leave/balance/:employeeId?
// @access  Private (HR, Manager, Director)
const getLeaveBalance = async (req, res) => {
  try {
    let employeeId = req.params.employeeId;

    if (!employeeId) {
      const employee = await Employee.findOne({
        where: { userId: req.user.id },
        attributes: ['id']
      });

      employeeId = employee?.id;
    }
    
    if (!employeeId) {
      return res.status(400).json({ message: 'Employee ID required' });
    }
    
    const leaveTypes = await LeaveType.findAll();
    const balances = [];
    
    for (const type of leaveTypes) {
      // Get approved leave requests for this year
      const yearStart = moment().startOf('year').format('YYYY-MM-DD');
      const yearEnd = moment().endOf('year').format('YYYY-MM-DD');
      
      const taken = await LeaveRequest.sum(
        sequelize.literal('DATEDIFF(end_date, start_date) + 1'),
        {
          where: {
            employeeId,
            leaveTypeId: type.id,
            status: 'approved',
            startDate: { [Op.gte]: yearStart },
            endDate: { [Op.lte]: yearEnd }
          }
        }
      );
      
      balances.push({
        leaveType: type.name,
        total: type.daysPerYear,
        taken: taken || 0,
        remaining: type.daysPerYear - (taken || 0),
        requiresMedicalBooklet: type.requiresMedicalBooklet
      });
    }
    
    res.json(balances);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  initLeaveTypes,
  createLeaveRequest,
  getMyLeaveRequests,
  getAllLeaveRequests,
  approveLeaveRequest,
  rejectLeaveRequest,
  getLeaveBalance
};
