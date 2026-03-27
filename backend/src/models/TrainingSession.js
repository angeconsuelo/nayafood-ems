const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TrainingSession = sequelize.define('TrainingSession', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  trainingId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'training_id'
  },
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'start_date'
  },
  endDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'end_date'
  },
  trainerEmployeeId: {
    type: DataTypes.INTEGER,
    field: 'trainer_employee_id'
  },
  location: {
    type: DataTypes.STRING(100)
  },
  maxParticipants: {
    type: DataTypes.INTEGER,
    field: 'max_participants'
  },
  status: {
    type: DataTypes.ENUM('planned', 'ongoing', 'completed', 'cancelled'),
    defaultValue: 'planned'
  },
  notes: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'training_sessions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

TrainingSession.associate = (models) => {
  TrainingSession.belongsTo(models.Training, {
    foreignKey: 'trainingId',
    as: 'training'
  });
  
  TrainingSession.belongsTo(models.Employee, {
    foreignKey: 'trainerEmployeeId',
    as: 'trainer'
  });
  
  TrainingSession.hasMany(models.TrainingEnrollment, {
    foreignKey: 'sessionId',
    as: 'enrollments'
  });
};

module.exports = TrainingSession;
