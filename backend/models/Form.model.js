const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: {
    type: String,
    enum: ['Short Text', 'Long Text', 'Multiple Choice', 'Checkbox', 'Rating', 'NPS', 'Dropdown', 'Date'],
    default: 'Short Text',
  },
  text: { type: String, required: true },
  required: { type: Boolean, default: false },
  options: [{ type: String }],
  allowOther: { type: Boolean, default: false },
  order: { type: Number, default: 0 },
});

const formSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true, default: 'Untitled form' },
  description: { type: String, default: '' },
  questions: [questionSchema],
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
  settings: {
    multipleResponses: { type: Boolean, default: true },
    collectEmail: { type: String, enum: ['none', 'optional', 'required'], default: 'none' },
    showProgressBar: { type: Boolean, default: true },
    shuffleQuestions: { type: Boolean, default: false },
    restrictExtension: { type: Boolean, default: true },
    emailOnSubmission: { type: Boolean, default: true },
    slackWebhook: { type: Boolean, default: false },
    thankYouMessage: { type: String, default: 'Thank you for your feedback! We really appreciate it.' },
    redirectUrl: { type: String, default: '' },
  },
  shareLink: { type: String, unique: true, sparse: true },
  responseCount: { type: Number, default: 0 },
  viewCount: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Form', formSchema);
