// controllers/question.controller.js
const { GoogleGenAI } = require("@google/genai");
const OcrResult = require("../models/OcrResult.model.js");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const generateFormQuestions = async (req, res) => {
    try {
        const { selectedSuggestion } = req.body;
        const userId = req.user?._id;

        if (!selectedSuggestion) {
            return res.status(400).json({ error: "Prompt (selectedSuggestion) is required" });
        }

        // Fetch ALL trained data for the user
        const query = userId ? { userId } : {};
        const allTrainedData = await OcrResult.find(query)
            .select('fileName aiAnalysis rawText createdAt')
            .limit(10)
            .exec();

        // No trained data at all
        if (!allTrainedData || allTrainedData.length === 0) {
            return res.status(422).json({ 
                error: "No trained data available. Please upload and train data in the Data Upload page first to generate questions.",
                code: "NO_TRAINED_DATA"
            });
        }

        // Combine all trained data context
        const combinedContext = allTrainedData
            .map(doc => doc.aiAnalysis || doc.rawText)
            .filter(txt => txt && txt.trim().length > 0)
            .join('\n\n---\n\n');

        // Validate combined context has sufficient information
        if (!combinedContext || combinedContext.trim().length < 50) {
            return res.status(422).json({ 
                error: "Insufficient training data information. There is less info and trained data. Please train more relevant data in the Data Upload page for better question generation.",
                code: "INSUFFICIENT_DATA"
            });
        }

        // Generate questions using combined trained data
        const result = await ai.models.generateContent({
            model: "gemini-3.1-flash-lite-preview",
            contents: [{
                role: "user",
                parts: [{
                    text: `Act as a Form Designer. Using the trained document context: "${combinedContext}", 
                    generate 5 specific form questions specifically for: "${selectedSuggestion}".
                    
                    IMPORTANT: Only generate questions that are DIRECTLY related to the trained documents and the request.
                    If the documents don't contain information relevant to "${selectedSuggestion}", respond with: {"error": "no_relevance"}
                    
                    Each question must include a label and a fieldType (e.g., "text", "number", "date", or "dropdown").
                    If dropdown, provide "options".
                    
                    Return ONLY a JSON array of objects: 
                    [{"label": "...", "fieldType": "...", "options": []}]`
                }]
            }]
        });

        const cleanJson = result.text.replace(/```json|```/g, "").trim();
        const parsedResponse = JSON.parse(cleanJson);

        // Check if model detected no relevance
        if (parsedResponse.error === "no_relevance") {
            return res.status(422).json({ 
                error: "There is no information about the given topic in the trained data. It requires more information. Please train relevant data in the Data Upload page.",
                code: "NO_RELEVANCE"
            });
        }

        const questions = Array.isArray(parsedResponse) ? parsedResponse : parsedResponse.questions || [];

        // Validate that we got meaningful questions
        if (!questions || questions.length === 0) {
            return res.status(422).json({ 
                error: "Could not generate relevant questions from the trained data. Please train more relevant data in the Data Upload page.",
                code: "NO_QUESTIONS_GENERATED"
            });
        }

        res.status(200).json({
            success: true,
            questions: questions,
            usedDataCount: allTrainedData.length
        });
    } catch (error) {
        console.error("Question Gen Error:", error);
        
        // Check for JSON parse errors, which often mean irrelevant responses
        if (error instanceof SyntaxError) {
            return res.status(422).json({ 
                error: "There is no information about the given topic in the trained data. It requires more information. Please train relevant data in the Data Upload page.",
                code: "NO_RELEVANCE"
            });
        }

        res.status(500).json({ error: "Failed to generate questions" });
    }
};

module.exports = {
    generateFormQuestions
};
