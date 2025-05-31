const express = require('express');
const { register, login,getMarketerById,deleteMarketer,updateMarketer,getMarketerDashboard} = require('../controller/marketerController');
const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/:marketerId', getMarketerById);
router.post('/delete', deleteMarketer);
router.post('/update', updateMarketer);
router.get('/dashboard', getMarketerDashboard);

module.exports = router;
