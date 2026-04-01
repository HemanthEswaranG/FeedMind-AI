const Response = require('../models/Response.model');
const Form = require('../models/Form.model');
const User = require('../models/User.model');

// ─── GET /api/responses ───────────────────────────────────
exports.getResponses = async (req, res) => {
  try {
    const { formId, status, sentiment, search, sort = '-createdAt' } = req.query;
    const filter = { owner: req.user._id };

    if (formId) filter.form = formId;
    if (status) filter.status = status;
    if (sentiment) filter.sentiment = sentiment;

    const responses = await Response.find(filter)
      .sort(sort)
      .populate('form', 'title')
      .lean();

    const stats = {
      total: await Response.countDocuments({ owner: req.user._id }),
      valid: await Response.countDocuments({ owner: req.user._id, status: 'valid' }),
      spam: await Response.countDocuments({ owner: req.user._id, status: 'spam' }),
      flagged: await Response.countDocuments({ owner: req.user._id, status: 'flagged' }),
      positive: await Response.countDocuments({ owner: req.user._id, sentiment: 'positive' }),
      negative: await Response.countDocuments({ owner: req.user._id, sentiment: 'negative' }),
    };

    res.json({ success: true, responses, stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── POST /api/responses (public – form submission) ───────
exports.submitResponse = async (req, res) => {
  try {
    const { formId, answers, email, device, completionTime, completionRate } = req.body;

    const form = await Form.findOne({ _id: formId, status: 'published' });
    if (!form) return res.status(404).json({ success: false, message: 'Form not found or not published' });

    const response = await Response.create({
      form: formId,
      owner: form.owner,
      answers,
      email: email || '',
      device: device || 'unknown',
      completionTime: completionTime || 0,
      completionRate: completionRate || 100,
    });

    // Update form response count
    await Form.findByIdAndUpdate(formId, { $inc: { responseCount: 1 } });
    // Update user response count
    await User.findByIdAndUpdate(form.owner, { $inc: { responsesUsed: 1 } });

    res.status(201).json({ success: true, message: 'Response submitted successfully', responseId: response._id });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/responses/:id ───────────────────────────────
exports.getResponse = async (req, res) => {
  try {
    const response = await Response.findOne({ _id: req.params.id, owner: req.user._id })
      .populate('form', 'title questions');
    if (!response) return res.status(404).json({ success: false, message: 'Response not found' });
    res.json({ success: true, response });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── DELETE /api/responses/:id ────────────────────────────
exports.deleteResponse = async (req, res) => {
  try {
    const response = await Response.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
    if (!response) return res.status(404).json({ success: false, message: 'Response not found' });
    res.json({ success: true, message: 'Response deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── PATCH /api/responses/:id/status ─────────────────────
exports.updateResponseStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const response = await Response.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      { status },
      { new: true }
    );
    if (!response) return res.status(404).json({ success: false, message: 'Response not found' });
    res.json({ success: true, response });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/responses/export ────────────────────────────
exports.exportResponses = async (req, res) => {
  try {
    const { formId, format = 'json' } = req.query;
    const filter = { owner: req.user._id };
    if (formId) filter.form = formId;

    const responses = await Response.find(filter).populate('form', 'title').lean();

    if (format === 'csv') {
      const headers = ['ID', 'Form', 'Email', 'Status', 'Sentiment', 'Device', 'Submitted At'];
      const rows = responses.map(r => [
        r._id, r.form?.title || '', r.email, r.status, r.sentiment, r.device,
        new Date(r.createdAt).toISOString(),
      ]);
      const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=responses.csv');
      return res.send(csv);
    }

    res.json({ success: true, responses });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
