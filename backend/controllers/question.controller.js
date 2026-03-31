// controllers/question.controller.js
const { GoogleGenAI } = require("@google/genai");
const OcrResult = require("../models/OcrResult.model.js");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const generateFormQuestions = async (req, res) => {
    try {
        const { recordId, selectedSuggestion } = req.body;

        if (!recordId || !selectedSuggestion) {
            return res.status(400).json({ error: "recordId and selectedSuggestion are required" });
        }

        const ocrData = await OcrResult.findById(recordId);
        if (!ocrData) return res.status(404).json({ error: "OCR Result not found" });

        const context = ocrData.aiAnalysis || ocrData.rawText;

        const result = await ai.models.generateContent({
            model: "gemini-3.1-flash-lite-preview",
            contents: [{
                role: "user",
                parts: [{
                    text: `Act as a Form Designer. Using the document context: "${context}", 
                    generate 5 specific form questions specifically for the category: "${selectedSuggestion}".
                    
                    Each question must include a label and a fieldType (e.g., "text", "number", "date", or "dropdown").
                    If dropdown, provide "options".
                    
                    Return ONLY a JSON array of objects: 
                    [{"label": "...", "fieldType": "...", "options": []}]`
                }]
            }]
        });

        const cleanJson = result.text.replace(/```json|```/g, "").trim();
        const questions = JSON.parse(cleanJson);

        res.status(200).json({
            success: true,
            questions: questions
        });
    } catch (error) {
        console.error("Question Gen Error:", error);
        res.status(500).json({ error: "Failed to generate questions" });
    }
};

module.exports = {
    generateFormQuestions
};