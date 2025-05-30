const mongoose = require('mongoose')
const { v4: uuidv4 } = require('uuid') // use uuid for unique string IDs

const templateSchema = new mongoose.Schema(
  {
    templateId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      default: uuidv4
    },
    subject: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
)

// Auto-generate templateId before saving
templateSchema.pre('save', function (next) {
  if (!this.templateId) {
    const timestamp = Date.now().toString(36)
    const randomStr = Math.random().toString(36).substring(2, 6)
    this.templateId = `tmpl_${timestamp}_${randomStr}`
  }
  next()
})

module.exports = mongoose.model('Template', templateSchema)