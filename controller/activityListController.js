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

// controllers/activityListController.js
exports.updateActivityList = async (req, res) => {
  try {
    const { activityId, name } = req.body;

    if (!activityId || !name) {
      return res.status(400).json({
        status:  'error',
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
        status:  'error',
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
        status:  'error',
        message: 'Activity list not found.'
      });
    }

    return res.json({
      status:  'success',
      message: 'Activity list name updated.',
      data:    updated
    });
  } catch (err) {
    console.error('Error updating activity list:', err);
    return res.status(500).json({
      status:  'error',
      message: 'Server error'
    });
  }
};


exports.deleteActivityList = async (req, res) => {
  try {
    const { activityId } = req.body;
    if (!activityId) {
      return res.status(400).json({
        status:  'error',
        message: '`activityId` is required in the request body.'
      });
    }

    const deleted = await ActivityList.findOneAndDelete({ activityId });
    if (!deleted) {
      return res.status(404).json({
        status:  'error',
        message: 'Activity list not found.'
      });
    }

    return res.json({
      status:  'success',
      message: 'Activity list deleted.'
    });
  } catch (err) {
    console.error('Error deleting activity list:', err);
    return res.status(500).json({
      status:  'error',
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
      page     = 1,
      limit    = 10,
      sortBy   = 'createdAt',
      sortOrder= 'desc',
      fields
    } = req.body;

    if (!marketerId) {
      return res.status(400).json({
        status: 'error',
        message: '`marketerId` is required in the request body.'
      });
    }

    const pageNum  = Math.max(1, parseInt(page, 10));
    const limNum   = Math.max(1, parseInt(limit, 10));
    const skip     = (pageNum - 1) * limNum;
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
      status:  'success',
      message: `Fetched ${lists.length} activity list(s) for marketer ${marketerId}.`,
      data:    lists,
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
      status:  'error',
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
      status:  'success',
      message: 'Fetched activity list.',
      data:    list
    });
  } catch (err) {
    console.error('Error fetching activity by ID:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
};