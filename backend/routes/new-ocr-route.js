const express = require('express');
const multer = require('multer');
const {
    processPdfOcrController,
    getOcrHistoryController,
    deleteOcrHistoryItemController,
    clearOcrHistoryController,
} = require('../controllers/ocr.controller.js');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

// Configure Multer to store file in memory
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 } // 15MB limit
});

router.use(protect);

// Route: POST /api/ocr/analyze
router.post('/analyze', upload.single('file'), processPdfOcrController);

// Route: GET /api/ocr/history
router.get('/history', getOcrHistoryController);

// Route: DELETE /api/ocr/history/:id
router.delete('/history/:id', deleteOcrHistoryItemController);

// Route: DELETE /api/ocr/history
router.delete('/history', clearOcrHistoryController);

module.exports = router;