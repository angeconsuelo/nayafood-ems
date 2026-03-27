const { Employee, User, Department, Position, ProductionLine, sequelize } = require('../models');
const { Op } = require('sequelize');

const getRequesterDepartmentId = async (userId) => {
  const employee = await Employee.findOne({
    where: { userId },
    attributes: ['departmentId']
  });

  return employee?.departmentId || null;
};

// @desc    Create a new employee
// @route   POST /api/employees
// @access  Private (HR, Director)
const createEmployee = async (req, res) => {
  try {
    const {
      employeeCode,
      firstName,
      lastName,
      birthDate,
      hireDate,
      employmentStatus,
      departmentId,
      positionId,
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
      firstName,
      lastName,
      birthDate,
      hireDate,
      employmentStatus,
      departmentId,
      positionId,
      productionLineId,
      emergencyContactName,
      emergencyContactPhone
    });

    // Fetch created employee with associations
    const newEmployee = await Employee.findByPk(employee.id, {
      include: [
        { model: Department, as: 'department' },
        { model: Position, as: 'position' },
        { model: ProductionLine, as: 'productionLine' }
      ]
    });

    res.status(201).json(newEmployee);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all employees
// @route   GET /api/employees
// @access  Private (HR, Director, Production Manager)
const getAllEmployees = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      department, 
      line,
      search 
    } = req.query;

    const offset = (page - 1) * limit;

    // Build where clause
    let where = {};
    
    if (status) {
      where.employmentStatus = status;
    }
    
    if (department) {
      where.departmentId = department;
    }

    if (req.user.role === 'department_head') {
      const departmentId = await getRequesterDepartmentId(req.user.id);
      where.departmentId = departmentId || 0;
    }
    
    if (line) {
      where.productionLineId = line;
    }
    
    if (search) {
      where[Op.or] = [
        { firstName: { [Op.like]: `%${search}%` } },
        { lastName: { [Op.like]: `%${search}%` } },
        { employeeCode: { [Op.like]: `%${search}%` } }
      ];
    }

    const employees = await Employee.findAndCountAll({
      where,
      include: [
        { model: Department, as: 'department' },
        { model: Position, as: 'position' },
        { model: ProductionLine, as: 'productionLine' }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    res.json({
      total: employees.count,
      page: parseInt(page),
      pages: Math.ceil(employees.count / limit),
      data: employees.rows
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get employee by ID
// @route   GET /api/employees/:id
// @access  Private (All roles with restrictions)
const getEmployeeById = async (req, res) => {
  try {
    const employee = await Employee.findByPk(req.params.id, {
      include: [
        { model: Department, as: 'department' },
        { model: Position, as: 'position' },
        { model: ProductionLine, as: 'productionLine' },
        { model: User, as: 'user', attributes: ['email', 'role', 'lastLogin'] }
      ]
    });

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Role-based access control
    if (req.user.role === 'worker') {
      const currentEmployee = await Employee.findOne({
        where: { userId: req.user.id },
        attributes: ['id']
      });

      if (!currentEmployee || currentEmployee.id !== employee.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    if (req.user.role === 'department_head') {
      const departmentId = await getRequesterDepartmentId(req.user.id);
      if (!departmentId || employee.departmentId !== departmentId) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    res.json(employee);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update employee
// @route   PUT /api/employees/:id
// @access  Private (HR, Director)
const updateEmployee = async (req, res) => {
  try {
    const employee = await Employee.findByPk(req.params.id);

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const {
      firstName,
      lastName,
      birthDate,
      employmentStatus,
      departmentId,
      positionId,
      productionLineId,
      emergencyContactName,
      emergencyContactPhone,
      isActive
    } = req.body;

    // Update employee
    await employee.update({
      firstName,
      lastName,
      birthDate,
      employmentStatus,
      departmentId,
      positionId,
      productionLineId,
      emergencyContactName,
      emergencyContactPhone,
      isActive
    });

    // Fetch updated employee with associations
    const updatedEmployee = await Employee.findByPk(employee.id, {
      include: [
        { model: Department, as: 'department' },
        { model: Position, as: 'position' },
        { model: ProductionLine, as: 'productionLine' }
      ]
    });

    res.json(updatedEmployee);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete employee (soft delete)
// @route   DELETE /api/employees/:id
// @access  Private (Director only)
const deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findByPk(req.params.id);

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Soft delete (set isActive to false)
    await employee.update({ isActive: false });

    res.json({ message: 'Employee deactivated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Convert temporary to permanent
// @route   PUT /api/employees/:id/convert
// @access  Private (HR, Director)
const convertToPermanent = async (req, res) => {
  try {
    const employee = await Employee.findByPk(req.params.id);

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    if (employee.employmentStatus === 'permanent') {
      return res.status(400).json({ message: 'Employee is already permanent' });
    }

    await employee.update({ 
      employmentStatus: 'permanent'
    });

    res.json({ 
      message: 'Employee successfully converted to permanent',
      employee 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get employees by production line
// @route   GET /api/employees/line/:lineId
// @access  Private (Production Manager, HR, Director)
const getEmployeesByLine = async (req, res) => {
  try {
    const employees = await Employee.findAll({
      where: { 
        productionLineId: req.params.lineId,
        isActive: true 
      },
      include: [
        { model: Position, as: 'position' }
      ],
      order: [['firstName', 'ASC']]
    });

    res.json(employees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get employee statistics
// @route   GET /api/employees/stats/summary
// @access  Private (Director, HR)
const getEmployeeStats = async (req, res) => {
  try {
    const total = await Employee.count();
    const permanent = await Employee.count({ where: { employmentStatus: 'permanent' } });
    const temporary = await Employee.count({ where: { employmentStatus: 'temporary' } });
    const active = await Employee.count({ where: { isActive: true } });
    
    // Count by production line
    const byLine = await Employee.findAll({
      attributes: [
        'productionLineId',
        [sequelize.fn('COUNT', sequelize.col('Employee.id')), 'count']
      ],
      include: [{
        model: ProductionLine,
        as: 'productionLine',
        attributes: ['name']
      }],
      group: ['Employee.productionLineId', 'productionLine.id', 'productionLine.name']
    });

    res.json({
      total,
      permanent,
      temporary,
      active,
      inactive: total - active,
      byLine
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Assign employee to a production line
// @route   PUT /api/employees/:id/assign-line
// @access  Private (Production Manager, Director)
const assignEmployeeLine = async (req, res) => {
  try {
    const employee = await Employee.findByPk(req.params.id);

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const { productionLineId } = req.body;

    await employee.update({ productionLineId });

    const updatedEmployee = await Employee.findByPk(employee.id, {
      include: [
        { model: Department, as: 'department' },
        { model: Position, as: 'position' },
        { model: ProductionLine, as: 'productionLine' }
      ]
    });

    res.json({
      message: 'Employee production line assigned successfully',
      employee: updatedEmployee
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createEmployee,
  getAllEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
  convertToPermanent,
  assignEmployeeLine,
  getEmployeesByLine,
  getEmployeeStats
};
