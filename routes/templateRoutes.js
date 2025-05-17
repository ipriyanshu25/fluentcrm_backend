const express = require('express')
const router = express.Router()
const {
  createTemplate,
  listTemplates,
} = require('../controller/templateControler')

// Routes
router.post('/create', createTemplate)
router.get('/list', listTemplates)

module.exports = router