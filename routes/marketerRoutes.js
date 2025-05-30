const express = require('express');
const { register, login,getMarketerById} = require('../controller/marketerController');
const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/:marketerId', getMarketerById);


module.exports = router;
