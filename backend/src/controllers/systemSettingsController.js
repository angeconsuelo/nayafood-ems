const { SystemSetting } = require('../models');

const defaultSettings = {
  nightBonusAmount: 500,
  saturdayBonusAmount: 2000,
  baseSalary: 60000,
  gracePeriodMinutes: 15,
  absenceThresholdHours: 2
};

const ensureDefaults = async () => {
  for (const [key, value] of Object.entries(defaultSettings)) {
    await SystemSetting.findOrCreate({
      where: { key },
      defaults: { key, value }
    });
  }
};

const getSystemSettings = async (req, res) => {
  try {
    await ensureDefaults();
    const settings = await SystemSetting.findAll({ order: [['key', 'ASC']] });
    const normalized = settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {});

    res.json({ ...defaultSettings, ...normalized });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateSystemSettings = async (req, res) => {
  try {
    await ensureDefaults();

    for (const [key, value] of Object.entries(req.body)) {
      await SystemSetting.upsert({ key, value });
    }

    const settings = await SystemSetting.findAll({ order: [['key', 'ASC']] });
    const normalized = settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {});

    res.json({ ...defaultSettings, ...normalized });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getSystemSettings,
  updateSystemSettings
};
