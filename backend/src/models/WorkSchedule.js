const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const WorkSchedule = sequelize.define('WorkSchedule', {
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
  shiftId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'shift_id'
  },
  productionLineId: {
    type: DataTypes.INTEGER,
    field: 'production_line_id'
  },
  isOvertime: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_overtime'
  },
  createdBy: {
    type: DataTypes.INTEGER,
    field: 'created_by'
  },
  notes: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'work_schedules',
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

WorkSchedule.associate = (models) => {
  WorkSchedule.belongsTo(models.Employee, {
    foreignKey: 'employeeId',
    as: 'employee'
  });
  
  WorkSchedule.belongsTo(models.Shift, {
    foreignKey: 'shiftId',
    as: 'shift'
  });
  
  WorkSchedule.belongsTo(models.ProductionLine, {
    foreignKey: 'productionLineId',
    as: 'productionLine'
  });
  
  WorkSchedule.belongsTo(models.User, {
    foreignKey: 'createdBy',
    as: 'creator'
  });
};

module.exports = WorkSchedule;
