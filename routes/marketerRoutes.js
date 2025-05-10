const express = require('express');
const { register, login,listVerifiedMarketers} = require('../controller/marketerController');
const router = express.Router();

router.post('/signup', register);
router.post('/login', login);
router.get('/verified', listVerifiedMarketers);


module.exports = router;
