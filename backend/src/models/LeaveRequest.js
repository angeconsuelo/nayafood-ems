const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const LeaveRequest = sequelize.define('LeaveRequest', {
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
  leaveTypeId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'leave_type_id'
  },
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'start_date'
  },
  endDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'end_date'
  },
  reason: {
    type: DataTypes.TEXT
  },
  medicalBookletPath: {
    type: DataTypes.STRING(255),
    field: 'medical_booklet_path'
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'cancelled'),
    defaultValue: 'pending'
  },
  approvedBy: {
    type: DataTypes.INTEGER,
    field: 'approved_by'
  },
  approvedAt: {
    type: DataTypes.DATE,
    field: 'approved_at'
  },
  rejectionReason: {
    type: DataTypes.TEXT,
    field: 'rejection_reason'
  }
}, {
  tableName: 'leave_requests',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

LeaveRequest.associate = (models) => {
  LeaveRequest.belongsTo(models.Employee, {
    foreignKey: 'employeeId',
    as: 'employee'
  });
  
  LeaveRequest.belongsTo(models.LeaveType, {
    foreignKey: 'leaveTypeId',
    as: 'leaveType'
  });
  
  LeaveRequest.belongsTo(models.User, {
    foreignKey: 'approvedBy',
    as: 'approver'
  });
};

module.exports = LeaveRequest;
