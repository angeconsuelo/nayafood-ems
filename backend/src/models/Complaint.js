const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Complaint = sequelize.define('Complaint', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  subject: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  category: {
    type: DataTypes.STRING(50),
    defaultValue: 'general'
  },
  status: {
    type: DataTypes.ENUM('submitted', 'reviewed', 'resolved'),
    defaultValue: 'submitted'
  },
  userId: {
    type: DataTypes.INTEGER,
    field: 'user_id',
    allowNull: false
  },
  employeeId: {
    type: DataTypes.INTEGER,
    field: 'employee_id',
    allowNull: true
  }
}, {
  tableName: 'complaints',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

Complaint.associate = (models) => {
  Complaint.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'user'
  });

  Complaint.belongsTo(models.Employee, {
    foreignKey: 'employeeId',
    as: 'employee'
  });
};

module.exports = Complaint;
