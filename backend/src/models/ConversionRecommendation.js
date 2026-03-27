const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ConversionRecommendation = sequelize.define('ConversionRecommendation', {
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
  departmentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'department_id'
  },
  reviewerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'reviewer_id'
  },
  performanceRating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'performance_rating'
  },
  reviewNotes: {
    type: DataTypes.TEXT,
    field: 'review_notes'
  },
  recommendation: {
    type: DataTypes.ENUM('continue', 'convert', 'train', 'review'),
    allowNull: false,
    defaultValue: 'continue'
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    allowNull: false,
    defaultValue: 'pending'
  }
}, {
  tableName: 'conversion_recommendations',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

ConversionRecommendation.associate = (models) => {
  ConversionRecommendation.belongsTo(models.Employee, {
    foreignKey: 'employeeId',
    as: 'employee'
  });

  ConversionRecommendation.belongsTo(models.Department, {
    foreignKey: 'departmentId',
    as: 'department'
  });

  ConversionRecommendation.belongsTo(models.User, {
    foreignKey: 'reviewerId',
    as: 'reviewer'
  });
};

module.exports = ConversionRecommendation;
