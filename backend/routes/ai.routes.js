const express = require('express');
const { getFormSuggestions } = require('../controllers/suggestion.controller.js');
const { generateFormQuestions } = require('../controllers/question.controller.js');
const { analyzeResponses } = require('../controllers/ai.controller.js');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(protect);

// 1. Get suggestions based on DB context
router.post('/suggestions', getFormSuggestions);

// 2. Generate questions based on DB context + specific suggestion
router.post('/generate-questions', generateFormQuestions);

// 3. Natural language analysis on form responses
router.post('/analyze-responses', analyzeResponses);

module.exports = router;