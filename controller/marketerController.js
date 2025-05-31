const Marketer = require('../models/marketer');
const ActivityList = require('../models/activityList');
const Campaign = require('../models/campaign');
const bcrypt   = require('bcryptjs');
const jwt       = require('jsonwebtoken');

// MARKETER SIGNUP ▶ creates a pending request
exports.register = async (req, res) => {
  try {
    const { name, email, phoneNumber, role, password } = req.body;
    if (!name || !email || !phoneNumber || !role || !password) {
      return res.status(400).json({
        status:  'error',
        message: 'All fields are required'
      });
    }

    const normalizedEmail = email.toLowerCase();

    // look for existing by email OR phoneNumber
    const existing = await Marketer.findOne({
      $or: [
        { email: normalizedEmail },
        { phoneNumber }
      ]
    });

    if (existing) {
      return res.status(409).json({
        status:  'error',
        message: existing.email === normalizedEmail
          ? 'Email already in use'
          : 'Phone number already in use'
      });
    }

    // create as not verified, including password for hashing
    const newMarketer = await Marketer.create({
      name,
      email:       normalizedEmail,
      phoneNumber,
      role,
      password     
    });

    return res.status(201).json({
      status:  'pending',
      message: 'Signup request submitted; pending admin approval',
      data: {
        marketerId:   newMarketer.marketerId,
        name:         newMarketer.name,
        email:        newMarketer.email,
        phoneNumber:  newMarketer.phoneNumber,
        role:         newMarketer.role
      }
    });
  } catch (err) {
    console.error('Marketer signup error:', err);
    return res.status(500).json({
      status:  'error',
      message: 'Server error'
    });
  }
};

// MARKETER LOGIN ▶ only if verified
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Email and password are required'
      });
    }

    const normalizedEmail = email.toLowerCase();
    const marketer = await Marketer.findOne({ email: normalizedEmail });
    if (!marketer || !(await marketer.matchPassword(password))) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }

    if (!marketer.status) {
      return res.status(403).json({
        status: 'error',
        message: 'Account not verified by admin'
      });
    }

    const payload = {
      _id:         marketer._id,
      marketerId:  marketer.marketerId,
      email:       normalizedEmail,
      role:        marketer.role
    };
    const expiresIn = process.env.JWT_EXPIRES_MARKETER || '90d';
    const token     = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });

    return res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: {
        token,
        marketerId: marketer.marketerId,
        email: normalizedEmail,
        role: marketer.role
      }
    });
  } catch (err) {
    console.error('Marketer login error:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
};


exports.getMarketerById = async (req, res) => {
  try {
    const { marketerId } = req.params;
    if (!marketerId) {
      return res.status(400).json({
        status:  'error',
        message: 'marketerId is required'
      });
    }

    // find by your unique marketerId field
    const marketer = await Marketer.findOne({ marketerId })
      .select('-password -__v');  // hide sensitive/internal fields

    if (!marketer) {
      return res.status(404).json({
        status:  'error',
        message: 'Marketer not found'
      });
    }

    return res.status(200).json({
      status: 'success',
      data:   marketer
    });
  } catch (err) {
    console.error('Error fetching marketer:', err);
    return res.status(500).json({
      status:  'error',
      message: 'Server error'
    });
  }
};

exports.deleteMarketer = async (req, res) => {
  try {
    const { marketerId } = req.body;              // ← read from body now
    if (!marketerId) {
      return res.status(400).json({
        status:  'error',
        message: 'marketerId is required in the body'
      });
    }

    const removed = await Marketer.findOneAndDelete({ marketerId });
    if (!removed) {
      return res.status(404).json({
        status:  'error',
        message: `No marketer found with id ${marketerId}`
      });
    }

    return res.status(200).json({
      status:  'success',
      message: `Marketer ${marketerId} deleted`
    });
  } catch (err) {
    console.error('Error deleting marketer:', err);
    return res.status(500).json({
      status:  'error',
      message: 'Server error'
    });
  }
};


exports.updateMarketer = async (req, res) => {
  try {
    const { marketerId, name, email, phoneNumber, password } = req.body;

    // 1) Must supply marketerId
    if (!marketerId) {
      return res.status(400).json({
        status:  'error',
        message: 'marketerId is required'
      });
    }

    // 2) Fetch existing marketer
    const marketer = await Marketer.findOne({ marketerId });
    if (!marketer) {
      return res.status(404).json({
        status:  'error',
        message: `No marketer found with id ${marketerId}`
      });
    }

    // 3) If updating email, ensure unique
    if (email && email.toLowerCase() !== marketer.email) {
      const normalizedEmail = email.toLowerCase();
      const conflict = await Marketer.findOne({
        email: normalizedEmail,
        _id:   { $ne: marketer._id }
      });
      if (conflict) {
        return res.status(409).json({
          status:  'error',
          message: 'Email already in use by another marketer'
        });
      }
      marketer.email = normalizedEmail;
    }

    // 4) If updating phoneNumber, ensure unique
    if (phoneNumber && phoneNumber !== marketer.phoneNumber) {
      const conflict = await Marketer.findOne({
        phoneNumber,
        _id:         { $ne: marketer._id }
      });
      if (conflict) {
        return res.status(409).json({
          status:  'error',
          message: 'Phone number already in use by another marketer'
        });
      }
      marketer.phoneNumber = phoneNumber;
    }

    // 5) Update name if provided
    if (name) {
      marketer.name = name.trim();
    }

    // 6) Update password if provided (hash it)
    if (password) {
      const salt = await bcrypt.genSalt(12);
      marketer.password = await bcrypt.hash(password, salt);
    }

    // 7) Save and return updated marketer (excluding password + __v)
    const updated = await marketer.save();
    const { password: _pw, __v, ...payload } = updated.toObject();

    return res.status(200).json({
      status:  'success',
      message: 'Marketer updated successfully',
      data:    payload
    });
  } catch (err) {
    console.error('Error updating marketer:', err);
    return res.status(500).json({
      status:  'error',
      message: 'Server error'
    });
  }
};

exports.getMarketerDashboard = async (req, res) => {
  try {
    const { marketerId } = req.params; // read from URL params
    if (!marketerId) {
      return res.status(400).json({
        status:  'error',
        message: '`marketerId` is required in the request body.'
      });
    }

    // Ensure the marketer exists
    const marketer = await Marketer.findOne({ marketerId });
    if (!marketer) {
      return res.status(404).json({
        status:  'error',
        message: `No marketer found with id ${marketerId}.`
      });
    }

    // Count activities created by this marketer
    const totalActivity = await ActivityList.countDocuments({ marketerId });

    // Count campaigns sent by this marketer
    const totalCampaigns = await Campaign.countDocuments({ marketerId });

    return res.json({
      status: 'success',
      data: {
        name:marketer.name,
        totalActivity,
        totalCampaigns
      }
    });
  } catch (err) {
    console.error('Error fetching marketer dashboard:', err);
    return res.status(500).json({
      status:  'error',
      message: 'Server error'
    });
  }
};