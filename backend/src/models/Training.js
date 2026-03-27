const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Training = sequelize.define('Training', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT
  },
  departmentId: {
    type: DataTypes.INTEGER,
    field: 'department_id'
  },
  durationDays: {
    type: DataTypes.INTEGER,
    field: 'duration_days'
  },
  createdBy: {
    type: DataTypes.INTEGER,
    field: 'created_by'
  },
  isMandatory: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_mandatory'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  }
}, {
  tableName: 'trainings',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

Training.associate = (models) => {
  Training.belongsTo(models.Department, {
    foreignKey: 'departmentId',
    as: 'department'
  });
  
  Training.belongsTo(models.User, {
    foreignKey: 'createdBy',
    as: 'creator'
  });
  
  Training.hasMany(models.TrainingSession, {
    foreignKey: 'trainingId',
    as: 'sessions'
  });
};

module.exports = Training;
