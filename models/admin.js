// models/Admin.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid'); // use uuid for unique string IDs
// ✨  no need for nanoid if you only want ObjectId-style strings

const adminSchema = new mongoose.Schema(
  {
    // use a second ObjectId purely as a string
    adminId: {
      type: String,
      required: true,
      unique: true,
      default: uuidv4
    },

    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },

    password: { type: String, required: true }
  },
  { timestamps: true }
);


// hash pw on save
adminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

adminSchema.methods.matchPassword = function (pw) {
  return bcrypt.compare(pw, this.password);
};

module.exports = mongoose.model('Admin', adminSchema);
