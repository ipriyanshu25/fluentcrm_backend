// controllers/smtpCredentialsController.js
const SmtpCredential = require('../models/smtpCredentials');

exports.saveCredentials = async (req, res) => {
  const { user, host, port, secure, pass } = req.body;

  if (!user || !host || !port || pass == null) {
    return res.status(400).json({
      status: 'error',
      message: 'user, host, port, and pass are required.'
    });
  }

  let cred = await SmtpCredential.findOne({ user });
  if (!cred) {
    cred = new SmtpCredential({ user, host, port, secure: !!secure });
  } else {
    // allow updating host/port/secure if needed
    cred.host   = host;
    cred.port   = port;
    cred.secure = !!secure;
  }

  cred.setPassword(pass);
  await cred.save();

  return res.json({
    status: 'success',
    message: `Stored SMTP cred for ${user}`
  });
};




exports.updateCredentials = async (req, res) => {
  const { user, host, port, secure, pass } = req.body;
  if (!user) {
    return res.status(400).json({
      status: 'error',
      message: 'user is required.'
    });
  }

  const cred = await SmtpCredential.findOne({ user });
  if (!cred) {
    return res.status(404).json({
      status: 'error',
      message: `No SMTP cred found for ${user}`
    });
  }

  // Only update fields if provided
  if (host)   cred.host   = host;
  if (port)   cred.port   = port;
  if (secure != null) cred.secure = !!secure;
  if (pass)   cred.setPassword(pass);

  await cred.save();
  return res.json({
    status: 'success',
    message: `Updated SMTP cred for ${user}`
  });
};

exports.deleteCredentials = async (req, res) => {
  const { user } = req.body;
  if (!user) {
    return res.status(400).json({
      status: 'error',
      message: 'user is required.'
    });
  }

  const result = await SmtpCredential.findOneAndDelete({ user });
  if (!result) {
    return res.status(404).json({
      status: 'error',
      message: `No SMTP cred found for ${user}`
    });
  }

  return res.json({
    status: 'success',
    message: `Deleted SMTP cred for ${user}`
  });
};



exports.getCredentialsList = async (req, res) => {
  try {
    // pull pagination params from body, with sane defaults
    let { page = 1, limit = 10 } = req.body;
    page  = Math.max(parseInt(page,  10) || 1,  1);
    limit = Math.max(parseInt(limit, 10) || 10, 1);

    const skip = (page - 1) * limit;

    // run both count and fetch in parallel
    const [ total, creds ] = await Promise.all([
      SmtpCredential.countDocuments(),
      SmtpCredential.find({}, '-passEnc')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
    ]);

    const totalPages = Math.ceil(total / limit);

    return res.json({
      status: 'success',
      data: {
        total,
        page,
        limit,
        totalPages,
        items: creds
      }
    });
  } catch (err) {
    console.error('Error fetching paginated SMTP credentials:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Server error.'
    });
  }
};