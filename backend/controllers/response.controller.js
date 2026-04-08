const Response = require('../models/Response.model');
const Form = require('../models/Form.model');
const User = require('../models/User.model');

const escapeCsvValue = (value) => {
  if (value === null || value === undefined) return '';

  const normalizedValue = Array.isArray(value)
    ? value.join('; ')
    : String(value);

  if (/[,"\n\r]/.test(normalizedValue)) {
    return `"${normalizedValue.replace(/"/g, '""')}"`;
  }

  return normalizedValue;
};

const formatAnswerValue = (answer) => {
  if (Array.isArray(answer)) return answer.join('; ');
  if (answer && typeof answer === 'object') return JSON.stringify(answer);
  return answer ?? '';
};

const normalizeFileName = (value) => String(value || 'responses')
  .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
  .replace(/\s+/g, ' ')
  .trim()
  .replace(/[. ]+$/g, '');

const buildCsv = (rows) => rows
  .map((row) => row.map(escapeCsvValue).join(','))
  .join('\r\n');

const buildUniqueQuestionHeaders = (questions = []) => {
  const seen = new Map();

  return questions.map((question, index) => {
    const baseHeader = question?.text?.trim() || `Question ${index + 1}`;
    const seenCount = seen.get(baseHeader) || 0;
    seen.set(baseHeader, seenCount + 1);
    return seenCount === 0 ? baseHeader : `${baseHeader} (${seenCount + 1})`;
  });
};

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

    const statsFilter = { owner: req.user._id };
    if (formId) statsFilter.form = formId;

    const stats = {
      total: await Response.countDocuments(statsFilter),
      valid: await Response.countDocuments({ ...statsFilter, status: 'valid' }),
      spam: await Response.countDocuments({ ...statsFilter, status: 'spam' }),
      flagged: await Response.countDocuments({ ...statsFilter, status: 'flagged' }),
      positive: await Response.countDocuments({ ...statsFilter, sentiment: 'positive' }),
      negative: await Response.countDocuments({ ...statsFilter, sentiment: 'negative' }),
    };

    res.json({ success: true, responses, stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── POST /api/responses (public – form submission) ───────
exports.submitResponse = async (req, res) => {
  try {
    const { formId, answers, email, name, device, completionTime, completionRate } = req.body;

    const form = await Form.findOne({ _id: formId, status: 'published' });
    if (!form) return res.status(404).json({ success: false, message: 'Form not found or not published' });

    const response = await Response.create({
      form: formId,
      owner: form.owner,
      answers,
      name: name || 'Anonymous',
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
    const isOverallExport = !formId || formId === 'overall';
    let selectedForm = null;

    if (!isOverallExport) {
      selectedForm = await Form.findOne({ _id: formId, owner: req.user._id }).lean();
      if (!selectedForm) {
        return res.status(404).json({ success: false, message: 'Form not found' });
      }
      filter.form = formId;
    }

    const responses = await Response.find(filter).populate('form', 'title questions').lean();

    if (format === 'csv') {
      let headers = [];
      let rows = [];

      if (isOverallExport) {
        headers = ['Timestamp', 'Form Name', 'Email', 'Sentiment', 'Device', 'Questions', 'Answers'];
        rows = responses.map((response) => {
          const answers = Array.isArray(response.answers) ? response.answers : [];
          const questionTexts = answers.map((answer) => answer?.questionText || '');
          const answerTexts = answers.map((answer) => formatAnswerValue(answer?.answer));

          return [
            new Date(response.createdAt).toISOString(),
            response.form?.title || '',
            response.email || '',
            response.sentiment || 'unknown',
            response.device || 'unknown',
            questionTexts.join(' | '),
            answerTexts.join(' | '),
          ];
        });
      } else {
        const questionHeaders = buildUniqueQuestionHeaders(selectedForm?.questions || []);
        headers = ['Timestamp', 'Email', 'Sentiment', 'Device', ...questionHeaders];

        rows = responses.map((response) => {
          const answers = Array.isArray(response.answers) ? response.answers : [];
          const answerLookup = new Map();

          answers.forEach((answer) => {
            const formattedAnswer = formatAnswerValue(answer?.answer);
            if (answer?.questionId) answerLookup.set(String(answer.questionId), formattedAnswer);
            if (answer?.questionText) answerLookup.set(String(answer.questionText), formattedAnswer);
          });

          const questionAnswers = (selectedForm?.questions || []).map((question) => {
            const byId = answerLookup.get(String(question.id));
            if (byId !== undefined) return byId;

            const byText = answerLookup.get(String(question.text));
            if (byText !== undefined) return byText;

            return '';
          });

          return [
            new Date(response.createdAt).toISOString(),
            response.email || '',
            response.sentiment || 'unknown',
            response.device || 'unknown',
            ...questionAnswers,
          ];
        });
      }

      const csv = buildCsv([headers, ...rows]);
      const exportFileName = isOverallExport
        ? 'responses-overall.csv'
        : `${normalizeFileName(selectedForm?.title || 'form')}-responses.csv`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${exportFileName}"`);
      res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
      return res.send(csv);
    }

    res.json({ success: true, responses });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
