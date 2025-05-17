// controllers/campaignController.js
const Campaign = require('../models/campaign');

exports.getCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign
      .find()
      .sort({ sentAt: -1 });  // newest first

    return res.json({
      status:  'success',
      message: `Fetched ${campaigns.length} campaign(s).`,
      data:    campaigns
    });
  } catch (err) {
    console.error('Error fetching campaigns:', err);
    return res.status(500).json({
      status:  'error',
      message: 'Server error'
    });
  }
};


exports.getCampaignById = async (req, res) => {
  try {
    const { campaignId } = req.body;
    if (!campaignId) {
      return res.status(400).json({
        status:  'error',
        message: '`campaignId` is required in the request body.'
      });
    }

    const campaign = await Campaign.findOne({ campaignId });
    if (!campaign) {
      return res.status(404).json({
        status:  'error',
        message: `No campaign found with ID ${campaignId}.`
      });
    }

    return res.json({
      status:  'success',
      message: `Fetched campaign ${campaignId}.`,
      data:    campaign
    });
  } catch (err) {
    console.error('Error fetching campaign by ID:', err);
    return res.status(500).json({
      status:  'error',
      message: 'Server error'
    });
  }
};