const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const { Schema } = mongoose;

const campaignSchema = new Schema({
  campaignId: {
    type: String,
    required: true,
    unique: true,
    default: uuidv4
  },
  activityId: {
    type: String,
    required: true,
    trim: true
  },
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
  activityName: {
    type: String,
    required: true,
    trim: true
  },
  contacts: {
    type: [{ name: String, email: String }],
    default: []
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  sentAt: {
    type: Date,
    default: () => new Date()
  }
}, { timestamps: true });

module.exports = mongoose.model('Campaign', campaignSchema);
