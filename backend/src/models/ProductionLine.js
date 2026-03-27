const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ProductionLine = sequelize.define('ProductionLine', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  productType: {
    type: DataTypes.ENUM('biscuit', 'milk', 'candy'),
    field: 'product_type',
    allowNull: false
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  }
}, {
  tableName: 'production_lines',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});
ProductionLine.associate = (models) => {
  ProductionLine.hasMany(models.Employee, {
    foreignKey: 'productionLineId',
    as: 'employees'
  });

  ProductionLine.hasMany(models.ProductionSummary, {
    foreignKey: 'productionLineId',
    as: 'productionSummaries'
  });
};



module.exports = ProductionLine;
