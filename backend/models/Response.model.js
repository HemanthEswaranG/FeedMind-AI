const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  questionId: { type: String, required: true },
  questionText: { type: String },
  answer: { type: mongoose.Schema.Types.Mixed },
});

const responseSchema = new mongoose.Schema({
  form: { type: mongoose.Schema.Types.ObjectId, ref: 'Form', required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  answers: [answerSchema],
  name: { type: String, default: 'Anonymous' },
  email: { type: String, default: '' },
  status: { type: String, enum: ['valid', 'spam', 'flagged'], default: 'valid' },
  sentiment: { type: String, enum: ['positive', 'neutral', 'negative', 'unknown'], default: 'unknown' },
  sentimentScore: { type: Number, default: 0 },
  completionTime: { type: Number, default: 0 }, // seconds
  device: { type: String, enum: ['desktop', 'mobile', 'tablet', 'unknown'], default: 'unknown' },
  ipAddress: { type: String, default: '' },
  spamScore: { type: Number, default: 0 },
  completionRate: { type: Number, default: 0 }, // percentage 0-100
}, { timestamps: true });

module.exports = mongoose.model('Response', responseSchema);
