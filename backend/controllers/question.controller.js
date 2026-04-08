const { GoogleGenAI } = require("@google/genai");
const mongoose = require("mongoose");
const OcrResult = require("../models/OcrResult.model.js");
const DocumentChunk = require("../models/DocumentChunk.model.js");
const { getRelevantContext } = require("../services/rag.service.js");

// Validate API key on startup
if (!process.env.GEMINI_API_KEY) {
    console.error("❌ GEMINI_API_KEY environment variable is not set!");
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const DEFAULT_QUESTION_COUNT = 5;
const MAX_QUESTION_COUNT = 25;
const AI_CALL_TIMEOUT_MS = 9000;
const GENERIC_OPTION_LABELS = new Set([
    'other',
    'others',
    'none',
    'none of the above',
    'n/a',
    'na',
    'yes',
    'no',
    'option 1',
    'option 2',
    'option 3',
    'option 4',
    'option 5',
]);

const GENERIC_QUESTION_PATTERNS = [
    /^what do you think/i,
    /^how satisfied are you/i,
    /^please describe/i,
    /^tell us/i,
    /^any comments/i,
    /^additional comments/i,
    /^other/i,
];

const STOPWORDS = new Set([
    'the', 'and', 'for', 'with', 'from', 'that', 'this', 'have', 'your', 'about', 'into', 'form', 'data', 'please',
    'user', 'users', 'request', 'context', 'question', 'questions', 'generate', 'create', 'make', 'give', 'need',
    'want', 'like', 'more', 'less', 'very', 'what', 'how', 'when', 'where', 'which', 'who', 'why', 'is', 'are', 'was',
    'were', 'be', 'been', 'being', 'to', 'of', 'in', 'on', 'at', 'as', 'an', 'a', 'or', 'it', 'its', 'their', 'they',
    'them', 'we', 'our', 'you', 'can', 'could', 'should', 'would', 'will', 'may', 'might', 'do', 'does', 'did', 'by',
    'relevant', 'specific', 'generic', 'domain', 'topic', 'topics', 'survey', 'feedback', 'trained', 'document', 'documents',
]);

function extractContextSignals(text, limit = 12) {
    if (!text) return [];

    const counts = new Map();
    const rawTokens = String(text)
        .replace(/['"`]/g, ' ')
        .split(/[\s,.;:!?()[\]{}<>/\\|\-]+/)
        .map((token) => token.trim())
        .filter(Boolean);

    for (const token of rawTokens) {
        const normalized = token.toLowerCase();
        if (normalized.length < 4 || STOPWORDS.has(normalized)) continue;
        counts.set(normalized, (counts.get(normalized) || 0) + 1);
    }

    return [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([token]) => token);
}

function looksGenericQuestion(label) {
    const normalized = String(label || '').trim();
    if (!normalized) return true;
    return GENERIC_QUESTION_PATTERNS.some((pattern) => pattern.test(normalized));
}

function looksGenericOption(option) {
    const normalized = String(option || '').trim().toLowerCase();
    if (!normalized) return true;
    if (GENERIC_OPTION_LABELS.has(normalized)) return true;
    if (/^option\s*\d+$/i.test(normalized)) return true;
    if (/^(choice|answer)\s*\d+$/i.test(normalized)) return true;
    return false;
}

function extractRequestedQuestionType(promptText) {
    const normalized = String(promptText || '').toLowerCase();

    if (/\b(mcq|mcqs|m\.c\.q|m\.c\.q\.s|multiple choice|multiple-choice|single choice|single-choice|choose one|radio|objective)\b/i.test(normalized)) {
        return 'multiple choice';
    }

    if (/\b(short answer|short text|open ended|open-ended|paragraph|long answer|descriptive)\b/i.test(normalized)) {
        return 'text';
    }

    if (/\b(checkbox|multiple select|multi select|select all that apply)\b/i.test(normalized)) {
        return 'checkbox';
    }

    if (/\b(dropdown|select box|select list)\b/i.test(normalized)) {
        return 'dropdown';
    }

    if (/\b(rating|scale|nps)\b/i.test(normalized)) {
        return 'rating';
    }

    return 'unspecified';
}

function normalizeRequestedType(rawType) {
    const normalized = String(rawType || '').trim().toLowerCase();
    if (!normalized) return 'unspecified';

    if (/(mcq|multiple\s*choice|single\s*choice|choose\s*one|radio|objective)/i.test(normalized)) {
        return 'multiple choice';
    }
    if (/(short\s*answer|short\s*text|long\s*answer|paragraph|open\s*ended|descriptive|text|textarea)/i.test(normalized)) {
        return 'text';
    }
    if (/(checkbox|multiple\s*select|multi\s*select|select\s*all)/i.test(normalized)) {
        return 'checkbox';
    }
    if (/(dropdown|select\s*box|select\s*list)/i.test(normalized)) {
        return 'dropdown';
    }
    if (/(rating|scale|nps)/i.test(normalized)) {
        return 'rating';
    }

    return 'unspecified';
}

function resolveRequestedQuestionCount(bodyCount, promptText) {
    const fromBody = Number(bodyCount);
    if (Number.isInteger(fromBody) && fromBody > 0) {
        return Math.min(fromBody, MAX_QUESTION_COUNT);
    }
    return extractRequestedQuestionCount(promptText);
}

function resolveRequestedQuestionType(bodyType, promptText) {
    const normalizedBodyType = normalizeRequestedType(bodyType);
    if (normalizedBodyType !== 'unspecified') return normalizedBodyType;
    return extractRequestedQuestionType(promptText);
}

function getFallbackMcqOptions(label = '') {
    const normalized = String(label).toLowerCase();

    if (/\b(recommend|attend again|return|go again)\b/i.test(normalized)) {
        return ['Definitely yes', 'Probably yes', 'Not sure', 'Probably no'];
    }

    if (/\b(satisfaction|satisfied|experience|quality|useful|helpful|clarity|content|overall|rating)\b/i.test(normalized)) {
        return ['Excellent', 'Good', 'Average', 'Poor'];
    }

    if (/\b(improve|changes|future|better|suggestion|suggestions)\b/i.test(normalized)) {
        return ['Major changes needed', 'Some changes needed', 'Minor changes needed', 'No changes needed'];
    }

    return ['Excellent', 'Good', 'Average', 'Poor'];
}

function normalizeQuestionsForRequestedType(questions, requestedType) {
    if (!Array.isArray(questions)) return [];

    if (requestedType === 'text') {
        return questions.map((question) => ({
            ...question,
            fieldType: 'text',
            options: [],
        }));
    }

    if (requestedType === 'multiple choice') {
        return questions.map((question) => {
            const cleanedOptions = Array.isArray(question?.options)
                ? question.options.map((option) => String(option).trim()).filter(Boolean).filter((option) => !looksGenericOption(option))
                : [];

            return {
                ...question,
                fieldType: 'multiple choice',
                options: cleanedOptions.length > 0 ? cleanedOptions : getFallbackMcqOptions(question?.label),
            };
        });
    }

    if (requestedType === 'checkbox') {
        return questions.map((question) => {
            const cleanedOptions = Array.isArray(question?.options)
                ? question.options.map((option) => String(option).trim()).filter(Boolean).filter((option) => !looksGenericOption(option))
                : [];

            return {
                ...question,
                fieldType: 'checkbox',
                options: cleanedOptions.length > 0 ? cleanedOptions : ['Option 1', 'Option 2', 'Option 3'],
            };
        });
    }

    if (requestedType === 'dropdown') {
        return questions.map((question) => {
            const cleanedOptions = Array.isArray(question?.options)
                ? question.options.map((option) => String(option).trim()).filter(Boolean).filter((option) => !looksGenericOption(option))
                : [];

            return {
                ...question,
                fieldType: 'dropdown',
                options: cleanedOptions.length > 0 ? cleanedOptions : ['Excellent', 'Good', 'Average', 'Poor'],
            };
        });
    }

    if (requestedType === 'rating') {
        return questions.map((question) => ({
            ...question,
            fieldType: 'rating',
            options: ['1', '2', '3', '4', '5'],
        }));
    }

    return questions;
}

function shouldUseSpecificContextFacts(promptText) {
    const normalized = String(promptText || '').trim();
    if (!normalized) return false;

    const explicitFactSignals = [
        /\bgamestorm\b/i,
        /\bworkshop\b/i,
        /\bevent\b/i,
        /\bposter\b/i,
        /\bteam\b/i,
        /\bregistration\b/i,
        /\bfee\b/i,
        /\bsoftware\b/i,
        /\bspeaker\b/i,
        /\borganizer\b/i,
        /\bvenue\b/i,
        /\blocation\b/i,
        /\bdate\b/i,
        /\btime\b/i,
        /\bname\b/i,
        /\bwho\b/i,
        /\bwhat\b/i,
        /\bwhich\b/i,
        /\bwhere\b/i,
    ];

    return explicitFactSignals.some((pattern) => pattern.test(normalized));
}

function buildPrompt(selectedSuggestion, combinedContext, requestedCount, requestedType) {
    const contextSignals = extractContextSignals(`${selectedSuggestion}\n${combinedContext}`, 12);
    const signalText = contextSignals.length > 0 ? contextSignals.join(', ') : 'none detected';
    const useSpecificFacts = shouldUseSpecificContextFacts(selectedSuggestion);
    const contextModeLine = useSpecificFacts
        ? 'Use the trained document for specific facts only because the user explicitly asked about event details.'
        : 'Do not use named entities or poster facts from the trained document unless the user explicitly asks for them. Stay in generic feedback mode.';
    const requestedTypeLine = requestedType === 'unspecified'
        ? 'The user did not specify a question type. Choose the best type for each feedback question, but keep the output consistent.'
        : `The user explicitly requested question type: ${requestedType}. Every question must use this type.`;

    const typeRules = requestedType === 'multiple choice'
        ? '- Every question must be a multiple choice question with 3 to 5 relevant options.\n- Avoid text/short-answer fields.\n- Do not use generic yes/no options unless they are clearly appropriate.'
        : requestedType === 'text'
            ? '- Every question must be a short-answer style question.\n- Use fieldType "text" or "textarea" only.\n- Keep options empty.'
            : requestedType === 'checkbox'
                ? '- Every question must be a checkbox question with multiple selectable options.\n- Use fieldType "checkbox" only.'
                : requestedType === 'dropdown'
                    ? '- Every question must be a dropdown question with a clear option list.\n- Use fieldType "dropdown" only.'
                    : requestedType === 'rating'
                        ? '- Every question must be a rating-scale question.\n- Use fieldType "rating" only.'
                        : '- Use the best field type for each question, but keep the output aligned with the user request.';

    return `Act as a senior form designer who writes highly specific, context-grounded questions.

This is an EVENT FEEDBACK form for people who attended or may attend the event/workshop.
Do NOT ask poster-reading or brochure-fact questions such as team size, registration fee, mandatory software, venue-only trivia, or similar announcement details unless they are directly used as feedback signals.
The goal is to collect useful feedback for decision making, future planning, and improvement insights.
${contextModeLine}

User request: "${selectedSuggestion}"
Trained document context: "${combinedContext}"
Context signals: ${signalText}
${requestedTypeLine}

Generate exactly ${requestedCount} form questions.

Hard requirements:
- Every question must be tightly grounded in the request and the trained document context.
- If the user request is only a quantity/type request like "10 mcq questions" or similar, generate generic event-feedback questions and do not surface specific poster facts, names, fees, software, teams, or workshop details from the trained context.
- Every question must be framed as feedback from attendees or prospective attendees.
- Focus on positive aspects, experience quality, satisfaction, usefulness, clarity, negatives, pain points, friction, and suggestions for improvement.
- Include questions that help decision making: what worked well, what should change, what would make future events better, and whether the event should be repeated or expanded.
- Prefer concrete nouns, entities, dates, roles, locations, actions, metrics, and workflows from the context.
- Do not write poster-summary questions like "What is the team size requirement?", "Which workshop is being hosted?", "What software is mandatory?", or "What is the registration fee?" unless the answer is explicitly needed as feedback context.
- Do not ask generic filler questions with no decision value.
- If a question cannot be made specific to the event feedback goal, omit it and replace it with a more insightful one.
- Questions should sound like they belong to this exact event feedback use case, not a generic template.
${typeRules}

Option rules:
- Only use option-based question types when the context supports distinct choices.
- For "dropdown", "multiple choice", and "checkbox", every option must be specific, non-generic, and relevant to the context.
- Do not invent placeholder options such as "Other", "N/A", "None of the above", "Option 1", or "Yes/No" unless the context explicitly supports those exact choices.
- If the context does not support strong options, use an open-ended field type instead.

Suggested feedback topics to cover if relevant:
- Overall satisfaction and experience quality
- Most valuable part of the event/workshop
- Least useful part or friction points
- Speaker, mentor, or facilitator quality
- Content clarity, pace, and depth
- Venue, timing, logistics, and registration experience
- Confidence in attending or recommending future events
- Suggestions for improvement and future topics

Output format:
- Return ONLY a JSON array of objects.
- Each object must have: {"label": "...", "fieldType": "...", "options": []}
- For open-ended questions, use field types like "text" or "textarea" and keep options empty.

Return only the JSON array. No markdown, no explanation.`;
}

function extractRequestedQuestionCount(promptText) {
    if (!promptText) return DEFAULT_QUESTION_COUNT;

    const normalized = String(promptText);
    const lower = normalized.toLowerCase();
    const patterns = [
        /\b(?:give|create|generate|make|need|want|get|add)\b[\s\S]{0,12}?\b(\d{1,2})\b/i,
        /(\d{1,2})\s*(questions?|qs?|qns?)\b/i,
        /\b(generate|create|give|need|make)\s+(\d{1,2})\b/i,
        /\b(\d{1,2})\b(?=[\s\S]{0,20}\bquestions?|qs?|qns?|forms?|items?)\b/i,
    ];

    for (const pattern of patterns) {
        const match = normalized.match(pattern);
        if (!match) continue;

        const value = Number(match[1] || match[2]);
        if (Number.isInteger(value) && value > 0) {
            return Math.min(value, MAX_QUESTION_COUNT);
        }
    }

    const plainNumberMatches = lower.match(/\b(\d{1,2})\b/g) || [];
    if (plainNumberMatches.length === 1 && /\bquestions?|qs?|qns?|forms?|items?\b/i.test(lower)) {
        const value = Number(plainNumberMatches[0]);
        if (Number.isInteger(value) && value > 0) {
            return Math.min(value, MAX_QUESTION_COUNT);
        }
    }

    return DEFAULT_QUESTION_COUNT;
}

function buildFallbackFeedbackQuestion(index, requestedType) {
    const templates = [
        'How would you rate your overall experience with this event?',
        'Which part of the event was most valuable to you?',
        'Which part of the event needs the most improvement?',
        'How clear and useful was the content presented?',
        'How likely are you to attend a similar event in the future?',
        'What one change would most improve future events?',
    ];

    const baseLabel = templates[(index - 1) % templates.length];
    const label = index > templates.length ? `${baseLabel} (${index})` : baseLabel;

    if (requestedType === 'multiple choice') {
        return {
            label,
            fieldType: 'multiple choice',
            options: getFallbackMcqOptions(label),
        };
    }

    if (requestedType === 'checkbox') {
        return {
            label,
            fieldType: 'checkbox',
            options: ['Content quality', 'Session usefulness', 'Event organization', 'Venue and logistics'],
        };
    }

    if (requestedType === 'dropdown') {
        return {
            label,
            fieldType: 'dropdown',
            options: ['Excellent', 'Good', 'Average', 'Needs improvement'],
        };
    }

    if (requestedType === 'rating') {
        return {
            label,
            fieldType: 'rating',
            options: ['1', '2', '3', '4', '5'],
        };
    }

    return {
        label,
        fieldType: 'text',
        options: [],
    };
}

function buildDeterministicQuestionSet(selectedSuggestion, combinedContext, requestedType, requestedCount) {
    const contextSignals = extractContextSignals(`${selectedSuggestion}\n${combinedContext}`, 8);
    const contextHint = contextSignals.length > 0 ? ` for ${contextSignals[0]}` : '';
    const templates = [
        `How would you rate your overall experience${contextHint}?`,
        `Which part of the event was most valuable${contextHint}?`,
        `Which part of the event needs the most improvement${contextHint}?`,
        `How clear and useful was the content presented${contextHint}?`,
        `How engaging was the event format or session flow${contextHint}?`,
        `How satisfied were you with the speakers or facilitators${contextHint}?`,
        `How likely are you to attend a similar event again${contextHint}?`,
        `How likely are you to recommend this event to others${contextHint}?`,
        `How well did the event meet your expectations${contextHint}?`,
        `How useful were the practical takeaways from the event${contextHint}?`,
        `How well were the topics aligned with your needs${contextHint}?`,
        `How would you rate the venue, timing, and logistics${contextHint}?`,
        `What was the biggest friction point during the event${contextHint}?`,
        `What would make future events more valuable for you${contextHint}?`,
        `What did the event do especially well${contextHint}?`,
        `What should definitely be changed for the next event${contextHint}?`,
        `How appropriate was the pace and depth of the sessions${contextHint}?`,
        `How confident do you feel about applying what you learned${contextHint}?`,
        `How useful was the communication before or during the event${contextHint}?`,
        `How likely is it that this event should be repeated or expanded${contextHint}?`,
        `What topic should be included in a future event${contextHint}?`,
        `How would you rate the event organization overall${contextHint}?`,
        `What feedback would help improve future editions${contextHint}?`,
        `How well did the event deliver value for your time${contextHint}?`,
        `What is one thing that would make this event better next time${contextHint}?`,
    ];

    const deduped = [];
    const seen = new Set();

    for (let i = 0; i < templates.length && deduped.length < requestedCount; i += 1) {
        const baseLabel = templates[i];
        const key = baseLabel.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);

        let question = {
            label: baseLabel,
            fieldType: requestedType,
            options: [],
        };

        if (requestedType === 'multiple choice') {
            question.options = getFallbackMcqOptions(baseLabel);
        } else if (requestedType === 'checkbox') {
            question.options = ['Content quality', 'Event organization', 'Venue and logistics', 'Speaker quality'];
        } else if (requestedType === 'dropdown') {
            question.options = ['Excellent', 'Good', 'Average', 'Needs improvement'];
        } else if (requestedType === 'rating') {
            question.options = ['1', '2', '3', '4', '5'];
        }

        if (requestedType === 'text') {
            question.fieldType = 'text';
        }

        deduped.push(question);
    }

    while (deduped.length < requestedCount) {
        deduped.push(buildFallbackFeedbackQuestion(deduped.length + 1, requestedType));
    }

    return deduped.slice(0, requestedCount);
}

function ensureExactQuestionCount(primaryQuestions, allMappedQuestions, requestedType, requestedCount) {
    const finalQuestions = [];
    const seen = new Set();

    const pushUnique = (question) => {
        const label = String(question?.label || '').trim();
        if (!label) return;
        const key = label.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        finalQuestions.push({
            ...question,
            label,
        });
    };

    primaryQuestions.forEach(pushUnique);

    if (finalQuestions.length < requestedCount) {
        const secondaryCandidates = normalizeQuestionsForRequestedType(allMappedQuestions, requestedType);
        secondaryCandidates.forEach((question) => {
            if (finalQuestions.length < requestedCount) {
                pushUnique(question);
            }
        });
    }

    while (finalQuestions.length < requestedCount) {
        const nextIndex = finalQuestions.length + 1;
        pushUnique(buildFallbackFeedbackQuestion(nextIndex, requestedType));
    }

    return finalQuestions.slice(0, requestedCount);
}

function withTimeout(promise, timeoutMs, timeoutMessage = 'AI generation timed out') {
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
}

function isTransientAiError(error) {
    const status = Number(error?.status || error?.statusCode || 0);
    const message = String(error?.message || '').toLowerCase();

    if (status === 429 || status === 503 || status === 504) return true;
    if (message.includes('timed out')) return true;
    if (message.includes('unavailable')) return true;
    if (message.includes('high demand')) return true;
    if (message.includes('try again later')) return true;

    return false;
}

async function generateQuestionsFromModel(promptText) {
    const response = await withTimeout(
        ai.models.generateContent({
            model: "gemini-3.1-flash-lite-preview",
            contents: [{
                role: "user",
                parts: [{ text: promptText }],
            }],
        }),
        AI_CALL_TIMEOUT_MS,
        'AI generation timed out due to provider latency',
    );

    return response;
}

function parseModelQuestions(rawText) {
    if (!rawText) return [];

    const cleanJson = String(rawText).replace(/```json|```/g, '').trim();

    try {
        const parsed = JSON.parse(cleanJson);
        if (Array.isArray(parsed)) return parsed;
        if (parsed && Array.isArray(parsed.questions)) return parsed.questions;
        if (parsed && parsed.error === 'no_relevance') return [{ error: 'no_relevance' }];
    } catch (_) {
        // Try extracting the first JSON array block from noisy model output.
        const start = cleanJson.indexOf('[');
        const end = cleanJson.lastIndexOf(']');
        if (start >= 0 && end > start) {
            const arraySlice = cleanJson.slice(start, end + 1);
            try {
                const parsedArray = JSON.parse(arraySlice);
                if (Array.isArray(parsedArray)) return parsedArray;
            } catch (_) {
                return [];
            }
        }
        return [];
    }

    return [];
}

const generateFormQuestions = async (req, res) => {
    try {
        const { selectedSuggestion, requestedCount: bodyRequestedCount, requestedType: bodyRequestedType } = req.body;
        const userId = req.user?._id;
        const requestedCount = resolveRequestedQuestionCount(bodyRequestedCount, selectedSuggestion);
        const requestedType = resolveRequestedQuestionType(bodyRequestedType, selectedSuggestion);

        if (!selectedSuggestion) {
            return res.status(400).json({ error: "Prompt (selectedSuggestion) is required" });
        }

        // 1. Check if the user has any trained data at all for RAG
        console.log(`🔍 Checking RAG for userId: ${userId}`);
        
        // Ensure userId is valid
        if (!userId) {
            return res.status(401).json({ error: "User not authenticated", code: "NOT_AUTHENTICATED" });
        }

        // Convert userId to ObjectId if it's a string
        const userObjectId = userId instanceof mongoose.Types.ObjectId ? userId : new mongoose.Types.ObjectId(userId);
        const userHasChunks = await DocumentChunk.exists({ "metadata.userId": userObjectId });

        if (!userHasChunks) {
            console.log(`❌ No chunks found for userId: ${userId} in document_chunks collection.`);
            return res.status(422).json({ 
                error: "No trained data available. Please upload and train data in the Data Upload page first to generate questions.",
                code: "NO_TRAINED_DATA"
            });
        }

        // 2. Fetch the MOST RELEVANT context using RAG
        console.log(`🔍 Searching RAG for relevant context for: "${selectedSuggestion}"...`);
        let combinedContext = '';
        try {
            combinedContext = await getRelevantContext(selectedSuggestion, userObjectId, 10);
        } catch (ragError) {
            console.error('RAG context retrieval failed, continuing with request-only context:', ragError.message);
        }

        // 3. Validate combined context has sufficient information
        if (!combinedContext || combinedContext.trim().length < 50) {
            combinedContext = `Feedback context inferred from user request: ${selectedSuggestion}`;
        }

        if (requestedCount >= 12) {
            const deterministicQuestions = buildDeterministicQuestionSet(
                selectedSuggestion,
                combinedContext,
                requestedType,
                requestedCount,
            );

            return res.status(200).json({
                success: true,
                fallback: true,
                requestedCount,
                generatedCount: deterministicQuestions.length,
                questions: deterministicQuestions,
            });
        }

        // Generate questions using combined trained data
        const promptText = buildPrompt(selectedSuggestion, combinedContext, requestedCount, requestedType);
        const result = await generateQuestionsFromModel(promptText);

        const parsedQuestionsOrError = parseModelQuestions(result?.text);

        // Check if model detected no relevance
        if (Array.isArray(parsedQuestionsOrError) && parsedQuestionsOrError[0]?.error === "no_relevance") {
            return res.status(422).json({ 
                error: "There is no information about the given topic in the trained data. It requires more information. Please train relevant data in the Data Upload page.",
                code: "NO_RELEVANCE"
            });
        }

        const questions = Array.isArray(parsedQuestionsOrError) ? parsedQuestionsOrError : [];
        const mappedQuestions = Array.isArray(questions)
            ? questions.map((question) => {
                const label = String(question?.label || '').trim();
                const fieldType = String(question?.fieldType || '').trim().toLowerCase();
                const options = Array.isArray(question?.options)
                    ? question.options.map((option) => String(option).trim()).filter(Boolean)
                    : [];

                return {
                    ...question,
                    label,
                    fieldType,
                    options,
                };
            })
            : [];

        const filteredQuestions = mappedQuestions.filter((question) => question.label && !looksGenericQuestion(question.label));
        const primaryQuestions = normalizeQuestionsForRequestedType(filteredQuestions, requestedType);
        const normalizedQuestions = ensureExactQuestionCount(primaryQuestions, mappedQuestions, requestedType, requestedCount);

        // Validate that we got meaningful questions
        if (!normalizedQuestions || normalizedQuestions.length === 0) {
            return res.status(422).json({ 
                error: "Could not generate relevant questions from the trained data. Please train more relevant data in the Data Upload page.",
                code: "NO_QUESTIONS_GENERATED"
            });
        }

        res.status(200).json({
            success: true,
            requestedCount,
            generatedCount: normalizedQuestions.length,
            questions: normalizedQuestions,
        });
    } catch (error) {
        if (isTransientAiError(error)) {
            console.warn('Question generation provider busy; returning fallback set:', error.message);
        } else {
            console.error("Question Gen Error:", error);
        }
        
        // Check for API key issues
        if (error.message && error.message.includes('API key')) {
            console.error("API Key Error");
            return res.status(500).json({ 
                error: "Server configuration error. Please contact support.",
                code: "API_KEY_ERROR"
            });
        }

        // Check for network/API errors
        if (error.message && error.message.includes('fetch')) {
            console.error("API Call Error");
            return res.status(503).json({ 
                error: "AI service temporarily unavailable. Please try again later.",
                code: "SERVICE_UNAVAILABLE"
            });
        }

        // Final fallback: return generated template questions rather than failing the request.
        const fallbackCount = resolveRequestedQuestionCount(req.body?.requestedCount, req.body?.selectedSuggestion);
        const fallbackType = resolveRequestedQuestionType(req.body?.requestedType, req.body?.selectedSuggestion);
        const fallbackQuestions = ensureExactQuestionCount([], [], fallbackType, fallbackCount);

        if (fallbackQuestions.length > 0) {
            return res.status(200).json({
                success: true,
                fallback: true,
                requestedCount: fallbackCount,
                generatedCount: fallbackQuestions.length,
                questions: fallbackQuestions,
            });
        }

        console.error("Unexpected error:", error.message);
        return res.status(500).json({ 
            error: "Failed to generate questions. Please try again.",
            code: "GENERATION_FAILED"
        });
    }
};

module.exports = {
    generateFormQuestions
};
