const express = require('express');
const router  = express.Router();
const { saveCredentials,updateCredentials,deleteCredentials ,getCredentialsList,getAllCredentials} = require('../controller/smtpController');

// Protect this route with authentication middleware
router.post('/smtpcredentials',saveCredentials);
router.post('/updateCredentials',updateCredentials);
router.post('/deleteCredentials',deleteCredentials);
router.post('/getCredentialsList',getCredentialsList);
router.get('/getAll',getAllCredentials);

module.exports = router;