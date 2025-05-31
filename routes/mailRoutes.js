const express            = require('express');
const { sendMailToList,getMailDescription, getMailDescriptionList} = require('../controller/mailController');
const{getCampaigns,getCampaignById,getCampaignsByMarketer} = require('../controller/campaingController');
const router             = express.Router();


router.post('/send', sendMailToList);
router.post('/description',getMailDescription);
router.get('/description/list', getMailDescriptionList);
router.get('/getcampaigns', getCampaigns);
router.post('/getcampaignbyid',getCampaignById);
router.post('/getcampaignsbymarketer', getCampaignsByMarketer);
module.exports = router;