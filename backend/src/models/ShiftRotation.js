const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ShiftRotation = sequelize.define('ShiftRotation', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  employeeId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'employee_id'
  },
  weekStartDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'week_start_date'
  },
  shiftId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'shift_id'
  },
  isDryBiscuitWeek: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_dry_biscuit_week'
  }
}, {
  tableName: 'shift_rotations',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['employee_id', 'week_start_date']
    }
  ]
});

ShiftRotation.associate = (models) => {
  ShiftRotation.belongsTo(models.Employee, {
    foreignKey: 'employeeId',
    as: 'employee'
  });
  
  ShiftRotation.belongsTo(models.Shift, {
    foreignKey: 'shiftId',
    as: 'shift'
  });
};

module.exports = ShiftRotation;
