const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Department = sequelize.define('Department', {
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
  headEmployeeId: {
    type: DataTypes.INTEGER,
    field: 'head_employee_id'
  }
}, {
  tableName: 'departments',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});
Department.associate = (models) => {
  Department.hasMany(models.Employee, {
    foreignKey: 'departmentId',
    as: 'employees'
  });
  
  Department.hasMany(models.Position, {
    foreignKey: 'departmentId',
    as: 'positions'
  });
  
  Department.belongsTo(models.Employee, {
    foreignKey: 'headEmployeeId',
    as: 'head'
  });
};



module.exports = Department;
