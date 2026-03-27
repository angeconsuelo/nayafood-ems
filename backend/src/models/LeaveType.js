const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const LeaveType = sequelize.define('LeaveType', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  description: {
    type: DataTypes.TEXT
  },
  daysPerYear: {
    type: DataTypes.INTEGER,
    field: 'days_per_year',
    defaultValue: 0
  },
  requiresMedicalBooklet: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'requires_medical_booklet'
  },
  isPaid: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_paid'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  }
}, {
  tableName: 'leave_types',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

LeaveType.associate = (models) => {
  LeaveType.hasMany(models.LeaveRequest, {
    foreignKey: 'leaveTypeId',
    as: 'requests'
  });
};

module.exports = LeaveType;
