const { Shift, ShiftRotation, WorkSchedule, Employee, ProductionLine, User } = require('../models');
const { Op } = require('sequelize');
const moment = require('moment');

// @desc    Create default shifts
// @route   POST /api/shifts/init
// @access  Private (Director only)
const initShifts = async (req, res) => {
  try {
    const defaultShifts = [
      { name: 'morning', startTime: '07:00', endTime: '15:00', nightBonusAmount: 0 },
      { name: 'afternoon', startTime: '15:00', endTime: '23:00', nightBonusAmount: 0 },
      { name: 'night', startTime: '23:00', endTime: '07:00', nightBonusAmount: 500 }
    ];

    for (const shiftData of defaultShifts) {
      await Shift.findOrCreate({
        where: { name: shiftData.name },
        defaults: shiftData
      });
    }

    const shifts = await Shift.findAll();
    res.status(201).json({ message: 'Default shifts created', data: shifts });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Generate shift rotation for all employees
// @route   POST /api/shifts/generate-rotation
// @access  Private (Production Manager, Director)
const generateShiftRotation = async (req, res) => {
  try {
    const { startDate, weeks = 4 } = req.body;
    const weekStart = moment(startDate).startOf('week').add(1, 'day'); // Commence Lundi
    
    // Récupérer tous les employés permanents actifs
    const employees = await Employee.findAll({
      where: { 
        isActive: true,
        employmentStatus: 'permanent'
      }
    });

    const shifts = await Shift.findAll();
    const morningShift = shifts.find(s => s.name === 'morning');
    const afternoonShift = shifts.find(s => s.name === 'afternoon');
    const nightShift = shifts.find(s => s.name === 'night');

    const rotations = [];

    // Générer les rotations pour X semaines
    for (let week = 0; week < weeks; week++) {
      const currentWeekStart = moment(weekStart).add(week, 'weeks');
      
      // Déterminer le shift pour cette semaine (rotation toutes les 3 semaines)
      const shiftPattern = week % 3; // 0=morning, 1=afternoon, 2=night
      let assignedShift;
      
      switch(shiftPattern) {
        case 0:
          assignedShift = morningShift;
          break;
        case 1:
          assignedShift = afternoonShift;
          break;
        case 2:
          assignedShift = nightShift;
          break;
      }

      // Vérifier si c'est une semaine de biscuit sec
      const isDryBiscuitWeek = req.body.isDryBiscuitWeek || false;

      // Pour chaque employé, créer une rotation
      for (const employee of employees) {
        // Dry biscuit weeks still keep the three-shift rotation active

        const [rotation, created] = await ShiftRotation.findOrCreate({
          where: {
            employeeId: employee.id,
            weekStartDate: currentWeekStart.format('YYYY-MM-DD')
          },
          defaults: {
            employeeId: employee.id,
            weekStartDate: currentWeekStart.format('YYYY-MM-DD'),
            shiftId: assignedShift.id,
            isDryBiscuitWeek
          }
        });

        rotations.push(rotation);
      }
    }

    res.status(201).json({
      message: 'Shift rotations generated successfully',
      count: rotations.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Generate daily work schedules from rotations
// @route   POST /api/shifts/generate-schedules
// @access  Private (Production Manager, Director)
const generateDailySchedules = async (req, res) => {
  try {
    const { weekStartDate } = req.body;
    const start = moment(weekStartDate).startOf('week').add(1, 'day');
    const end = moment(start).add(4, 'days'); // Lundi à Vendredi

    // Récupérer les rotations pour la semaine
    const rotations = await ShiftRotation.findAll({
      where: {
        weekStartDate: start.format('YYYY-MM-DD')
      },
      include: ['employee']
    });

    const schedules = [];

    // Pour chaque jour de la semaine (Lundi-Vendredi)
    for (let day = 0; day < 5; day++) {
      const currentDate = moment(start).add(day, 'days');
      
      for (const rotation of rotations) {
        const [schedule, created] = await WorkSchedule.findOrCreate({
          where: {
            employeeId: rotation.employeeId,
            date: currentDate.format('YYYY-MM-DD')
          },
          defaults: {
            employeeId: rotation.employeeId,
            date: currentDate.format('YYYY-MM-DD'),
            shiftId: rotation.shiftId,
            productionLineId: rotation.employee.productionLineId,
            createdBy: req.user.id
          }
        });
        
        if (created) {
          schedules.push(schedule);
        }
      }
    }

    res.status(201).json({
      message: 'Daily schedules generated successfully',
      count: schedules.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get employee schedule for a week
// @route   GET /api/shifts/my-schedule
// @access  Private (All employees)
const getMySchedule = async (req, res) => {
  try {
    const { weekStart } = req.query;
    const start = moment(weekStart).startOf('week').add(1, 'day');
    const end = moment(start).add(6, 'days');

    // Récupérer l'employé associé à l'utilisateur
    const employee = await Employee.findOne({ where: { userId: req.user.id } });
    
    if (!employee) {
      return res.status(404).json({ message: 'Employee record not found' });
    }

    const schedules = await WorkSchedule.findAll({
      where: {
        employeeId: employee.id,
        date: {
          [Op.between]: [start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD')]
        }
      },
      include: [
        { model: Shift, as: 'shift' },
        { model: ProductionLine, as: 'productionLine' }
      ],
      order: [['date', 'ASC']]
    });

    res.json(schedules);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all schedules for a week (management)
// @route   GET /api/shifts/schedules
// @access  Private (Production Manager, HR, Director)
const getAllSchedules = async (req, res) => {
  try {
    const { weekStart, lineId } = req.query;
    const start = moment(weekStart).startOf('week').add(1, 'day');
    const end = moment(start).add(6, 'days');

    let whereClause = {
      date: {
        [Op.between]: [start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD')]
      }
    };

    if (lineId) {
      whereClause.productionLineId = lineId;
    }

    const schedules = await WorkSchedule.findAll({
      where: whereClause,
      include: [
        { 
          model: Employee, 
          as: 'employee',
          include: ['position']
        },
        { model: Shift, as: 'shift' },
        { model: ProductionLine, as: 'productionLine' }
      ],
      order: [['date', 'ASC'], ['productionLineId', 'ASC']]
    });

    const dryWeekRotation = await ShiftRotation.findOne({
      where: {
        weekStartDate: start.format('YYYY-MM-DD'),
        isDryBiscuitWeek: true
      }
    });

    // Grouper par ligne de production
    const groupedByLine = {};
    schedules.forEach(schedule => {
      const lineName = schedule.productionLine?.name || 'Non assigné';
      if (!groupedByLine[lineName]) {
        groupedByLine[lineName] = [];
      }
      groupedByLine[lineName].push(schedule);
    });

    res.json({
      weekStart: start.format('YYYY-MM-DD'),
      weekEnd: end.format('YYYY-MM-DD'),
      isDryBiscuitWeek: Boolean(dryWeekRotation),
      total: schedules.length,
      schedules,
      byLine: groupedByLine
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Override an existing work schedule
// @route   PUT /api/shifts/schedules/:id
// @access  Private (Production Manager, Director)
const overrideSchedule = async (req, res) => {
  try {
    const schedule = await WorkSchedule.findByPk(req.params.id);

    if (!schedule) {
      return res.status(404).json({ message: 'Schedule not found' });
    }

    const { shiftId, productionLineId, notes, isOvertime } = req.body;

    await schedule.update({
      shiftId: shiftId || schedule.shiftId,
      productionLineId: productionLineId || schedule.productionLineId,
      notes: notes !== undefined ? notes : schedule.notes,
      isOvertime: typeof isOvertime === 'boolean' ? isOvertime : schedule.isOvertime,
      createdBy: req.user.id
    });

    const updatedSchedule = await WorkSchedule.findByPk(schedule.id, {
      include: [
        {
          model: Employee,
          as: 'employee',
          include: ['position']
        },
        { model: Shift, as: 'shift' },
        { model: ProductionLine, as: 'productionLine' }
      ]
    });

    res.json({
      message: 'Schedule overridden successfully',
      schedule: updatedSchedule
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark dry biscuit week
// @route   POST /api/shifts/dry-week
// @access  Private (Production Manager, Director)
const markDryBiscuitWeek = async (req, res) => {
  try {
    const { weekStartDate } = req.body;

    // Mettre à jour les rotations pour la semaine
    await ShiftRotation.update(
      { isDryBiscuitWeek: true },
      { where: { weekStartDate } }
    );

    // Récupérer les employés temporaires
    res.json({ message: 'Dry biscuit week settings applied successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  initShifts,
  generateShiftRotation,
  generateDailySchedules,
  overrideSchedule,
  getMySchedule,
  getAllSchedules,
  markDryBiscuitWeek
};
