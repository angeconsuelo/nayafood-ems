const { Complaint, Employee, User } = require('../models');

const complaintIncludes = [
  {
    model: Employee,
    as: 'employee',
    attributes: ['id', 'employeeCode', 'firstName', 'lastName']
  },
  {
    model: User,
    as: 'user',
    attributes: ['id', 'email', 'firstName', 'lastName', 'role']
  }
];

const getMyComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.findAll({
      where: { userId: req.user.id },
      include: complaintIncludes,
      order: [['created_at', 'DESC']]
    });

    res.json(complaints);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAllComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.findAll({
      include: complaintIncludes,
      order: [['created_at', 'DESC']]
    });

    res.json(complaints);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createComplaint = async (req, res) => {
  try {
    const { subject, message, category } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ message: 'Subject and message are required' });
    }

    const employee = await Employee.findOne({ where: { userId: req.user.id } });

    const complaint = await Complaint.create({
      userId: req.user.id,
      employeeId: employee?.id || null,
      subject,
      message,
      category: category || 'general',
      status: 'submitted'
    });

    const created = await Complaint.findByPk(complaint.id, {
      include: complaintIncludes
    });

    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllComplaints,
  getMyComplaints,
  createComplaint
};
