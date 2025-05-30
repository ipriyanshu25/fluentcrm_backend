const nodemailer = require('nodemailer');
const ActivityList = require('../models/activityList');
const MailDescription = require('../models/mailDescription');
const Campaign = require('../models/campaign');
const SmtpCredential = require('../models/smtpCredentials');
const Marketer = require('../models/marketer');
const { v4: uuidv4 } = require('uuid');

// controllers/mailController.js (updated sendMailToList)
exports.sendMailToList = async (req, res) => {
  try {
    const { activityId, subject, description, marketerId } = req.body;
    if (!activityId || !subject || !description || !marketerId) {
      return res.status(400).json({
        status: 'error',
        message: 'activityId, subject, description, and marketerId are all required.'
      });
    }

    // 1) Load marketer to get from address and SMTP settings
    const marketer = await Marketer.findOne({ marketerId });
    if (!marketer || !marketer.user) {
      return res.status(400).json({
        status: 'error',
        message: 'Marketer not found or no SMTP user assigned.'
      });
    }
    const fromAddress = marketer.user;
    const displayName = marketer.name;

    // 2) Fetch SMTP cred and decrypt password
    const smtpCred = await SmtpCredential.findOne({ credentialID: marketer.smtpCredentialId });
    if (!smtpCred) {
      return res.status(400).json({
        status: 'error',
        message: `No SMTP cred assigned to marketer ${marketerId}`
      });
    }
    const realPass = smtpCred.getPassword();

    // 3) Fetch recipients
    const list = await ActivityList.findOne({ activityId });
    if (!list) {
      return res.status(404).json({ status: 'error', message: 'Activity list not found.' });
    }
    const emails = list.contacts.map(c => c.email).filter(Boolean);
    if (!emails.length) {
      return res.status(400).json({ status: 'error', message: 'No contacts to email.' });
    }

    // 4) Create transporter
    const port   = marketer.smtpPort  ?? marketer.port;
    const secure = marketer.smtpSecure ?? marketer.secure;
    const isSSL  = port === 465;

    const transporter = nodemailer.createTransport({
      host:       smtpCred.host,
      port : smtpCred.port,
      secure:     smtpCred.secure,
      auth:       { user: fromAddress, pass: realPass },
      requireTLS: !smtpCred.secure,
      tls:        { rejectUnauthorized: false }
    });

    // 5) Send mail
    const info = await transporter.sendMail({
      from:    `"${displayName}" <${fromAddress}>`,
      bcc:     emails,
      subject,
      text:    description
    });
    console.log('✉️ Sent %s via %s', info.messageId, fromAddress);

    // 6) Save description & record campaign
    const mailDesc = await new MailDescription({ activityId, description }).save();
    await ActivityList.updateOne({ activityId }, { mailSent: 1 });
    await Campaign.create({
      activityId,
      marketerId,
      marketerName:  marketer.name,
      activityName:  list.name,
      contacts:      list.contacts,
      subject,
      description,
      from:          fromAddress,
      messageId:     info.messageId,
      sentAt:        new Date()
    });

    return res.json({
      status:  'success',
      message: `Sent to ${emails.length} contacts from ${fromAddress}`,
      data:    { descriptionId: mailDesc.descriptionId, messageId: info.messageId }
    });
  } catch (err) {
    console.error('Error in sendMailToList:', err);
    return res.status(500).json({ status: 'error', message: 'Server error.' });
  }
};


exports.getMailDescription = async (req, res) => {
  try {
    const { activityId, descriptionId } = req.body;
    if (!activityId || !descriptionId) {
      return res.status(400).json({ status: 'error', message: 'activityId and descriptionId are required.' });
    }
    const mailDesc = await MailDescription.findOne({ activityId, descriptionId });
    if (!mailDesc) {
      return res.status(404).json({ status: 'error', message: 'Description not found.' });
    }
    return res.json({ status: 'success', description: mailDesc.description });
  } catch (err) {
    console.error('Error fetching description:', err);
    return res.status(500).json({ status: 'error', message: 'Server error.' });
  }
};

exports.getMailDescriptionList = async (req, res) => {
  try {
    const { activityId } = req.query;
    if (!activityId) {
      return res.status(400).json({ status: 'error', message: 'activityId is required.' });
    }
    const descriptions = await MailDescription.find({ activityId })
      .sort({ createdAt: -1 })
      .select('descriptionId description createdAt updatedAt')
      .lean();
    return res.json({ status: 'success', data: descriptions });
  } catch (err) {
    console.error('Error fetching descriptions:', err);
    return res.status(500).json({ status: 'error', message: 'Server error.' });
  }
};
