const express = require('express');
const { getFormSuggestions } = require('../controllers/suggestion.controller.js');
const { generateFormQuestions } = require('../controllers/question.controller.js');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(protect);

// 1. Get suggestions based on DB context
router.post('/suggestions', getFormSuggestions);

// 2. Generate questions based on DB context + specific suggestion
router.post('/generate-questions', generateFormQuestions);

module.exports = router;