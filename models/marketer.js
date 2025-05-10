// models/Marketer.js
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const marketerSchema = new mongoose.Schema(
  {
    marketerId: {
      type    : String,
      unique  : true,
      default : () => new mongoose.Types.ObjectId().toString()
    },
    name: {
      type     : String,
      required : true,
      trim     : true
    },
    email: {
      type     : String,
      required : true,
      unique   : true,
      lowercase: true,
      trim     : true
    },
    phoneNumber: {
      type     : String,
      required : true,
      trim     : true
    },
    role: {
      type     : String,
      required : true,
      enum     : ['marketer'],  // extendable if needed
      default  : 'marketer'
    },
    password: {
      type     : String,
      required : true
    },
    isVerified: {
      type    : Boolean,
      default : false        // pending approval
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