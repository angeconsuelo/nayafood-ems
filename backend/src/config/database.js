const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');

dotenv.config();

const parseBoolean = (value) => ['true', '1', 'yes'].includes(String(value || '').toLowerCase());

const databaseUrl =
  process.env.DATABASE_URL ||
  process.env.MYSQL_URL ||
  process.env.MYSQL_PUBLIC_URL ||
  process.env.DATABASE_PUBLIC_URL ||
  '';

const baseConfig = {
  dialect: 'mysql',
  logging: false,
  dialectOptions: {}
};

if (parseBoolean(process.env.DB_SSL)) {
  baseConfig.dialectOptions.ssl = {
    require: true,
    rejectUnauthorized: false
  };
}

let sequelize;

if (databaseUrl) {
  sequelize = new Sequelize(databaseUrl, baseConfig);
} else {
  sequelize = new Sequelize(
    process.env.DB_NAME || process.env.MYSQLDATABASE,
    process.env.DB_USER || process.env.MYSQLUSER,
    process.env.DB_PASSWORD || process.env.MYSQLPASSWORD,
    {
      ...baseConfig,
      host: process.env.DB_HOST || process.env.MYSQLHOST,
      port: process.env.DB_PORT || process.env.MYSQLPORT || 3306
    }
  );
}

const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
  } catch (error) {
    console.error('Unable to connect to database:', error);
  }
};

module.exports = { sequelize, testConnection };
