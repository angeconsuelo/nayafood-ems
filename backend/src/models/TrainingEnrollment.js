const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TrainingEnrollment = sequelize.define('TrainingEnrollment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  sessionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'session_id'
  },
  employeeId: {
    type: DataTypes.INTEGER,
    field: 'employee_id'
  },
  applicantId: {
    type: DataTypes.INTEGER,
    field: 'applicant_id'
  },
  enrollmentDate: {
    type: DataTypes.DATEONLY,
    defaultValue: DataTypes.NOW,
    field: 'enrollment_date'
  },
  completionDate: {
    type: DataTypes.DATEONLY,
    field: 'completion_date'
  },
  status: {
    type: DataTypes.ENUM('enrolled', 'in-progress', 'completed', 'failed', 'dropped'),
    defaultValue: 'enrolled'
  },
  performanceNotes: {
    type: DataTypes.TEXT,
    field: 'performance_notes'
  },
  performanceScore: {
    type: DataTypes.INTEGER,
    field: 'performance_score',
    validate: {
      min: 0,
      max: 100
    }
  }
}, {
  tableName: 'training_enrollments',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['session_id', 'employee_id']
    },
    {
      unique: true,
      fields: ['session_id', 'applicant_id']
    }
  ]
});

TrainingEnrollment.associate = (models) => {
  TrainingEnrollment.belongsTo(models.TrainingSession, {
    foreignKey: 'sessionId',
    as: 'session'
  });
  
  TrainingEnrollment.belongsTo(models.Employee, {
    foreignKey: 'employeeId',
    as: 'employee'
  });
  
  TrainingEnrollment.belongsTo(models.Applicant, {
    foreignKey: 'applicantId',
    as: 'applicant'
  });
};

module.exports = TrainingEnrollment;
