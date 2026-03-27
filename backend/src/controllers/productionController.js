const { ProductionSummary, ProductionLine, Shift } = require('../models');
const { Op } = require('sequelize');
const moment = require('moment');

const toNumber = (value) => Number(value || 0);

const getProductionOverview = async (req, res) => {
  try {
    const startDate = req.query.startDate || moment().startOf('month').format('YYYY-MM-DD');
    const endDate = req.query.endDate || moment().endOf('month').format('YYYY-MM-DD');

    const rows = await ProductionSummary.findAll({
      where: {
        summaryDate: {
          [Op.between]: [startDate, endDate]
        }
      },
      include: [
        { model: ProductionLine, as: 'productionLine' },
        { model: Shift, as: 'shift' }
      ],
      order: [['summaryDate', 'ASC']]
    });

    const totals = rows.reduce((acc, row) => {
      acc.revenue += toNumber(row.revenueAmount);
      acc.cost += toNumber(row.totalCost);
      acc.profit += toNumber(row.grossProfit);
      acc.plannedUnits += toNumber(row.plannedUnits);
      acc.actualUnits += toNumber(row.actualUnits);
      acc.goodUnits += toNumber(row.goodUnits);
      acc.rejectedUnits += toNumber(row.rejectedUnits);
      acc.downtimeMinutes += toNumber(row.downtimeMinutes);
      return acc;
    }, {
      revenue: 0,
      cost: 0,
      profit: 0,
      plannedUnits: 0,
      actualUnits: 0,
      goodUnits: 0,
      rejectedUnits: 0,
      downtimeMinutes: 0
    });

    const byDayMap = new Map();
    const byLineMap = new Map();

    rows.forEach((row) => {
      const date = row.summaryDate;
      const lineName = row.productionLine?.name || 'Unassigned';

      const byDay = byDayMap.get(date) || {
        date,
        revenue: 0,
        cost: 0,
        profit: 0,
        actualUnits: 0,
        goodUnits: 0
      };
      byDay.revenue += toNumber(row.revenueAmount);
      byDay.cost += toNumber(row.totalCost);
      byDay.profit += toNumber(row.grossProfit);
      byDay.actualUnits += toNumber(row.actualUnits);
      byDay.goodUnits += toNumber(row.goodUnits);
      byDayMap.set(date, byDay);

      const byLine = byLineMap.get(lineName) || {
        line: lineName,
        revenue: 0,
        cost: 0,
        profit: 0,
        actualUnits: 0,
        goodUnits: 0,
        rejectedUnits: 0,
        downtimeMinutes: 0
      };
      byLine.revenue += toNumber(row.revenueAmount);
      byLine.cost += toNumber(row.totalCost);
      byLine.profit += toNumber(row.grossProfit);
      byLine.actualUnits += toNumber(row.actualUnits);
      byLine.goodUnits += toNumber(row.goodUnits);
      byLine.rejectedUnits += toNumber(row.rejectedUnits);
      byLine.downtimeMinutes += toNumber(row.downtimeMinutes);
      byLineMap.set(lineName, byLine);
    });

    const details = rows.map((row) => ({
      id: row.id,
      summaryDate: row.summaryDate,
      line: row.productionLine?.name || 'Unassigned',
      shift: row.shift?.name || '-',
      plannedUnits: toNumber(row.plannedUnits),
      actualUnits: toNumber(row.actualUnits),
      goodUnits: toNumber(row.goodUnits),
      rejectedUnits: toNumber(row.rejectedUnits),
      revenueAmount: toNumber(row.revenueAmount),
      totalCost: toNumber(row.totalCost),
      grossProfit: toNumber(row.grossProfit),
      downtimeMinutes: toNumber(row.downtimeMinutes)
    }));

    const efficiency = totals.actualUnits > 0
      ? Number(((totals.goodUnits / totals.actualUnits) * 100).toFixed(2))
      : 0;

    res.json({
      period: { startDate, endDate },
      summary: {
        ...totals,
        efficiency
      },
      byDay: Array.from(byDayMap.values()),
      byLine: Array.from(byLineMap.values()).sort((a, b) => b.revenue - a.revenue),
      details
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getProductionOverview
};
