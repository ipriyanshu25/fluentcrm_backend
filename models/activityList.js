// models/activityList.js
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const { Schema } = mongoose;

const contactSubSchema = new Schema({
  contactId: {
    type: String,
    required: true,
    unique: true,
    default: uuidv4
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true
  }
}, { _id: false });

const activityListSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  activityId: {
    type: String,
    required: true,
    unique: true,
    default: uuidv4
  },
  // ← NEW: who created this list
  marketerId: {
    type: String,
    required: true,
    trim: true
  },
  marketerName: {
    type: String,
    required: true,
    trim: true
  },
  contacts: {
    type: [contactSubSchema],
    default: []
  },
  // ← NEW: 0 = mail not sent yet, 1 = mail sent successfully
  mailSent: {
    type: Number,
    enum: [0,1],
    default: 0
  }
}, { timestamps: true });

module.exports = mongoose.model('ActivityList', activityListSchema);
