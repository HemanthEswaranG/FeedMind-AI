require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Form = require('../models/Form.model');
const Response = require('../models/Response.model');
const User = require('../models/User.model');

const FORM_COUNT = 6;
const MIN_RESPONSES_PER_FORM = 8;
const MAX_RESPONSES_PER_FORM = 16;
const DAYS_RANGE = 30;

const sentiments = ['positive', 'neutral', 'negative', 'unknown'];
const statuses = ['valid', 'valid', 'valid', 'spam', 'flagged'];
const devices = ['desktop', 'mobile', 'tablet'];

const firstNames = ['Aarav', 'Maya', 'Riya', 'Noah', 'Liam', 'Emma', 'Aisha', 'Karan', 'Meera', 'Arjun', 'Priya', 'David'];
const lastNames = ['Sharma', 'Patel', 'Khan', 'Iyer', 'Rao', 'Singh', 'Gupta', 'Nair', 'Das', 'Miller', 'Clark', 'Jones'];

const formBlueprints = [
  {
    title: 'Customer Satisfaction Survey',
    description: 'Understand customer experience and satisfaction.',
    questions: [
      { id: 'q-1', type: 'Rating', text: 'How satisfied are you with our service?', required: true, options: [], order: 0 },
      { id: 'q-2', type: 'Multiple Choice', text: 'How did you hear about us?', required: false, options: ['Google', 'Social Media', 'Friend', 'Other'], order: 1 },
      { id: 'q-3', type: 'Long Text', text: 'What can we improve?', required: false, options: [], order: 2 },
    ],
  },
  {
    title: 'Website Feedback Form',
    description: 'Collect feedback on website usability and design.',
    questions: [
      { id: 'q-1', type: 'Rating', text: 'Rate your website experience.', required: true, options: [], order: 0 },
      { id: 'q-2', type: 'Short Text', text: 'Which page did you like the most?', required: false, options: [], order: 1 },
      { id: 'q-3', type: 'Checkbox', text: 'Which issues did you face?', required: false, options: ['Slow loading', 'Confusing navigation', 'Broken links', 'No issues'], order: 2 },
    ],
  },
  {
    title: 'Product Feedback Survey',
    description: 'Gather insights on product quality and value.',
    questions: [
      { id: 'q-1', type: 'NPS', text: 'How likely are you to recommend this product?', required: true, options: [], order: 0 },
      { id: 'q-2', type: 'Dropdown', text: 'How often do you use the product?', required: false, options: ['Daily', 'Weekly', 'Monthly', 'Rarely'], order: 1 },
      { id: 'q-3', type: 'Long Text', text: 'Tell us one feature you want next.', required: false, options: [], order: 2 },
    ],
  },
  {
    title: 'Support Experience Form',
    description: 'Measure support responsiveness and quality.',
    questions: [
      { id: 'q-1', type: 'Rating', text: 'How would you rate our support response?', required: true, options: [], order: 0 },
      { id: 'q-2', type: 'Multiple Choice', text: 'Was your issue resolved?', required: true, options: ['Yes', 'Partially', 'No'], order: 1 },
      { id: 'q-3', type: 'Long Text', text: 'Any suggestions for support team?', required: false, options: [], order: 2 },
    ],
  },
  {
    title: 'Event Feedback Form',
    description: 'Capture attendee experience after events.',
    questions: [
      { id: 'q-1', type: 'Rating', text: 'How would you rate the event overall?', required: true, options: [], order: 0 },
      { id: 'q-2', type: 'Checkbox', text: 'What did you enjoy?', required: false, options: ['Sessions', 'Networking', 'Venue', 'Speakers'], order: 1 },
      { id: 'q-3', type: 'Long Text', text: 'What should we improve next time?', required: false, options: [], order: 2 },
    ],
  },
  {
    title: 'Employee Pulse Check',
    description: 'Quick pulse check on team morale and workload.',
    questions: [
      { id: 'q-1', type: 'Rating', text: 'How is your current workload?', required: true, options: [], order: 0 },
      { id: 'q-2', type: 'Multiple Choice', text: 'How supported do you feel by your manager?', required: false, options: ['Very supported', 'Somewhat supported', 'Not supported'], order: 1 },
      { id: 'q-3', type: 'Long Text', text: 'Any blockers we should address?', required: false, options: [], order: 2 },
    ],
  },
];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[randomInt(0, arr.length - 1)];
}

function randomDateWithinLastDays(days) {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - days);
  const t = randomInt(start.getTime(), now.getTime());
  return new Date(t);
}

function buildName() {
  return `${pick(firstNames)} ${pick(lastNames)}`;
}

function buildEmail(name) {
  const slug = name.toLowerCase().replace(/\s+/g, '.');
  return `${slug}${randomInt(1, 999)}@example.com`;
}

function buildAnswerForQuestion(question) {
  if (question.type === 'Rating' || question.type === 'NPS') {
    return String(randomInt(1, 10));
  }
  if (question.type === 'Multiple Choice' || question.type === 'Dropdown') {
    return question.options?.length ? pick(question.options) : 'N/A';
  }
  if (question.type === 'Checkbox') {
    if (!question.options?.length) return [];
    const count = randomInt(1, Math.min(2, question.options.length));
    return [...question.options].sort(() => Math.random() - 0.5).slice(0, count);
  }
  if (question.type === 'Date') {
    return randomDateWithinLastDays(DAYS_RANGE).toISOString().slice(0, 10);
  }
  return 'Sample response text';
}

async function run() {
  await connectDB();

  const cliEmailArg = process.argv.find((arg) => arg.startsWith('--email='));
  const targetEmail = (cliEmailArg ? cliEmailArg.split('=')[1] : process.env.SEED_TARGET_EMAIL || '').trim().toLowerCase();

  const owner = targetEmail
    ? await User.findOne({ email: targetEmail }).select('_id name email')
    : await User.findOne().select('_id name email');

  if (!owner) {
    throw new Error(
      targetEmail
        ? `User not found for email: ${targetEmail}`
        : 'No user found in database. Please create at least one user first.'
    );
  }

  const formsToUse = formBlueprints.slice(0, FORM_COUNT);
  let totalResponses = 0;

  for (let i = 0; i < formsToUse.length; i += 1) {
    const blueprint = formsToUse[i];
    const formCreatedAt = randomDateWithinLastDays(DAYS_RANGE);

    const form = await Form.create({
      owner: owner._id,
      title: blueprint.title,
      description: blueprint.description,
      questions: blueprint.questions,
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
      shareLink: `dummy-${Date.now()}-${i}`,
      responseCount: 0,
      viewCount: randomInt(5, 80),
    });

    await Form.updateOne(
      { _id: form._id },
      { $set: { createdAt: formCreatedAt, updatedAt: formCreatedAt } },
      { timestamps: false }
    );

    const responseCount = randomInt(MIN_RESPONSES_PER_FORM, MAX_RESPONSES_PER_FORM);

    for (let r = 0; r < responseCount; r += 1) {
      const respondentName = buildName();
      const hasEmail = Math.random() > 0.2;
      const sentiment = pick(sentiments);
      const createdAt = randomDateWithinLastDays(DAYS_RANGE);
      const answers = blueprint.questions.map((q) => ({
        questionId: q.id,
        questionText: q.text,
        answer: buildAnswerForQuestion(q),
      }));

      const response = await Response.create({
        form: form._id,
        owner: owner._id,
        answers,
        name: respondentName,
        email: hasEmail ? buildEmail(respondentName) : '',
        status: pick(statuses),
        sentiment,
        sentimentScore: sentiment === 'positive' ? Number((Math.random() * 0.5 + 0.5).toFixed(2)) : sentiment === 'negative' ? Number((-Math.random()).toFixed(2)) : Number((Math.random() * 0.2 - 0.1).toFixed(2)),
        completionTime: randomInt(25, 420),
        device: pick(devices),
        ipAddress: `192.168.1.${randomInt(2, 250)}`,
        spamScore: Number((Math.random() * 0.4).toFixed(2)),
        completionRate: randomInt(70, 100),
      });

      await Response.updateOne(
        { _id: response._id },
        { $set: { createdAt, updatedAt: createdAt } },
        { timestamps: false }
      );

      totalResponses += 1;
    }

    await Form.updateOne(
      { _id: form._id },
      { $set: { responseCount } },
      { timestamps: false }
    );
  }

  await User.updateOne({ _id: owner._id }, { $inc: { responsesUsed: totalResponses } });

  console.log(`Seed complete. Created ${formsToUse.length} forms and ${totalResponses} responses for user ${owner.email}.`);
  await mongoose.connection.close();
}

run()
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error('Seed failed:', err.message);
    try {
      await mongoose.connection.close();
    } catch (_) {
      // Ignore close errors on failure path.
    }
    process.exit(1);
  });
