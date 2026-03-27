const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Applicant = sequelize.define('Applicant', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  recruitmentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'recruitment_id'
  },
  firstName: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'first_name'
  },
  lastName: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'last_name'
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  phone: {
    type: DataTypes.STRING(20)
  },
  address: {
    type: DataTypes.TEXT
  },
  resumePath: {
    type: DataTypes.STRING(255),
    field: 'resume_path'
  },
  applicationDate: {
    type: DataTypes.DATEONLY,
    defaultValue: DataTypes.NOW,
    field: 'application_date'
  },
  status: {
    type: DataTypes.ENUM(
      'pending', 
      'reviewed', 
      'shortlisted', 
      'interviewed', 
      'selected', 
      'converted',
      'rejected', 
      'withdrawn'
    ),
    defaultValue: 'pending'
  },
  interviewDate: {
    type: DataTypes.DATE,
    field: 'interview_date'
  },
  interviewFeedback: {
    type: DataTypes.TEXT,
    field: 'interview_feedback'
  },
  interviewScore: {
    type: DataTypes.INTEGER,
    field: 'interview_score',
    validate: {
      min: 0,
      max: 100
    }
  },
  notes: {
    type: DataTypes.TEXT
  },
  convertedToEmployeeId: {
    type: DataTypes.INTEGER,
    field: 'converted_to_employee_id'
  }
}, {
  tableName: 'applicants',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

Applicant.associate = (models) => {
  Applicant.belongsTo(models.Recruitment, {
    foreignKey: 'recruitmentId',
    as: 'recruitment'
  });
  
  Applicant.belongsTo(models.Employee, {
    foreignKey: 'convertedToEmployeeId',
    as: 'convertedEmployee'
  });
};

module.exports = Applicant;
