const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Shift = sequelize.define('Shift', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.ENUM('morning', 'afternoon', 'night', 'saturday_cleaning'),
    allowNull: false
  },
  startTime: {
    type: DataTypes.TIME,
    allowNull: false,
    field: 'start_time'
  },
  endTime: {
    type: DataTypes.TIME,
    allowNull: false,
    field: 'end_time'
  },
  nightBonusAmount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'night_bonus_amount'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  }
}, {
  tableName: 'shifts',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

Shift.associate = (models) => {
  Shift.hasMany(models.WorkSchedule, {
    foreignKey: 'shiftId',
    as: 'schedules'
  });
  
  Shift.hasMany(models.ShiftRotation, {
    foreignKey: 'shiftId',
    as: 'rotations'
  });
};

module.exports = Shift;
