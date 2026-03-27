const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Position = sequelize.define('Position', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  departmentId: {
    type: DataTypes.INTEGER,
    field: 'department_id'
  },
  baseSalary: {
    type: DataTypes.DECIMAL(10, 2),
    field: 'base_salary',
    defaultValue: 60000
  },
  description: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'positions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

Position.associate = (models) => {
  Position.belongsTo(models.Department, {
    foreignKey: 'departmentId',
    as: 'department'
  });
  
  Position.hasMany(models.Employee, {
    foreignKey: 'positionId',
    as: 'employees'
  });
};

module.exports = Position;
