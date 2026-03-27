const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Employee = sequelize.define('Employee', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  employeeCode: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    field: 'employee_code'
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
  birthDate: {
    type: DataTypes.DATEONLY,
    field: 'birth_date'
  },
  hireDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'hire_date'
  },
  employmentStatus: {
    type: DataTypes.ENUM('temporary', 'permanent'),
    defaultValue: 'temporary',
    field: 'employment_status'
  },
  departmentId: {
    type: DataTypes.INTEGER,
    field: 'department_id'
  },
  positionId: {
    type: DataTypes.INTEGER,
    field: 'position_id'
  },
  productionLineId: {
    type: DataTypes.INTEGER,
    field: 'production_line_id'
  },
  emergencyContactName: {
    type: DataTypes.STRING(100),
    field: 'emergency_contact_name'
  },
  emergencyContactPhone: {
    type: DataTypes.STRING(20),
    field: 'emergency_contact_phone'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  userId: {
    type: DataTypes.INTEGER,
    field: 'user_id',
    allowNull: true
  }
}, {
  tableName: 'employees',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});
// Ajoutez cette méthode après la définition du modèle
Employee.associate = (models) => {
  Employee.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'user'
  });
  
  Employee.belongsTo(models.Department, {
    foreignKey: 'departmentId',
    as: 'department'
  });
  
  Employee.belongsTo(models.Position, {
    foreignKey: 'positionId',
    as: 'position'
  });
  
  Employee.belongsTo(models.ProductionLine, {
    foreignKey: 'productionLineId',
    as: 'productionLine'
  });

  Employee.hasMany(models.Complaint, {
    foreignKey: 'employeeId',
    as: 'complaints'
  });
};


module.exports = Employee;
