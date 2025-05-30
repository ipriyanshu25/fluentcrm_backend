// models/marketer.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { Schema } = mongoose;

const marketerSchema = new Schema(
  {
    marketerId: {
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
      unique: true,
      lowercase: true,
      trim: true
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true
    },
    role: {
      type: String,
      required: true,
      enum: ['Marketer', 'marketer'],
      default: 'Marketer'
    },
    password: {
      type: String,
      required: true
    },
    // overall signup status: 0 = pending, 1 = approved, 2 = rejected
    status: {
      type: Number,
      enum: [0, 1, 2],
      default: 0
    },
    // Assigned SMTP credential info
    smtpCredentialId: {
      type: String,
      trim: true,
      default: null
    },
    user: {
      type: String,
      trim: true,
      default: null
    },
    port: {
      type: Number,
      default: null
    },
    secure: {
      type: Boolean,
      default: null
    }
  },
  { timestamps: true }
);

// Hash password before saving
marketerSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare plaintext password
marketerSchema.methods.matchPassword = function (pw) {
  return bcrypt.compare(pw, this.password);
};

module.exports = mongoose.model('Marketer', marketerSchema);
