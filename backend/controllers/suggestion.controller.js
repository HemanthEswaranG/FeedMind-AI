// controllers/suggestion.controller.js
const { GoogleGenAI } = require("@google/genai");
const OcrResult = require("../models/OcrResult.model.js");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const getFormSuggestions = async (req, res) => {
    try {
        const { recordId } = req.body; 

        if (!recordId) return res.status(400).json({ error: "recordId is required" });

        const ocrData = await OcrResult.findById(recordId);
        if (!ocrData) return res.status(404).json({ error: "OCR Result not found" });

        const context = ocrData.aiAnalysis || ocrData.rawText;

        const result = await ai.models.generateContent({
            model: "gemini-3.1-flash-lite-preview",
            contents: [{
                role: "user",
                parts: [{
                    text: `Based on the following document context, suggest 5 key sections or themes that a digital form should cover. 
                    Return the response in valid JSON format: {"suggestions": ["Suggestion 1", "Suggestion 2", ...]}
                    
                    Context: ${context}`
                }]
            }]
        });

        // Gemini might wrap JSON in markdown blocks (```json ... ```), so we clean it
        const cleanJson = result.text.replace(/```json|```/g, "").trim();
        const data = JSON.parse(cleanJson);

        res.status(200).json(data);
    } catch (error) {
        console.error("Suggestion Error:", error);
        res.status(500).json({ error: "Failed to generate suggestions" });
    }
};

module.exports = {
    getFormSuggestions
};