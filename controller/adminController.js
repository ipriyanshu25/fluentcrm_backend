const Admin  = require('../models/admin');
const jwt    = require('jsonwebtoken');
const Marketer = require('../models/marketer');

exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: 'Both fields are required' });

  const admin = await Admin.findOne({ email: email.toLowerCase() });
  if (!admin || !(await admin.matchPassword(password)))
    return res.status(401).json({ message: 'Invalid credentials' });

  const token = jwt.sign(
    { _id: admin._id, adminId: admin.adminId, email: admin.email },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
  res.json({ token, adminId: admin.adminId });
};



exports.listMarketerRequests = async (req, res) => {
  try {
    const requests = await Marketer
      .find({ isVerified: false })
      .sort({ createdAt: -1 })
      .select('-password -__v')
      .select('-_id -__v');

    return res.json({
      status:  'success',
      message: 'Pending marketer signup requests',
      data:    requests
    });
  } catch (err) {
    console.error('Error listing marketer requests:', err);
    return res.status(500).json({
      status:  'error',
      message: 'Server error'
    });
  }
};


exports.updateMarketerVerification = async (req, res) => {
  try {
    const { marketerId } = req.params;
    const { isVerified } = req.body;

    if (typeof isVerified !== 'boolean') {
      return res.status(400).json({
        status:  'error',
        message: '`isVerified` must be true or false'
      });
    }

    const marketer = await Marketer.findOneAndUpdate(
      { marketerId },
      { isVerified },
      { new: true }
    );

    if (!marketer) {
      return res.status(404).json({
        status:  'error',
        message: 'Marketer not found'
      });
    }

    return res.json({
      status:  'success',
      message: `Marketer ${isVerified ? 'approved' : 'rejected'}`,
      data:    { marketerId, isVerified }
    });
  } catch (err) {
    console.error('Error updating marketer verification:', err);
    return res.status(500).json({
      status:  'error',
      message: 'Server error'
    });
  }
};