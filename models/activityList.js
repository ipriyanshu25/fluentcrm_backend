const mongoose = require('mongoose');
const { Schema } = mongoose;
const contactSubSchema = new Schema({
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
    unique: true,
    trim: true,
  },
  activityId: {
     type    : String,
      unique  : true,
      default : () => new mongoose.Types.ObjectId().toString()
  },
  contacts: {
    type: [contactSubSchema],
    default: []
  }
}, { timestamps: true });
activityListSchema.index({ name: 1 }, { unique: true });
module.exports = mongoose.model('ActivityList', activityListSchema);