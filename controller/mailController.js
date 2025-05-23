const nodemailer = require('nodemailer');
const ActivityList = require('../models/activityList');
const MailDescription = require('../models/mailDescription');
const Campaign = require('../models/campaign');
const SmtpCredential = require('../models/smtpCredentials');

exports.sendMailToList = async (req, res) => {
  try {
    const { activityId, subject, description, from } = req.body;
    if (!activityId || !subject || !description || !from) {
      return res.status(400).json({ status: 'error', message: 'activityId, subject, description, and from are all required.' });
    }

    // Parse and validate from header
    const match = from.match(/^(.+) <(.+@.+)>$/);
    if (!match) {
      return res.status(400).json({ status: 'error', message: '`from` must be in the format "Name <email@domain.com>"' });
    }
    const [, displayName, fromAddress] = match;

    // Fetch SMTP cred from DB
    const smtpCred = await SmtpCredential.findOne({ user: fromAddress });
    if (!smtpCred) {
      return res.status(400).json({ status: 'error', message: `No SMTP cred for ${fromAddress}` });
    }
    const realPass = smtpCred.getPassword();

    // Fetch recipients
    const list = await ActivityList.findOne({ activityId });
    if (!list) {
      return res.status(404).json({ status: 'error', message: 'Activity list not found.' });
    }
    const emails = list.contacts.map(c => c.email);
    if (!emails.length) {
      return res.status(400).json({ status: 'error', message: 'No contacts to email.' });
    }

    // Create dynamic transporter
    const transporter = nodemailer.createTransport({
      host: smtpCred.host,
      port: smtpCred.port,
      secure: smtpCred.secure,
      auth: {
        user: smtpCred.user,
        pass: realPass
      },
      requireTLS: true,
      tls: { rejectUnauthorized: false }
    });

    // Send mail
    const info = await transporter.sendMail({
      envelope: { from: fromAddress, to: emails },
      from: fromAddress,
      bcc: emails,
      subject: subject,
      text: description
    });

    console.log('✉️ Sent %s via %s', info.messageId, fromAddress);

    // Save description
    const mailDesc = new MailDescription({ activityId, description });
    await mailDesc.save();

    // Update list
    await ActivityList.updateOne({ activityId }, { mailSent: 1 });

    // Record campaign
    await Campaign.create({
      activityId,
      marketerId: list.marketerId,
      marketerName: list.marketerName,
      activityName: list.name,
      contacts: list.contacts,
      subject,
      description,
      from,
      messageId: info.messageId,
      sentAt: new Date()
    });

    return res.json({ status: 'success', message: `Sent to ${emails.length} contacts from ${from}`, data: { descriptionId: mailDesc.descriptionId, messageId: info.messageId } });
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
