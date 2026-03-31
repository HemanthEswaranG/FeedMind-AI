const mongoose = require('mongoose');

const ocrResultSchema = new mongoose.Schema({
  fileName: { 
    type: String, 
    default: 'unknown_file.pdf' 
  },
  rawText: { 
    type: String, 
    required: true 
  },
  aiAnalysis: { 
    type: String, 
    required: true 
  },
  pageCount: { 
    type: Number, 
    required: true,
    default: 1
  },
  modelUsed: { 
    type: String, 
    default: 'gemini-3.1-flash-lite-preview'
  },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: false // Optional, in case you add auth middleware later
  }
}, { timestamps: true });

module.exports = mongoose.model('OcrResult', ocrResultSchema);
