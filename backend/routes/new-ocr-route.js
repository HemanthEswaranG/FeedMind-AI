const express = require('express');
const multer = require('multer');
const { processPdfOcrController } = require('../controllers/ocr.controller.js');

const router = express.Router();

// Configure Multer to store file in memory
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Route: POST /api/ocr/analyze
router.post('/analyze', upload.single('pdf'), processPdfOcrController);

module.exports = router;