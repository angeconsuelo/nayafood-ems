const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ProductionSummary = sequelize.define('ProductionSummary', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  summaryDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'summary_date'
  },
  productionLineId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'production_line_id'
  },
  shiftId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'shift_id'
  },
  plannedUnits: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'planned_units'
  },
  actualUnits: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'actual_units'
  },
  goodUnits: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'good_units'
  },
  rejectedUnits: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'rejected_units'
  },
  wasteUnits: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'waste_units'
  },
  unitPrice: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'unit_price'
  },
  revenueAmount: {
    type: DataTypes.DECIMAL(14, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'revenue_amount'
  },
  rawMaterialCost: {
    type: DataTypes.DECIMAL(14, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'raw_material_cost'
  },
  laborCost: {
    type: DataTypes.DECIMAL(14, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'labor_cost'
  },
  overheadCost: {
    type: DataTypes.DECIMAL(14, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'overhead_cost'
  },
  otherCost: {
    type: DataTypes.DECIMAL(14, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'other_cost'
  },
  totalCost: {
    type: DataTypes.DECIMAL(14, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'total_cost'
  },
  grossProfit: {
    type: DataTypes.DECIMAL(14, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'gross_profit'
  },
  downtimeMinutes: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'downtime_minutes'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  recordedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'recorded_by'
  }
}, {
  tableName: 'production_daily_summaries',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

ProductionSummary.associate = (models) => {
  ProductionSummary.belongsTo(models.ProductionLine, {
    foreignKey: 'productionLineId',
    as: 'productionLine'
  });

  ProductionSummary.belongsTo(models.Shift, {
    foreignKey: 'shiftId',
    as: 'shift'
  });

  ProductionSummary.belongsTo(models.User, {
    foreignKey: 'recordedBy',
    as: 'recordedByUser'
  });
};

module.exports = ProductionSummary;
