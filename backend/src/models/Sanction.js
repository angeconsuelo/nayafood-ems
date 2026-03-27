const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Sanction = sequelize.define('Sanction', {
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
  sanctionType: {
    type: DataTypes.ENUM('absence', 'late', 'violation'),
    field: 'sanction_type',
    allowNull: false
  },
  incidentDate: {
    type: DataTypes.DATEONLY,
    field: 'incident_date',
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT
  },
  amount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  appliedDate: {
    type: DataTypes.DATEONLY,
    field: 'applied_date'
  },
  appliedBy: {
    type: DataTypes.INTEGER,
    field: 'applied_by'
  },
  notes: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'sanctions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

Sanction.associate = (models) => {
  Sanction.belongsTo(models.Employee, {
    foreignKey: 'employeeId',
    as: 'employee'
  });
  
  Sanction.belongsTo(models.User, {
    foreignKey: 'appliedBy',
    as: 'applicator'
  });
};

module.exports = Sanction;
