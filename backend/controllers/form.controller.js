const Form = require('../models/Form.model');
const { v4: uuidv4 } = require('uuid');

// ─── GET /api/forms ───────────────────────────────────────
exports.getForms = async (req, res) => {
  try {
    const { status, search, sort = '-createdAt' } = req.query;
    const filter = { owner: req.user._id };
    if (status) filter.status = status;
    if (search) filter.title = { $regex: search, $options: 'i' };

    const forms = await Form.find(filter).sort(sort).lean();
    const total = await Form.countDocuments({ owner: req.user._id });
    const published = await Form.countDocuments({ owner: req.user._id, status: 'published' });
    const drafts = await Form.countDocuments({ owner: req.user._id, status: 'draft' });
    const archived = await Form.countDocuments({ owner: req.user._id, status: 'archived' });
    const trAgg = await Form.aggregate([
      { $match: { owner: req.user._id } },
      { $group: { _id: null, totalResponses: { $sum: '$responseCount' } } },
    ]);
    const totalResponses = trAgg[0]?.totalResponses ?? 0;

    res.json({
      success: true,
      forms,
      stats: { total, published, drafts, archived, totalResponses },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── POST /api/forms ──────────────────────────────────────
exports.createForm = async (req, res) => {
  try {
    const form = await Form.create({ ...req.body, owner: req.user._id, shareLink: uuidv4() });
    res.status(201).json({ success: true, form });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/forms/:id ───────────────────────────────────
exports.getForm = async (req, res) => {
  try {
    const form = await Form.findOne({ _id: req.params.id, owner: req.user._id });
    if (!form) return res.status(404).json({ success: false, message: 'Form not found' });
    res.json({ success: true, form });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── PUT /api/forms/:id ───────────────────────────────────
exports.updateForm = async (req, res) => {
  try {
    const form = await Form.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!form) return res.status(404).json({ success: false, message: 'Form not found' });
    res.json({ success: true, form });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── DELETE /api/forms/:id ────────────────────────────────
exports.deleteForm = async (req, res) => {
  try {
    const form = await Form.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
    if (!form) return res.status(404).json({ success: false, message: 'Form not found' });
    res.json({ success: true, message: 'Form deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── PATCH /api/forms/:id/publish ────────────────────────
exports.publishForm = async (req, res) => {
  try {
    const form = await Form.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      { status: 'published' },
      { new: true }
    );
    if (!form) return res.status(404).json({ success: false, message: 'Form not found' });
    res.json({ success: true, form, message: 'Form published successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/forms/share/:shareLink (public) ────────────
exports.getFormByShareLink = async (req, res) => {
  try {
    const form = await Form.findOne({ shareLink: req.params.shareLink, status: 'published' });
    if (!form) return res.status(404).json({ success: false, message: 'Form not found or not published' });
    await Form.findByIdAndUpdate(form._id, { $inc: { viewCount: 1 } });
    res.json({ success: true, form });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
