const express            = require('express');
const { sendMailToList,getMailDescription} = require('../controller/mailController');
const router             = express.Router();


router.post('/send', sendMailToList);
router.post('/discription',getMailDescription);

module.exports = router;