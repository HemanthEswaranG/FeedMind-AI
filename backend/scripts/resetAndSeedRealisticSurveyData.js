require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User.model');
const Form = require('../models/Form.model');
const Response = require('../models/Response.model');

const parseArg = (name) => {
  const arg = process.argv.find((item) => item.startsWith(`--${name}=`));
  return arg ? arg.split('=')[1] : '';
};

const targetEmail = (parseArg('email') || process.env.SEED_TARGET_EMAIL || '').trim().toLowerCase();
const MIN_RESPONSES = Number(parseArg('minResponses') || 10);
const MAX_RESPONSES = Number(parseArg('maxResponses') || 20);
const FORM_COUNT = 10;

if (!targetEmail) {
  console.error('Missing target email. Use --email=<user@email.com>');
  process.exit(1);
}

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const toIsoDate = (date) => date.toISOString().slice(0, 10);

const randomDateInRange = (start, end) => {
  const t = randInt(start.getTime(), end.getTime());
  return new Date(t);
};

const randomPastDate = (daysBackStart, daysBackEnd) => {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);
  start.setDate(now.getDate() - daysBackEnd);
  end.setDate(now.getDate() - daysBackStart);
  return randomDateInRange(start, end);
};

const firstNames = ['Aarav', 'Meera', 'Riya', 'Ishaan', 'Noah', 'Emma', 'Arjun', 'Priya', 'Liam', 'Anika', 'Kiran', 'Zara'];
const lastNames = ['Sharma', 'Patel', 'Khan', 'Rao', 'Iyer', 'Singh', 'Nair', 'Das', 'Miller', 'Clark', 'Reed', 'Brown'];

const realisticOpenText = {
  positive: [
    'Support team resolved my issue in a single interaction.',
    'Checkout was smooth and I received confirmation immediately.',
    'The onboarding steps were clear and easy to complete.',
    'The product quality matched expectations and delivery was on time.',
    'Navigation feels intuitive and pages load quickly.'
  ],
  neutral: [
    'Overall experience was fine but there is room for improvement.',
    'Most steps were clear, a few labels were confusing.',
    'Response time was acceptable, not exceptional.',
    'The service works, but some options are hard to find.',
    'I could complete the task, though it took longer than expected.'
  ],
  negative: [
    'I had to retry twice before the form submission worked.',
    'Support response was delayed and the answer was not specific.',
    'The instructions were unclear in one key step.',
    'Performance was inconsistent during checkout.',
    'I had difficulty finding the correct option quickly.'
  ],
};

const formTemplates = [
  {
    title: 'Customer Satisfaction (CSAT) Survey',
    description: 'Measure post-service satisfaction and identify improvement areas.',
    questions: [
      { id: 'q1', type: 'Rating', text: 'How satisfied are you with your overall experience?', required: true, options: [], order: 0 },
      { id: 'q2', type: 'Multiple Choice', text: 'How well did we meet your needs?', required: true, options: ['Extremely well', 'Very well', 'Somewhat well', 'Not so well', 'Not at all'], order: 1 },
      { id: 'q3', type: 'Long Text', text: 'What is one thing we should improve?', required: false, options: [], order: 2 },
    ],
  },
  {
    title: 'Net Promoter Score (NPS) Survey',
    description: 'Track recommendation intent and loyalty drivers.',
    questions: [
      { id: 'q1', type: 'NPS', text: 'How likely are you to recommend us to a friend or colleague?', required: true, options: [], order: 0 },
      { id: 'q2', type: 'Multiple Choice', text: 'What influenced your rating the most?', required: false, options: ['Product quality', 'Price', 'Support', 'Ease of use', 'Delivery speed'], order: 1 },
      { id: 'q3', type: 'Long Text', text: 'What should we do to improve your score?', required: false, options: [], order: 2 },
    ],
  },
  {
    title: 'Customer Effort Score (CES) Survey',
    description: 'Evaluate how easy it is for users to complete a task.',
    questions: [
      { id: 'q1', type: 'Rating', text: 'How easy was it to complete your task today?', required: true, options: [], order: 0 },
      { id: 'q2', type: 'Multiple Choice', text: 'Where did you experience friction?', required: false, options: ['Login', 'Navigation', 'Checkout', 'Payment', 'No issues'], order: 1 },
      { id: 'q3', type: 'Long Text', text: 'What would reduce your effort next time?', required: false, options: [], order: 2 },
    ],
  },
  {
    title: 'E-commerce Post Purchase Feedback',
    description: 'Collect product, delivery, and value-for-money feedback.',
    questions: [
      { id: 'q1', type: 'Rating', text: 'How would you rate the product quality?', required: true, options: [], order: 0 },
      { id: 'q2', type: 'Multiple Choice', text: 'How satisfied are you with delivery speed?', required: true, options: ['Very satisfied', 'Satisfied', 'Neutral', 'Dissatisfied', 'Very dissatisfied'], order: 1 },
      { id: 'q3', type: 'Long Text', text: 'Any comments about your order experience?', required: false, options: [], order: 2 },
    ],
  },
  {
    title: 'SaaS Onboarding Experience Survey',
    description: 'Assess first-time user onboarding clarity and success.',
    questions: [
      { id: 'q1', type: 'Rating', text: 'How easy was the onboarding process?', required: true, options: [], order: 0 },
      { id: 'q2', type: 'Dropdown', text: 'Which step was most confusing?', required: false, options: ['Account setup', 'Workspace creation', 'Integrations', 'Inviting team', 'Nothing confusing'], order: 1 },
      { id: 'q3', type: 'Long Text', text: 'What should we improve in onboarding?', required: false, options: [], order: 2 },
    ],
  },
  {
    title: 'Helpdesk Support Quality Survey',
    description: 'Measure responsiveness and resolution quality.',
    questions: [
      { id: 'q1', type: 'Rating', text: 'How satisfied are you with support resolution?', required: true, options: [], order: 0 },
      { id: 'q2', type: 'Multiple Choice', text: 'Was your issue resolved in the first contact?', required: true, options: ['Yes', 'Partially', 'No'], order: 1 },
      { id: 'q3', type: 'Long Text', text: 'What could support improve?', required: false, options: [], order: 2 },
    ],
  },
  {
    title: 'Website Usability Feedback',
    description: 'Understand navigation, speed, and usability quality.',
    questions: [
      { id: 'q1', type: 'Rating', text: 'How easy was it to find what you needed?', required: true, options: [], order: 0 },
      { id: 'q2', type: 'Checkbox', text: 'Which issues did you encounter?', required: false, options: ['Slow pages', 'Broken links', 'Unclear labels', 'Mobile issues', 'No issues'], order: 1 },
      { id: 'q3', type: 'Long Text', text: 'What should we improve on the website?', required: false, options: [], order: 2 },
    ],
  },
  {
    title: 'Mobile App Experience Survey',
    description: 'Gather mobile UX, stability, and feature feedback.',
    questions: [
      { id: 'q1', type: 'Rating', text: 'How would you rate the app performance?', required: true, options: [], order: 0 },
      { id: 'q2', type: 'Multiple Choice', text: 'How stable is the app during use?', required: true, options: ['Very stable', 'Mostly stable', 'Occasional issues', 'Frequent issues'], order: 1 },
      { id: 'q3', type: 'Long Text', text: 'Which feature should we improve first?', required: false, options: [], order: 2 },
    ],
  },
  {
    title: 'Event Feedback Survey',
    description: 'Capture attendee experience for sessions and logistics.',
    questions: [
      { id: 'q1', type: 'Rating', text: 'How valuable was the event overall?', required: true, options: [], order: 0 },
      { id: 'q2', type: 'Checkbox', text: 'What did you find most useful?', required: false, options: ['Speakers', 'Sessions', 'Networking', 'Venue', 'Materials'], order: 1 },
      { id: 'q3', type: 'Long Text', text: 'What should we improve for next event?', required: false, options: [], order: 2 },
    ],
  },
  {
    title: 'Employee Pulse Survey',
    description: 'Track morale, workload, and support perception.',
    questions: [
      { id: 'q1', type: 'Rating', text: 'How manageable is your workload this month?', required: true, options: [], order: 0 },
      { id: 'q2', type: 'Multiple Choice', text: 'How supported do you feel by your team lead?', required: true, options: ['Very supported', 'Supported', 'Neutral', 'Under-supported'], order: 1 },
      { id: 'q3', type: 'Long Text', text: 'Any blockers affecting your productivity?', required: false, options: [], order: 2 },
    ],
  },
];

function generateName() {
  return `${pick(firstNames)} ${pick(lastNames)}`;
}

function generateEmail(name) {
  return `${name.toLowerCase().replace(/\s+/g, '.')}+${randInt(100, 999)}@example.com`;
}

function buildAnswer(question, sentiment) {
  const t = question.type;

  if (t === 'Rating') {
    if (sentiment === 'positive') return String(randInt(4, 5));
    if (sentiment === 'negative') return String(randInt(1, 2));
    return String(randInt(2, 4));
  }

  if (t === 'NPS') {
    if (sentiment === 'positive') return String(randInt(8, 10));
    if (sentiment === 'negative') return String(randInt(0, 5));
    return String(randInt(6, 8));
  }

  if (t === 'Multiple Choice' || t === 'Dropdown') {
    return (question.options && question.options.length > 0) ? pick(question.options) : 'N/A';
  }

  if (t === 'Checkbox') {
    if (!question.options || question.options.length === 0) return [];
    const count = randInt(1, Math.min(2, question.options.length));
    return [...question.options].sort(() => Math.random() - 0.5).slice(0, count);
  }

  if (t === 'Date') {
    return toIsoDate(randomPastDate(0, 120));
  }

  return pick(realisticOpenText[sentiment] || realisticOpenText.neutral);
}

async function setTimestamps(Model, id, date) {
  await Model.updateOne(
    { _id: id },
    { $set: { createdAt: date, updatedAt: date } },
    { timestamps: false }
  );
}

async function main() {
  await connectDB();

  const owner = await User.findOne({ email: targetEmail }).select('_id email name').lean();
  if (!owner) {
    throw new Error(`User not found for email: ${targetEmail}`);
  }

  const ownerId = owner._id;

  const existingResponses = await Response.countDocuments({ owner: ownerId });
  const existingForms = await Form.countDocuments({ owner: ownerId });

  await Response.deleteMany({ owner: ownerId });
  await Form.deleteMany({ owner: ownerId });

  console.log(`Deleted existing data for ${targetEmail}: ${existingForms} forms, ${existingResponses} responses.`);

  let totalResponses = 0;

  for (let i = 0; i < FORM_COUNT; i += 1) {
    const template = formTemplates[i % formTemplates.length];
    const formCreatedAt = randomPastDate(15, 180);

    const form = await Form.create({
      owner: ownerId,
      title: template.title,
      description: template.description,
      questions: template.questions,
      status: 'published',
      settings: {
        multipleResponses: true,
        collectEmail: 'optional',
        showProgressBar: true,
        shuffleQuestions: false,
        restrictExtension: true,
        emailOnSubmission: true,
        slackWebhook: false,
        thankYouMessage: 'Thank you for your feedback! We really appreciate it.',
        redirectUrl: '',
      },
      shareLink: `seed-real-${Date.now()}-${i}`,
      responseCount: 0,
      viewCount: randInt(15, 250),
    });

    await setTimestamps(Form, form._id, formCreatedAt);

    const responseCount = randInt(MIN_RESPONSES, MAX_RESPONSES);
    let validResponsesForForm = 0;

    for (let r = 0; r < responseCount; r += 1) {
      const sentiment = pick(['positive', 'positive', 'neutral', 'neutral', 'negative']);
      const respondentName = generateName();
      const createdAt = randomDateInRange(formCreatedAt, new Date());
      const completionRate = randInt(85, 100);

      const answers = template.questions.map((q) => ({
        questionId: q.id,
        questionText: q.text,
        answer: buildAnswer(q, sentiment),
      }));

      const response = await Response.create({
        form: form._id,
        owner: ownerId,
        answers,
        name: respondentName,
        email: generateEmail(respondentName),
        status: 'valid',
        sentiment,
        sentimentScore: sentiment === 'positive' ? Number((Math.random() * 0.4 + 0.6).toFixed(2)) : sentiment === 'negative' ? Number((-Math.random() * 0.6 - 0.2).toFixed(2)) : Number((Math.random() * 0.2 - 0.1).toFixed(2)),
        completionTime: randInt(35, 540),
        device: pick(['desktop', 'mobile', 'tablet']),
        ipAddress: `10.0.0.${randInt(2, 250)}`,
        spamScore: Number((Math.random() * 0.2).toFixed(2)),
        completionRate,
      });

      await setTimestamps(Response, response._id, createdAt);
      validResponsesForForm += 1;
      totalResponses += 1;
    }

    await Form.updateOne({ _id: form._id }, { $set: { responseCount: validResponsesForForm } }, { timestamps: false });
  }

  await User.updateOne({ _id: ownerId }, { $set: { responsesUsed: totalResponses } });

  console.log(`Seed complete for ${targetEmail}: ${FORM_COUNT} forms and ${totalResponses} valid responses created.`);
  await mongoose.connection.close();
}

main()
  .then(() => process.exit(0))
  .catch(async (error) => {
    console.error('resetAndSeedRealisticSurveyData failed:', error.message);
    try {
      await mongoose.connection.close();
    } catch (_) {
      // Ignore close errors.
    }
    process.exit(1);
  });
