const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Recruitment = sequelize.define('Recruitment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  positionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'position_id'
  },
  title: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT
  },
  requirements: {
    type: DataTypes.TEXT
  },
  quantity: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  employmentType: {
    type: DataTypes.ENUM('temporary', 'permanent'),
    defaultValue: 'temporary',
    field: 'employment_type'
  },
  status: {
    type: DataTypes.ENUM('draft', 'open', 'in-progress', 'closed', 'cancelled'),
    defaultValue: 'draft'
  },
  postedDate: {
    type: DataTypes.DATEONLY,
    field: 'posted_date'
  },
  closingDate: {
    type: DataTypes.DATEONLY,
    field: 'closing_date'
  },
  createdBy: {
    type: DataTypes.INTEGER,
    field: 'created_by'
  }
}, {
  tableName: 'recruitments',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

Recruitment.associate = (models) => {
  Recruitment.belongsTo(models.Position, {
    foreignKey: 'positionId',
    as: 'position'
  });
  
  Recruitment.belongsTo(models.User, {
    foreignKey: 'createdBy',
    as: 'creator'
  });
  
  Recruitment.hasMany(models.Applicant, {
    foreignKey: 'recruitmentId',
    as: 'applicants'
  });
};

module.exports = Recruitment;
