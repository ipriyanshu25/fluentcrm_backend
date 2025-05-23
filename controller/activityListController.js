// controllers/activityListController.js


const fs = require('fs');
const csv = require('csv-parser');
const mongoose = require('mongoose');
const path     = require('path');
const xlsx     = require('xlsx');
const validator    = require('validator');
const ActivityList = require('../models/activityList');
const Marketer = require('../models/marketer');
const Contact = require('../models/contact');

exports.createActivityList = async (req, res) => {
  try {
    const { name, marketerId } = req.body;
    if (!name || !marketerId) {
      return res.status(400).json({
        status: 'error',
        message: '`name` and `marketerId` are both required.'
      });
    }

    // ensure the marketer exists
    const marketer = await Marketer.findOne({ marketerId });
    if (!marketer) {
      return res.status(404).json({
        status: 'error',
        message: 'No marketer found with that marketerId.'
      });
    }

    // create, auto-populating marketerName
    const newList = new ActivityList({
      name,
      marketerId,
      marketerName: marketer.name
    });
    await newList.save();

    return res.status(201).json({
      status: 'success',
      message: 'Activity list created successfully.',
      data: newList
    });
  } catch (err) {
    console.error('Error creating activity list:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
};


exports.getAllActivityLists = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortField = 'createdAt',
      sortOrder = 'desc',
      search = ''
    } = req.body;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build filter
    const searchRegex = new RegExp(search, 'i');
    const filter = {
      $or: [
        { name: searchRegex },
        { marketerName: searchRegex }
      ]
    };

    // Total matching documents
    const total = await ActivityList.countDocuments(search ? filter : {});
    const totalPages = Math.ceil(total / limitNum);

    // Fetch filtered, sorted, paginated data
    const lists = await ActivityList.find(search ? filter : {})
      .sort({ [sortField]: sortOrder === 'asc' ? 1 : -1 })
      .skip(skip)
      .limit(limitNum);

    return res.json({
      status: 'success',
      message: 'Fetched activity lists',
      data: lists,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages
      }
    });
  } catch (err) {
    console.error('Error fetching activity lists:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
};


exports.uploadContacts = async (req, res) => {
  try {
    const { activityId } = req.body;
    const list = await ActivityList.findOne({ activityId });
    if (!list) {
      return res.status(404).json({ status: 'error', message: 'Activity list not found' });
    }
    if (!req.file) {
      return res.status(400).json({ status: 'error', message: 'CSV or Excel file is required' });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    const existingEmails = new Set(
      list.contacts
        .map(c => c.email?.toLowerCase())
        .filter(Boolean)
    );

    const newContacts      = [];
    let skippedEmpty       = 0;
    let skippedDuplicate   = 0;
    let skippedInvalidEmail = 0;

    const processRow = ({ name, email }) => {
      const nameTrim  = (name  || '').toString().trim();
      const emailTrim = (email || '').toString().trim().toLowerCase();

      // 1) skip empty rows
      if (!nameTrim && !emailTrim) {
        skippedEmpty++;
        return;
      }

      // 2) if email present but invalid, skip
      if (emailTrim && !validator.isEmail(emailTrim)) {
        skippedInvalidEmail++;
        return;
      }

      // 3) skip duplicates by email
      if (emailTrim && existingEmails.has(emailTrim)) {
        skippedDuplicate++;
        return;
      }

      // accept the row
      if (emailTrim) existingEmails.add(emailTrim);
      newContacts.push({
        contactId: new mongoose.Types.ObjectId().toString(),
        name:  nameTrim,
        email: emailTrim
      });
    };

    // ── CSV branch ─────────────────────────────────────
    if (ext === '.csv') {
      return fs.createReadStream(req.file.path)
        .pipe(csv({ headers: ['name', 'email'], skipLines: 0 }))
        .on('data', processRow)
        .on('end', async () => {
          if (newContacts.length === 0) {
            return res.status(400).json({
              status: 'error',
              message: 'No valid new contacts found (all rows were empty, duplicates, or invalid emails).'
            });
          }
          list.contacts = list.contacts.concat(newContacts);
          await list.save();
          return res.json({
            status: 'success',
            message: `Added ${newContacts.length} new contacts. Skipped ${skippedEmpty} empty rows, ${skippedDuplicate} duplicates, and ${skippedInvalidEmail} invalid-email rows.`,
            data: list
          });
        })
        .on('error', err => {
          console.error('Error parsing CSV:', err);
          return res.status(500).json({ status: 'error', message: 'Error processing CSV file' });
        });
    }

    // ── Excel branch ───────────────────────────────────
    if (ext === '.xls' || ext === '.xlsx') {
      const workbook  = xlsx.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const sheet     = workbook.Sheets[sheetName];
      const rows      = xlsx.utils.sheet_to_json(sheet, {
        header: ['name', 'email'],
        blankrows: false,
        defval: ''
      });

      rows.forEach(processRow);

      if (newContacts.length === 0) {
        return res.status(400).json({
          status: 'error',
          message: 'No valid new contacts found (all rows were empty, duplicates, or invalid emails).'
        });
      }

      list.contacts = list.contacts.concat(newContacts);
      await list.save();
      return res.json({
        status: 'success',
        message: `Added ${newContacts.length} new contacts. Skipped ${skippedEmpty} empty rows, ${skippedDuplicate} duplicates, and ${skippedInvalidEmail} invalid-email rows.`,
        data: list
      });
    }

    // ── Unsupported ─────────────────────────────────────
    return res.status(400).json({
      status: 'error',
      message: 'Unsupported file type. Please upload a CSV (.csv) or Excel (.xls/.xlsx) file.'
    });

  } catch (err) {
    console.error('Error uploading contacts:', err);
    return res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

exports.addContact = async (req, res) => {
  try {
    const { activityId, name = '', email = '' } = req.body;
    const nameTrim  = name.trim();
    const emailTrim = email.trim().toLowerCase();

    // Basic presence check
    if (!activityId || (!nameTrim && !emailTrim)) {
      return res.status(400).json({
        status: 'error',
        message: '`activityId` plus `name` or `email` required.'
      });
    }

    // If email was provided, ensure it’s a valid address
    if (emailTrim && !validator.isEmail(emailTrim)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid email format.'
      });
    }

    const list = await ActivityList.findOne({ activityId });
    if (!list) {
      return res.status(404).json({
        status: 'error',
        message: 'Activity list not found.'
      });
    }

    // Check for duplicates by email (if given) or name
    const duplicate = list.contacts.find(c => {
      if (emailTrim && c.email?.toLowerCase() === emailTrim) {
        return true;
      }
      if (!emailTrim && nameTrim && c.name === nameTrim) {
        return true;
      }
      return false;
    });

    if (duplicate) {
      return res.status(400).json({
        status: 'error',
        message: 'Contact already present.'
      });
    }

    // Create and save
    const newContact = {
      contactId: new mongoose.Types.ObjectId().toString(),
      name:  nameTrim,
      email: emailTrim
    };

    list.contacts.push(newContact);
    await list.save();

    return res.json({
      status: 'success',
      message: 'Contact added.',
      data: newContact
    });
  } catch (err) {
    console.error('addContact error:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Server error.'
    });
  }
};

// POST /contacts/update
// Body JSON: { contactId, name?, email? }

exports.updateContact = async (req, res) => {
  try {
    const { contactId, name, email } = req.body;

    // 1️⃣ Must provide contactId
    if (!contactId) {
      return res.status(400).json({
        status: 'error',
        message: '`contactId` is required.'
      });
    }

    // 2️⃣ Must provide at least one field to update
    if (name === undefined && email === undefined) {
      return res.status(400).json({
        status: 'error',
        message: 'Provide `name` and/or `email` to update.'
      });
    }

    // 3️⃣ Normalize inputs
    const update = {};
    if (name !== undefined) {
      const n = name.trim();
      if (n) update.name = n;
    }
    if (email !== undefined) {
      const e = email.trim().toLowerCase();
      // Validate format
      if (e && !validator.isEmail(e)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid email format.'
        });
      }
      update.email = e;
    }

    // 4️⃣ Find the list containing this contact
    const list = await ActivityList.findOne({ 'contacts.contactId': contactId });
    if (!list) {
      return res.status(404).json({
        status: 'error',
        message: 'Contact not found.'
      });
    }

    // 5️⃣ Check for email-duplicate if updating email
    if (update.email) {
      const emailInUse = list.contacts.some(c =>
        c.contactId !== contactId &&
        c.email?.toLowerCase() === update.email
      );
      if (emailInUse) {
        return res.status(400).json({
          status: 'error',
          message: 'That email is already assigned to another contact.'
        });
      }
    }

    // 6️⃣ Apply updates
    const contact = list.contacts.find(c => c.contactId === contactId);
    if (update.name)  contact.name  = update.name;
    if (update.email) contact.email = update.email;

    await list.save();

    return res.json({
      status: 'success',
      message: 'Contact updated.',
      data: contact
    });
  } catch (err) {
    console.error('Error updating contact:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Server error.'
    });
  }
};


// POST /contacts/delete
// Body JSON: { contactId }

exports.deleteContact = async (req, res) => {
  try {
    const { contactId } = req.body;
    if (!contactId) {
      return res.status(400).json({ status: 'error', message: '`contactId` is required.' });
    }

    const list = await ActivityList.findOne({ 'contacts.contactId': contactId });
    if (!list) {
      return res.status(404).json({ status: 'error', message: 'Contact not found.' });
    }

    const initialLength = list.contacts.length;
    list.contacts = list.contacts.filter(c => c.contactId !== contactId);

    if (list.contacts.length === initialLength) {
      return res.status(404).json({ status: 'error', message: 'Contact not found in list.' });
    }

    await list.save();

    return res.json({ status: 'success', message: 'Contact deleted.' });
  } catch (err) {
    console.error('Error deleting contact:', err);
    return res.status(500).json({ status: 'error', message: 'Server error.' });
  }
};

// Get contacts for a specific activity list by activityId
exports.getContacts = async (req, res) => {
  try {
    const { activityId } = req.body;
    if (!activityId) {
      return res.status(400).json({ status: 'error', message: 'activityId is required in the request body.' });
    }
    const list = await ActivityList.findOne({ activityId });
    if (!list) {
      return res.status(404).json({ status: 'error', message: 'Activity list not found.' });
    }
    return res.status(200).json({
      status: 'success',
      message: `Fetched ${list.contacts.length} contacts.`,
      data: list.contacts
    });
  } catch (err) {
    console.error('Error fetching contacts:', err);
    return res.status(500).json({ status: 'error', message: 'Server error.' });
  }
};

// controllers/activityListController.js
exports.updateActivityList = async (req, res) => {
  try {
    const { activityId, name } = req.body;

    if (!activityId || !name) {
      return res.status(400).json({
        status: 'error',
        message: '`activityId` and `name` are both required in the request body.'
      });
    }

    // Prevent duplicate names on *other* lists
    const duplicate = await ActivityList.findOne({
      name,
      activityId: { $ne: activityId }
    });
    if (duplicate) {
      return res.status(400).json({
        status: 'error',
        message: 'Another activity list with this name already exists.'
      });
    }

    const updated = await ActivityList.findOneAndUpdate(
      { activityId },
      { name },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        status: 'error',
        message: 'Activity list not found.'
      });
    }

    return res.json({
      status: 'success',
      message: 'Activity list name updated.',
      data: updated
    });
  } catch (err) {
    console.error('Error updating activity list:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
};


exports.deleteActivityList = async (req, res) => {
  try {
    const { activityId } = req.body;
    if (!activityId) {
      return res.status(400).json({
        status: 'error',
        message: '`activityId` is required in the request body.'
      });
    }

    const deleted = await ActivityList.findOneAndDelete({ activityId });
    if (!deleted) {
      return res.status(404).json({
        status: 'error',
        message: 'Activity list not found.'
      });
    }

    return res.json({
      status: 'success',
      message: 'Activity list deleted.'
    });
  } catch (err) {
    console.error('Error deleting activity list:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
};

// POST /activity-lists/by-marketer
// Body JSON: { marketerId }
exports.getActivitiesByMarketer = async (req, res) => {
  try {
    const {
      marketerId,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      fields
    } = req.body;

    if (!marketerId) {
      return res.status(400).json({
        status: 'error',
        message: '`marketerId` is required in the request body.'
      });
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limNum = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * limNum;
    const sortOpts = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    // Build query
    let query = ActivityList
      .find({ marketerId })
      .sort(sortOpts)
      .skip(skip)
      .limit(limNum);

    // Field selection if requested
    if (fields) {
      const selectStr = fields.split(',').map(f => f.trim()).join(' ');
      query = query.select(selectStr);
    }

    // Execute
    const [lists, total] = await Promise.all([
      query.exec(),
      ActivityList.countDocuments({ marketerId })
    ]);
    const totalPages = Math.ceil(total / limNum);

    return res.json({
      status: 'success',
      message: `Fetched ${lists.length} activity list(s) for marketer ${marketerId}.`,
      data: lists,
      meta: {
        total,
        page: pageNum,
        limit: limNum,
        totalPages
      }
    });
  } catch (err) {
    console.error('Error fetching activities by marketer:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
};

// POST /activity-lists/get-activity
// Body JSON: {
//   activityId: String,    // required
//   fields?: String        // e.g. "activityId,contacts,mailSent"
// }
exports.getActivityById = async (req, res) => {
  try {
    const { activityId, fields } = req.body;
    if (!activityId) {
      return res.status(400).json({
        status: 'error',
        message: '`activityId` is required in the request body.'
      });
    }

    let query = ActivityList.findOne({ activityId });
    if (fields) {
      const selectStr = fields.split(',').map(f => f.trim()).join(' ');
      query = query.select(selectStr);
    }

    const list = await query.exec();
    if (!list) {
      return res.status(404).json({
        status: 'error',
        message: 'Activity list not found.'
      });
    }

    return res.json({
      status: 'success',
      message: 'Fetched activity list.',
      data: list
    });
  } catch (err) {
    console.error('Error fetching activity by ID:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
};

exports.getMarketerList = async (req, res) => {
  try {
    const { marketerId } = req.query;

    if (!marketerId) {
      return res.status(400).json({
        status: 'error',
        message: '`marketerId` is required as a query parameter.'
      });
    }

    // Only select 'name' and 'activityId' fields
    const lists = await ActivityList
      .find({ marketerId })
      .sort({ createdAt: -1 })
      .select('name activityId');

    return res.json({
      status: 'success',
      message: `Fetched ${lists.length} activity list(s) for marketer.`,
      data: lists
    });
  } catch (err) {
    console.error('Error fetching activity lists for marketerId:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
};