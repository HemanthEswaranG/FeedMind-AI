const { GoogleGenAI } = require("@google/genai");
const { pdf } = require("pdf-to-img");
const Tesseract = require('tesseract.js');
const dotenv = require("dotenv");
const OcrResult = require("../models/OcrResult.model.js");

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const processPdfOcrController = async (req, res) => {
    try {
        if (!req.file || !req.file.buffer) {
            return res.status(400).json({ error: "No PDF file provided." });
        }

        console.log("📄 Converting PDF to images...");
        const document = await pdf(req.file.buffer, { scale: 2 });
        let fullText = "";

        let pageCounter = 1;
        for await (const pageImage of document) {
            console.log(`🔍 OCR Processing Page ${pageCounter}...`);
            const { data: { text } } = await Tesseract.recognize(pageImage, 'eng');
            fullText += `--- Page ${pageCounter} ---\n${text}\n`;
            pageCounter++;
        }

        if (!fullText.trim()) {
            return res.status(422).json({ error: "OCR failed to extract text." });
        }

        console.log("🤖 Getting context from Gemini 3 Flash...");
        const result = await ai.models.generateContent({
            model: "gemini-3.1-flash-lite-preview", // Use "gemini-3-flash-preview" if version locked
            contents: [{
                role: "user",
                parts: [{
                    text: `Analyze this OCR text. Provide a summary, document intent, and key entities:\n\n${fullText}`
                }]
            }]
        });

        console.log("💾 Saving OCR result to database...");
        const newOcrResult = new OcrResult({
            fileName: req.file.originalname || "unknown_file.pdf",
            rawText: fullText,
            aiAnalysis: result.text,
            pageCount: pageCounter - 1,
            modelUsed: "gemini-3.1-flash-lite-preview"
        });
        await newOcrResult.save();

        res.status(200).json({
            success: true,
            pageCount: pageCounter - 1,
            analysis: result.text,
            recordId: newOcrResult._id
        });
        
        console.log(`✅ Data successfully saved! Response sent for Record ID: ${newOcrResult._id.toString()}`);

    } catch (error) {
        console.error("Controller Error:", error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    processPdfOcrController
};