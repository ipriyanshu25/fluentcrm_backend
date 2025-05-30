const Template = require('../models/templates')

// Create a new template
exports.createTemplate = async (req, res) => {
  const {subject, name, content } = req.body

  if (!subject||!name || !content) {
    return res.status(400).json({ error: 'Name and content are required' })
  }

  try {
    const exists = await Template.findOne({ name })
    if (exists) return res.status(409).json({ error: 'Template name already exists' })

    const template = new Template({ subject,name, content })
    await template.save()

    res.status(201).json({ message: 'Template created successfully', data: template })
  } catch (err) {
    console.error('Create Template Error:', err)
    res.status(500).json({ error: 'Server error' })
  }
}

// Get all templates
exports.listTemplates = async (req, res) => {
  try {
    const templates = await Template.find().sort({ createdAt: -1 })
    res.status(200).json({ data: templates })
  } catch (err) {
    console.error('List Templates Error:', err)
    res.status(500).json({ error: 'Server error' })
  }
}

exports.updateTemplate = async (req, res) => {
  const { templateId } = req.body;
  const { subject, name, content } = req.body;
  if (!subject && !name && !content) {
    return res
      .status(400)
      .json({ error: 'Provide at least one of subject, name or content to update.' });
  }
  try {
    const updates = {};
    if (subject) updates.subject = subject;
    if (name)    updates.name    = name;
    if (content) updates.content = content;

    const updated = await Template.findByIdAndUpdate(
      templateId,
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!updated) {
      return res.status(404).json({ error: 'Template not found.' });
    }
    return res.json({ message: 'Template updated successfully.', data: updated });
  } catch (err) {
    console.error('Update Template Error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

// Delete a template by its ID
exports.deleteTemplate = async (req, res) => {
  const { templateId } = req.body;
  try {
    const deleted = await Template.findByIdAndDelete(templateId);
    if (!deleted) {
      return res.status(404).json({ error: 'Template not found.' });
    }
    return res.json({ message: 'Template deleted successfully.' });
  } catch (err) {
    console.error('Delete Template Error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};