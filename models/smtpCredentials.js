// models/SmtpCredential.js
const mongoose = require('mongoose');
const crypto   = require('crypto');

// Use a symmetric key to encrypt SMTP passwords
const ENC_KEY = process.env.SMTP_ENC_KEY; // 32-byte base64
const IV_LEN  = 16;

function encrypt(text) {
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    Buffer.from(ENC_KEY, 'base64'),
    iv
  );
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return iv.toString('base64') + ':' + encrypted;
}

function decrypt(encrypted) {
  const [ivB64, data] = encrypted.split(':');
  const iv = Buffer.from(ivB64, 'base64');
  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    Buffer.from(ENC_KEY, 'base64'),
    iv
  );
  let decrypted = decipher.update(data, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

const smtpCredSchema = new mongoose.Schema({
  user:      { type: String, required: true, unique: true },    // e.g. "devans@immplus.in"
  host:      { type: String, required: true },                  // e.g. "smtp.immplus.in"
  port:      { type: Number, required: true },                  // e.g. 587
  secure:    { type: Boolean, default: false },                 // true if 465/TLS, false if 587/STARTTLS
  passEnc:   { type: String, required: true },                  // encrypted password
  createdAt: { type: Date, default: Date.now }
});

// setter: encrypt & store
smtpCredSchema.methods.setPassword = function(rawPass) {
  this.passEnc = encrypt(rawPass);
};

// getter: decrypt on‐the‐fly
smtpCredSchema.methods.getPassword = function() {
  return decrypt(this.passEnc);
};

module.exports = mongoose.model('SmtpCredential', smtpCredSchema);
