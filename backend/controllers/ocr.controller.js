const { GoogleGenAI } = require("@google/genai");
const { pdf } = require("pdf-to-img");
const Tesseract = require('tesseract.js');
const dotenv = require("dotenv");
const path = require('path');
const OcrResult = require("../models/OcrResult.model.js");

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.tif', '.tiff']);

const extractTextFromPdf = async (fileBuffer) => {
    const document = await pdf(fileBuffer, { scale: 2 });
    let fullText = "";
    let pageCounter = 1;

    for await (const pageImage of document) {
        console.log(`🔍 OCR Processing PDF Page ${pageCounter}...`);
        const { data: { text } } = await Tesseract.recognize(pageImage, 'eng');
        fullText += `--- Page ${pageCounter} ---\n${text}\n`;
        pageCounter++;
    }

    return {
        fullText,
        pageCount: Math.max(pageCounter - 1, 1),
    };
};

const extractTextFromImage = async (fileBuffer) => {
    console.log('🔍 OCR Processing image...');
    const { data: { text } } = await Tesseract.recognize(fileBuffer, 'eng');
    return {
        fullText: text || '',
        pageCount: 1,
    };
};

const getAiAnalysis = async (fullText) => {
    if (!process.env.GEMINI_API_KEY) {
        return 'AI analysis skipped because GEMINI_API_KEY is not configured.';
    }

    try {
        console.log("🤖 Getting context from Gemini 3 Flash...");
        const result = await ai.models.generateContent({
            model: "gemini-3.1-flash-lite-preview",
            contents: [{
                role: "user",
                parts: [{
                    text: `Analyze this OCR text. Provide a summary, document intent, and key entities:\n\n${fullText}`
                }]
            }]
        });

        return result?.text || 'AI analysis completed with an empty response.';
    } catch (error) {
        console.warn('AI analysis failed:', error.message);
        return `AI analysis failed: ${error.message}`;
    }
};

const processPdfOcrController = async (req, res) => {
    try {
        if (!req.file || !req.file.buffer) {
            return res.status(400).json({ error: "No file provided." });
        }

        const ext = path.extname(req.file.originalname || '').toLowerCase();
        const mimeType = req.file.mimetype || '';
        const isPdf = mimeType === 'application/pdf' || ext === '.pdf';
        const isImage = mimeType.startsWith('image/') || IMAGE_EXTENSIONS.has(ext);

        if (!isPdf && !isImage) {
            return res.status(400).json({ error: 'Unsupported file type. Please upload a PDF or image.' });
        }

        let extracted;
        if (isPdf) {
            console.log("📄 Converting PDF to images...");
            extracted = await extractTextFromPdf(req.file.buffer);
        } else {
            extracted = await extractTextFromImage(req.file.buffer);
        }

        const { fullText, pageCount } = extracted;

        if (!fullText.trim()) {
            return res.status(422).json({ error: "OCR failed to extract text." });
        }

        const aiAnalysis = await getAiAnalysis(fullText);

        console.log("💾 Saving OCR result to database...");
        const newOcrResult = new OcrResult({
            fileName: req.file.originalname || "unknown_file",
            rawText: fullText,
            aiAnalysis,
            pageCount,
            modelUsed: "gemini-3.1-flash-lite-preview",
            userId: req.user?._id || undefined,
        });
        await newOcrResult.save();

        res.status(200).json({
            success: true,
            pageCount,
            extractedText: fullText,
            analysis: aiAnalysis,
            recordId: newOcrResult._id,
            fileName: newOcrResult.fileName,
            createdAt: newOcrResult.createdAt,
        });
        
        console.log(`✅ Data successfully saved! Response sent for Record ID: ${newOcrResult._id.toString()}`);

    } catch (error) {
        console.error("Controller Error:", error);
        res.status(500).json({ error: error.message });
    }
};

const getOcrHistoryController = async (req, res) => {
    try {
        const query = req.user?._id ? { userId: req.user._id } : {};
        const history = await OcrResult.find(query)
            .sort({ createdAt: -1 })
            .limit(50)
            .select('fileName pageCount modelUsed createdAt aiAnalysis rawText');

        return res.status(200).json({
            success: true,
            count: history.length,
            history,
        });
    } catch (error) {
        console.error('OCR History Error:', error);
        return res.status(500).json({ error: error.message });
    }
};

const deleteOcrHistoryItemController = async (req, res) => {
    try {
        const { id } = req.params;
        const query = req.user?._id ? { _id: id, userId: req.user._id } : { _id: id };
        const deleted = await OcrResult.findOneAndDelete(query);

        if (!deleted) {
            return res.status(404).json({ error: 'OCR history item not found.' });
        }

        return res.status(200).json({
            success: true,
            message: 'OCR history item deleted successfully.',
            deletedId: id,
        });
    } catch (error) {
        console.error('Delete OCR History Item Error:', error);
        return res.status(500).json({ error: error.message });
    }
};

const clearOcrHistoryController = async (req, res) => {
    try {
        const query = req.user?._id ? { userId: req.user._id } : {};
        const result = await OcrResult.deleteMany(query);

        return res.status(200).json({
            success: true,
            message: 'OCR history cleared successfully.',
            deletedCount: result.deletedCount || 0,
        });
    } catch (error) {
        console.error('Clear OCR History Error:', error);
        return res.status(500).json({ error: error.message });
    }
};

module.exports = {
    processPdfOcrController,
    getOcrHistoryController,
    deleteOcrHistoryItemController,
    clearOcrHistoryController,
};