const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Attendance = sequelize.define('Attendance', {
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
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  scheduledShiftId: {
    type: DataTypes.INTEGER,
    field: 'scheduled_shift_id'
  },
  checkInTime: {
    type: DataTypes.DATE,
    field: 'check_in_time'
  },
  checkOutTime: {
    type: DataTypes.DATE,
    field: 'check_out_time'
  },
  status: {
    type: DataTypes.ENUM('present', 'late', 'absent'),
    defaultValue: 'absent'
  },
  lateMinutes: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'late_minutes'
  },
  absenceReason: {
    type: DataTypes.TEXT,
    field: 'absence_reason'
  },
  nightBonusEarned: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'night_bonus_earned'
  },
  sanctionApplied: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'sanction_applied'
  },
  sanctionAmount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'sanction_amount'
  },
  recordedBy: {
    type: DataTypes.INTEGER,
    field: 'recorded_by'
  },
  notes: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'attendance',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['employee_id', 'date']
    }
  ]
});

Attendance.associate = (models) => {
  Attendance.belongsTo(models.Employee, {
    foreignKey: 'employeeId',
    as: 'employee'
  });
  
  Attendance.belongsTo(models.Shift, {
    foreignKey: 'scheduledShiftId',
    as: 'scheduledShift'
  });
  
  Attendance.belongsTo(models.User, {
    foreignKey: 'recordedBy',
    as: 'recorder'
  });
};

module.exports = Attendance;
