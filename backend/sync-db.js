const { sequelize } = require('./src/config/database');
const models = require('./src/models');
const bcrypt = require('bcryptjs');

const syncDatabase = async () => {
  try {
    console.log('Testing connection...');
    await sequelize.authenticate();
    console.log('✅ Database connected!');

    console.log('Syncing all models...');
    await sequelize.sync({ alter: true });
    console.log('✅ All tables synced!');

    // Create default production lines
    const { ProductionLine, User } = models;
    
    const lines = await ProductionLine.findAll();
    if (lines.length === 0) {
      await ProductionLine.bulkCreate([
        { name: 'Biscuit Line 1', productType: 'biscuit' },
        { name: 'Milk Line', productType: 'milk' },
        { name: 'Candy Line', productType: 'candy' }
      ]);
      console.log('✅ Default production lines created');
    }
// Après la création des production lines, ajoutez :

// Create default shifts
const { Shift } = models;
const shifts = await Shift.findAll();
if (shifts.length === 0) {
  await Shift.bulkCreate([
    { name: 'morning', startTime: '07:00', endTime: '15:00', nightBonusAmount: 0 },
    { name: 'afternoon', startTime: '15:00', endTime: '23:00', nightBonusAmount: 0 },
    { name: 'night', startTime: '23:00', endTime: '07:00', nightBonusAmount: 500 },
    { name: 'saturday_cleaning', startTime: '07:00', endTime: '15:00', nightBonusAmount: 0 }
  ]);
  console.log('✅ Default shifts created');
}

    // Check if admin exists
    const admin = await User.findOne({ where: { role: 'director' } });
    if (!admin) {
      console.log('Creating admin user...');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await User.create({
        email: 'admin@nayafood.com',
        password: hashedPassword,
        role: 'director',
        firstName: 'Super',
        lastName: 'Admin'
      });
      console.log('✅ Admin user created');
    } else {
      console.log('✅ Admin user already exists');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  } finally {
    await sequelize.close();
    process.exit();
  }
};

syncDatabase();