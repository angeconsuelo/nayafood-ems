const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const { sequelize } = require('./src/config/database');
const models = require('./src/models');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const authRoutes = require('./src/routes/authRoutes');
const employeeRoutes = require('./src/routes/employeeRoutes');
const shiftRoutes = require('./src/routes/shiftRoutes');
const attendanceRoutes = require('./src/routes/attendanceRoutes');
const leaveRoutes = require('./src/routes/leaveRoutes');
const recruitmentRoutes = require('./src/routes/recruitmentRoutes');
const trainingRoutes = require('./src/routes/trainingRoutes');
const masterDataRoutes = require('./src/routes/masterDataRoutes');
const complaintRoutes = require('./src/routes/complaintRoutes');
const systemSettingsRoutes = require('./src/routes/systemSettingsRoutes');
const userManagementRoutes = require('./src/routes/userManagementRoutes');
const productionRoutes = require('./src/routes/productionRoutes');
const conversionRecommendationRoutes = require('./src/routes/conversionRecommendationRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/recruitment', recruitmentRoutes);
app.use('/api/training', trainingRoutes);
app.use('/api/master-data', masterDataRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/system-settings', systemSettingsRoutes);
app.use('/api/users', userManagementRoutes);
app.use('/api/production', productionRoutes);
app.use('/api/conversion-recommendations', conversionRecommendationRoutes);

app.get('/api/test', (req, res) => {
  res.json({ message: 'NayaFood EMS API is running!' });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await sequelize.authenticate();

    // Only create the new standalone tables here.
    // Avoid syncing the full legacy schema graph because existing FK drift can break startup.
    await Promise.all([
      models.Complaint.sync(),
      models.SystemSetting.sync(),
      models.ConversionRecommendation.sync()
    ]);

    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
  }
};

startServer();
