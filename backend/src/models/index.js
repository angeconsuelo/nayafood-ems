const { sequelize } = require('../config/database');

// Import models
const User = require('./User');
const Employee = require('./Employee');
const Department = require('./Department');
const Position = require('./Position');
const ProductionLine = require('./ProductionLine');
const ProductionSummary = require('./ProductionSummary');
const ConversionRecommendation = require('./ConversionRecommendation');
const Shift = require('./Shift');
const ShiftRotation = require('./ShiftRotation');
const WorkSchedule = require('./WorkSchedule');
const Attendance = require('./Attendance');
const Sanction = require('./Sanction');
const LeaveType = require('./LeaveType');
const LeaveRequest = require('./LeaveRequest');
const Recruitment = require('./Recruitment');
const Applicant = require('./Applicant');
const Training = require('./Training');
const TrainingSession = require('./TrainingSession');
const TrainingEnrollment = require('./TrainingEnrollment');
const Complaint = require('./Complaint');
const SystemSetting = require('./SystemSetting');

// Initialize models object
const models = {
  User,
  Employee,
  Department,
  Position,
  ProductionLine,
  ProductionSummary,
  ConversionRecommendation,
  Shift,
  ShiftRotation,
  WorkSchedule,
Attendance,
Sanction,
LeaveType,
LeaveRequest,
Recruitment,
Applicant,
Training,
TrainingSession,
TrainingEnrollment,
Complaint,
SystemSetting
};

// Define associations
Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

module.exports = {
  ...models,
  sequelize
};

