const express = require('express')
const router = express.Router()
const {
  createTemplate,
  listTemplates,
  updateTemplate,
  deleteTemplate
} = require('../controller/templateControler')

// Routes
router.post('/create', createTemplate)
router.get('/list', listTemplates)
router.post('/update', updateTemplate)
router.post('/delete', deleteTemplate)

module.exports = router