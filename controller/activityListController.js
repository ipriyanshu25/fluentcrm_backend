const fs  = require('fs');
const csv = require('csv-parser');
// controllers/activityListController.js
const ActivityList = require('../models/activityList');
const Marketer     = require('../models/marketer');

exports.createActivityList = async (req, res) => {
  try {
    const { name, marketerId } = req.body;
    if (!name || !marketerId) {
      return res.status(400).json({
        status:  'error',
        message: '`name` and `marketerId` are both required.'
      });
    }

    // ensure the marketer exists
    const marketer = await Marketer.findOne({ marketerId });
    if (!marketer) {
      return res.status(404).json({
        status:  'error',
        message: 'No marketer found with that marketerId.'
      });
    }

    // prevent duplicate list names
    if (await ActivityList.findOne({ name })) {
      return res.status(400).json({
        status:  'error',
        message: 'An activity list with this name already exists.'
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
      status:  'success',
      message: 'Activity list created successfully.',
      data:    newList
    });
  } catch (err) {
    console.error('Error creating activity list:', err);
    // duplicate-name fallback
    if (err.code === 11000 && err.keyValue?.name) {
      return res.status(400).json({
        status:  'error',
        message: 'An activity list with this name already exists.'
      });
    }
    return res.status(500).json({
      status:  'error',
      message: 'Server error'
    });
  }
};


exports.getAllActivityLists = async (req, res) => {
  try {
    // Pagination parameters
    const page = parseInt(req.query.page, 10) > 0 ? parseInt(req.query.page, 10) : 1;
    const limit = parseInt(req.query.limit, 10) > 0 ? parseInt(req.query.limit, 10) : 10;
    const skip = (page - 1) * limit;

    // Total count for metadata
    const total = await ActivityList.countDocuments();
    const totalPages = Math.ceil(total / limit);

    // Fetch paginated results
    const lists = await ActivityList.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.json({
      status: 'success',
      message: 'Fetched activity lists',
      data: lists,
      meta: {
        total,
        page,
        limit,
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
      return res.status(400).json({ status: 'error', message: 'CSV file is required' });
    }

    const newContacts = [];
    let skippedCount = 0;

    fs.createReadStream(req.file.path)
      .pipe(csv({ headers: ['name', 'email'], skipLines: 0 }))
      .on('data', row => {
        const name = row.name?.trim();
        const email = row.email?.trim();
        if (!name && !email) {
          skippedCount++;
          return;
        }
        newContacts.push({ name, email });
      })
      .on('end', async () => {
        if (newContacts.length === 0) {
          return res.status(400).json({
            status: 'error',
            message: 'No valid rows found. Ensure CSV has no header and contains two columns: name,email.'
          });
        }
        list.contacts = list.contacts.concat(newContacts);
        await list.save();
        return res.status(200).json({
          status: 'success',
          message: `Stored ${newContacts.length} contacts. Skipped ${skippedCount} empty rows.`,
          data: list
        });
      })
      .on('error', err => {
        console.error('Error parsing CSV:', err);
        return res.status(500).json({ status: 'error', message: 'Error processing CSV file' });
      });
  } catch (err) {
    console.error('Error uploading contacts:', err);
    return res.status(500).json({ status: 'error', message: 'Server error' });
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