const { Department, Position, ProductionLine, LeaveType, Shift } = require('../models');

const ensureDefaults = async (Model, records, uniqueKey = 'name') => {
  for (const record of records) {
    await Model.findOrCreate({
      where: { [uniqueKey]: record[uniqueKey] },
      defaults: record
    });
  }
};

const formatLabel = (value) =>
  String(value || '')
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const seedDefaultsIfEmpty = async () => {
  await ensureDefaults(Department, [
    { name: 'Production', description: 'Production operations and shift teams' },
    { name: 'Quality Control', description: 'Quality assurance and food safety' },
    { name: 'Maintenance', description: 'Equipment maintenance and repairs' },
    { name: 'Warehouse', description: 'Stock and logistics operations' },
    { name: 'Administration', description: 'Administrative and support services' }
  ]);

  await ensureDefaults(ProductionLine, [
    { name: 'Biscuit Line 1', productType: 'biscuit', isActive: true },
    { name: 'Biscuit Line 2', productType: 'biscuit', isActive: true },
    { name: 'Milk Line', productType: 'milk', isActive: true },
    { name: 'Candy Line', productType: 'candy', isActive: true },
    { name: 'Packaging', productType: 'biscuit', isActive: true }
  ]);

  const departments = await Department.findAll();
  const byName = Object.fromEntries(departments.map((dept) => [dept.name, dept.id]));

  await ensureDefaults(Position, [
    { name: 'Machine Operator', departmentId: byName['Production'], baseSalary: 60000 },
    { name: 'Packer', departmentId: byName['Production'], baseSalary: 60000 },
    { name: 'Quality Inspector', departmentId: byName['Quality Control'], baseSalary: 60000 },
    { name: 'Technician', departmentId: byName['Maintenance'], baseSalary: 60000 },
    { name: 'Forklift Operator', departmentId: byName['Warehouse'], baseSalary: 60000 },
    { name: 'HR Assistant', departmentId: byName['Administration'], baseSalary: 60000 }
  ]);

  await ensureDefaults(LeaveType, [
    {
      name: 'annual',
      description: 'Annual paid leave',
      daysPerYear: 22,
      requiresMedicalBooklet: false,
      isPaid: true,
      isActive: true
    },
    {
      name: 'sick',
      description: 'Sick leave with medical certificate',
      daysPerYear: 30,
      requiresMedicalBooklet: true,
      isPaid: true,
      isActive: true
    },
    {
      name: 'unpaid',
      description: 'Unpaid leave',
      daysPerYear: 0,
      requiresMedicalBooklet: false,
      isPaid: false,
      isActive: true
    },
    {
      name: 'maternity',
      description: 'Maternity leave',
      daysPerYear: 98,
      requiresMedicalBooklet: true,
      isPaid: true,
      isActive: true
    },
    {
      name: 'paternity',
      description: 'Paternity leave',
      daysPerYear: 10,
      requiresMedicalBooklet: false,
      isPaid: true,
      isActive: true
    }
  ]);

  await ensureDefaults(Shift, [
    { name: 'morning', startTime: '07:00', endTime: '15:00', nightBonusAmount: 0 },
    { name: 'afternoon', startTime: '15:00', endTime: '23:00', nightBonusAmount: 0 },
    { name: 'night', startTime: '23:00', endTime: '07:00', nightBonusAmount: 500 }
  ]);
};

const getMasterData = async (req, res) => {
  try {
    await seedDefaultsIfEmpty();

    const [departments, positions, productionLines, leaveTypes, shifts] = await Promise.all([
      Department.findAll({ order: [['name', 'ASC']] }),
      Position.findAll({
        include: [{ model: Department, as: 'department' }],
        order: [['name', 'ASC']]
      }),
      ProductionLine.findAll({ order: [['name', 'ASC']] }),
      LeaveType.findAll({
        where: { isActive: true },
        order: [['name', 'ASC']]
      }),
      Shift.findAll({ order: [['startTime', 'ASC']] })
    ]);

    res.json({
      departments,
      positions,
      productionLines,
      leaveTypes: leaveTypes.map((type) => ({
        id: type.id,
        name: formatLabel(type.name),
        code: type.name,
        daysPerYear: type.daysPerYear,
        requiresMedical: type.requiresMedicalBooklet,
        paid: type.isPaid
      })),
      shifts: shifts.map((shift) => ({
        id: shift.id,
        name: formatLabel(shift.name),
        code: shift.name,
        time: `${shift.startTime} - ${shift.endTime}`,
        nightBonusAmount: shift.nightBonusAmount
      }))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getMasterData
};
