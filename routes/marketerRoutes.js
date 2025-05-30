const express = require('express');
const { register, login,getMarketerById,deleteMarketer} = require('../controller/marketerController');
const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/:marketerId', getMarketerById);
router.post('/delete', deleteMarketer);

module.exports = router;
