const { GoogleGenAI } = require("@google/genai");
const mongoose = require("mongoose");
const Response = require("../models/Response.model.js");

// Initialize AI if API key is present
let ai = null;
if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
} else {
    console.warn("⚠️ AI Controller: GEMINI_API_KEY is not set.");
}

const SUMMARY_SECTIONS = [
    {
        key: "positive",
        title: "POSITIVE FEEDBACK",
        patterns: [/^positive feedback\s*:?$/i, /^positive\s*:?$/i],
    },
    {
        key: "negative",
        title: "NEGATIVE FEEDBACK",
        patterns: [/^negative feedback\s*:?$/i, /^negative\s*:?$/i],
    },
    {
        key: "improvement",
        title: "AREAS FOR IMPROVEMENT",
        patterns: [/^areas? for improvement\s*:?$/i, /^improvements?\s*:?$/i],
    },
    {
        key: "suggestions",
        title: "AI SUGGESTIONS & RECOMMENDATIONS",
        patterns: [/^ai suggestions?\s*&\s*recommendations?\s*:?$/i, /^recommendations?\s*:?$/i, /^suggestions?\s*:?$/i],
    },
    {
        key: "priorities",
        title: "PRIORITIES & ACTION ITEMS",
        patterns: [/^priorities\s*&\s*action items\s*:?$/i, /^action items\s*:?$/i, /^priorities\s*:?$/i],
    },
];

const isStructuredSummaryQuestion = (question = "") => {
    const q = String(question || "").toLowerCase();
    return (
        q.includes("positive feedback") ||
        q.includes("negative feedback") ||
        q.includes("areas for improvement") ||
        q.includes("ai suggestions") ||
        q.includes("priorities & action items")
    );
};

const AI_MODEL_TIMEOUT_MS = Number(process.env.AI_MODEL_TIMEOUT_MS) || 20000;

const withTimeout = async (promise, timeoutMs) => {
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
            const err = new Error(`AI model timed out after ${timeoutMs}ms`);
            err.code = "AI_TIMEOUT";
            reject(err);
        }, timeoutMs);
    });

    try {
        return await Promise.race([promise, timeoutPromise]);
    } finally {
        clearTimeout(timeoutId);
    }
};

const toPercent = (count, total) => {
    if (!total) return 0;
    return Math.round((count / total) * 100);
};

const computeResponseStats = (responses = []) => {
    const total = responses.length;
    const sentiment = { positive: 0, neutral: 0, negative: 0, unknown: 0 };
    const status = { valid: 0, spam: 0, flagged: 0 };
    let completionRateSum = 0;
    let completionRateCount = 0;

    responses.forEach((r) => {
        const s = String(r?.sentiment || "unknown").toLowerCase();
        if (Object.prototype.hasOwnProperty.call(sentiment, s)) sentiment[s] += 1;

        const st = String(r?.status || "valid").toLowerCase();
        if (Object.prototype.hasOwnProperty.call(status, st)) status[st] += 1;

        if (typeof r?.completionRate === "number" && Number.isFinite(r.completionRate)) {
            completionRateSum += r.completionRate;
            completionRateCount += 1;
        }
    });

    const avgCompletionRate = completionRateCount ? Math.round(completionRateSum / completionRateCount) : 0;

    return {
        total,
        sentiment,
        status,
        avgCompletionRate,
        positivePct: toPercent(sentiment.positive, total),
        negativePct: toPercent(sentiment.negative, total),
        neutralPct: toPercent(sentiment.neutral, total),
        validPct: toPercent(status.valid, total),
        flaggedPct: toPercent(status.flagged, total),
        spamPct: toPercent(status.spam, total),
    };
};

const cleanPointLine = (line) => {
    const value = String(line || "")
        .replace(/^#+\s*/, "")
        .replace(/^\*\*|\*\*$/g, "")
        .replace(/^[-•*]+\s*/, "")
        .replace(/^\d+[.)]\s*/, "")
        .trim();

    if (!value) return "";
    return value.replace(/\s+/g, " ");
};

const getStructuredFallbackSections = (responses = []) => {
    const stats = computeResponseStats(responses);

    return {
        positive: [
            stats.positivePct >= 50
                ? `A majority of feedback is positive (${stats.positivePct}%), indicating strong overall satisfaction in key experience areas.`
                : `Positive responses still appear across submissions, showing strengths worth preserving and scaling.`,
            `Most submissions are usable for decision making, with ${stats.validPct}% marked as valid responses.`,
            stats.avgCompletionRate > 0
                ? `Average completion rate is ${stats.avgCompletionRate}%, which indicates how consistently respondents engage through the form.`
                : `Respondents are engaging with the form, providing enough signal for trend-based analysis.`,
        ],
        negative: [
            stats.negativePct > 0
                ? `${stats.negativePct}% of responses carry negative sentiment, signaling recurring friction points that need targeted fixes.`
                : `No major negative trend is visible, but isolated issues should still be tracked for early risk detection.`,
            stats.flaggedPct > 0 || stats.spamPct > 0
                ? `Flagged/spam responses are present (${stats.flaggedPct + stats.spamPct}%), so data quality controls should be tightened before deeper analysis.`
                : `Low moderation noise suggests the current dataset quality is stable for operational decision-making.`,
            `Some feedback likely lacks context depth, which can hide root causes behind low-level sentiment labels.`,
        ],
        improvement: [
            `Prioritize review of recurring complaints in low-sentiment responses and map each issue to an owner and timeline.`,
            `Refine questions that receive vague answers by adding examples or clearer response options to improve insight quality.`,
            `Introduce a monthly quality check on response validity and completion patterns to prevent data drift.`,
        ],
        suggestions: [
            `Segment insights by form and sentiment to separate structural issues from one-off feedback noise.`,
            `Add follow-up prompts for low-rated responses so teams can capture precise reasons behind dissatisfaction.`,
            `Track trend movement weekly and alert when negative sentiment or flagged rates rise above baseline.`,
        ],
        priorities: [
            `Address the highest-impact negative themes first, because they directly affect satisfaction and retention outcomes.`,
            `Improve question clarity and response quality controls next to increase confidence in future AI summaries.`,
            `Establish a repeatable insight-review cadence so improvements are measured and adjusted continuously.`,
        ],
    };
};

const extractStructuredSections = (answer = "") => {
    const sections = {
        positive: [],
        negative: [],
        improvement: [],
        suggestions: [],
        priorities: [],
    };

    const lines = String(answer || "")
        .replace(/\r\n/g, "\n")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

    let currentKey = null;
    lines.forEach((line) => {
        const normalizedHeading = line.replace(/^#+\s*/, "").replace(/^\*\*|\*\*$/g, "").trim();
        const matched = SUMMARY_SECTIONS.find((section) => section.patterns.some((pattern) => pattern.test(normalizedHeading)));

        if (matched) {
            currentKey = matched.key;
            return;
        }

        if (!currentKey) return;

        const point = cleanPointLine(line);
        if (!point) return;
        if (/^none\.?$/i.test(point)) return;
        sections[currentKey].push(point);
    });

    return sections;
};

const formatSectionBlock = (title, points = []) => {
    const safePoints = points.filter(Boolean).slice(0, 5);
    const numbered = (safePoints.length ? safePoints : ["None"]).map((point, idx) => `${idx + 1}. ${point}`);
    return `${title}:\n${numbered.join("\n")}`;
};

const buildStructuredSummaryAnswer = (rawAnswer, responses = []) => {
    const extracted = extractStructuredSections(rawAnswer);
    const fallback = getStructuredFallbackSections(responses);

    return SUMMARY_SECTIONS
        .map((section) => formatSectionBlock(section.title, extracted[section.key]?.length ? extracted[section.key] : fallback[section.key]))
        .join("\n\n");
};

const buildResponseQuery = (userId, formId) => {
    const query = { owner: userId };

    if (formId && formId !== 'overall') {
        if (!mongoose.isValidObjectId(formId)) {
            return { query, invalidFormId: true };
        }
        query.form = formId;
    }

    return { query, invalidFormId: false };
};

const cleanInsightAnswer = (answer) => {
    if (!answer) return answer;

    const boilerplatePatterns = [
        /^based on an analysis of.*?:\s*/i,
        /^based on the analysis of.*?:\s*/i,
        /^the following themes represent.*?:\s*/i,
        /^here are the key insights(?: from the responses)?(?:\s*:\s*)?/i,
        /^here are the main insights(?: from the responses)?(?:\s*:\s*)?/i,
        /^the responses show that\s*/i,
        /^overall,?\s*/i,
        /^###\s*/,
    ];

    let cleaned = String(answer).trim();
    boilerplatePatterns.forEach((pattern) => {
        cleaned = cleaned.replace(pattern, '');
    });

    cleaned = cleaned.replace(/^[-•\s]+/, '').trim();
    return cleaned || answer;
};

const extractInsightPoints = (answer) => {
    if (!answer) {
        return [
            "Positive:",
            "1. None",
            "",
            "Neutral:",
            "1. None",
            "",
            "Negative:",
            "1. None",
        ].join("\n");
    }

    const lines = String(answer)
        .replace(/\r\n/g, '\n')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

    const blockedPrefixes = [
        'analytical observation',
        'key trends & insights',
        'common positive themes',
        'sentiment/data discrepancy',
        'high performance',
        'if you require',
        'for more',
        'if you want',
        'summary',
    ];

    const sections = { positive: [], neutral: [], negative: [] };
    const seen = new Set();
    let currentSection = null;

    const addPoint = (text, section = "positive") => {
        const point = text
            .replace(/^\*\*|\*\*$/g, '')
            .replace(/^[-•*]+\s*/, '')
            .replace(/^\d+[.)]\s*/, '')
            .replace(/^\s+|\s+$/g, '')
            .replace(/\s+/g, ' ');

        if (!point) return;
        const lowered = point.toLowerCase();
        if (blockedPrefixes.some((prefix) => lowered.startsWith(prefix))) return;
        if (/^(there is|there are|of the|as an expert|if you require|please let me know|focusing on|here is the data-driven analysis)/i.test(point)) return;
        if (point.length < 10) return;
        if (seen.has(lowered)) return;
        seen.add(lowered);
        sections[section].push(point);
    };

    lines.forEach((line) => {
        if (/^positive\s*:?$/i.test(line)) {
            currentSection = "positive";
            return;
        }

        if (/^neutral\s*:?$/i.test(line)) {
            currentSection = "neutral";
            return;
        }

        if (/^negative\s*:?$/i.test(line)) {
            currentSection = "negative";
            return;
        }

        const isBullet = /^[-*•]\s+/.test(line);
        const isNumbered = /^\d+[.)]\s+/.test(line);
        if (isBullet || isNumbered) {
            addPoint(line, currentSection || "positive");
            return;
        }

        const sectionHeading = /^(positive|neutral|negative|key trends & insights|analytical observations|common positive themes)\s*:?$/i.test(line);
        if (sectionHeading) return;
    });

    if (!sections.positive.length && !sections.neutral.length && !sections.negative.length) {
        return [
            "Positive:",
            "1. None",
            "",
            "Neutral:",
            "1. None",
            "",
            "Negative:",
            "1. None",
        ].join("\n");
    }

    const toBlock = (title, items) => {
        const numbered = (items.length ? items : ["None"]).map((point, index) => `${index + 1}. ${point}`);
        return `${title}:\n${numbered.join("\n")}`;
    };

    return [
        toBlock("Positive", sections.positive),
        "",
        toBlock("Neutral", sections.neutral),
        "",
        toBlock("Negative", sections.negative),
    ].join("\n");
};

const analyzeResponses = async (req, res) => {
    try {
        const { formId, question } = req.body;
        const userId = req.user?._id;

        if (!userId) {
            return res.status(401).json({ error: "Not authorized" });
        }

        if (!ai) {
            return res.status(503).json({ error: "AI service is currently unavailable. Please check server configuration." });
        }

        if (!question || question.trim().length < 2) {
            return res.status(400).json({ error: "Please provide a valid question." });
        }

        // 1. Fetch responses belonging to the user
        const { query, invalidFormId } = buildResponseQuery(userId, formId);
        if (invalidFormId) {
            return res.status(400).json({ error: "Invalid form filter selected." });
        }

        // Keep context compact to reduce model latency and avoid client timeouts.
        const responses = await Response.find(query)
            .sort({ createdAt: -1 })
            .limit(40);

        if (!responses.length) {
            return res.status(200).json({ 
                answer: "I don't have any responses to analyze yet. Once your form receives some feedback, I'll be able to identify patterns and answer your questions!" 
            });
        }

        // 2. Prepare aggregated context for AI
        const contextData = responses.map((r, idx) => {
            const date = new Date(r.createdAt).toLocaleDateString();
            const answers = Array.isArray(r.answers) ? r.answers : [];
            const answersStr = answers
                .slice(0, 12)
                .map((ans) => `- ${ans?.questionText || 'Question'}: ${Array.isArray(ans?.answer) ? ans.answer.join(', ') : String(ans?.answer ?? '-')}`)
                .join('\n');
            return `[Response ${idx + 1} | ${date} | Sentiment: ${r.sentiment}]\n${answersStr}`;
        }).join('\n\n---\n\n');

        const wantsStructuredSummary = isStructuredSummaryQuestion(question);

        // 3. Draft Prompt
        const prompt = `Act as an expert feedback analyst for FeedMind AI.
    Analyze the following form responses and answer the user's question accurately.

--- RESPONSES DATA ---
${contextData}
--- END DATA ---

USER QUESTION: "${question}"

GUIDELINES:
${wantsStructuredSummary
            ? `    - Output only the points. No intro, no conclusion.
    - Use exactly this structure and headings:
    POSITIVE FEEDBACK:
    1. point

    NEGATIVE FEEDBACK:
    1. point

    AREAS FOR IMPROVEMENT:
    1. point

    AI SUGGESTIONS & RECOMMENDATIONS:
    1. point

    PRIORITIES & ACTION ITEMS:
    1. point
    - Keep points concise, specific, and actionable.
    - If a section has no clear insight, write "None" as a point.`
            : `    - Output only the points. No intro, no conclusion, no extra commentary.
    - Use exactly this structure:
    Positive:
    1. point
    2. point

    Neutral:
    1. point
    2. point

    Negative:
    1. point
    2. point
    - Keep each point short, specific, and insight-focused.
    - Use a section only if there is at least one real insight for it.
    - If a section has no meaningful insight, write "None" under it.
    - Do not write paragraphs.
    - Do not mention how many responses were analyzed.
    - Do not use phrases like "Based on an analysis of...", "the following themes represent...", or similar boilerplate.
    - If there isn't enough detail for a claim, say that directly in the relevant section.`}

RESPONSE:`;

        // 4. Generate Content
        // Using the pattern from question.controller.js
        const result = await withTimeout(
            ai.models.generateContent({
                model: "gemini-3.1-flash-lite-preview",
                contents: [{
                    role: "user",
                    parts: [{ text: prompt }]
                }]
            }),
            AI_MODEL_TIMEOUT_MS
        );

        const cleaned = cleanInsightAnswer(result.text || "");
        const answer = wantsStructuredSummary
            ? buildStructuredSummaryAnswer(cleaned, responses)
            : extractInsightPoints(cleaned || "Positive:\n1. None");
        
        res.status(200).json({ success: true, answer });

    } catch (error) {
        console.error("AI Analysis Controller Error:", error);

        try {
            const fallbackUserId = req.user?._id;
            if (!fallbackUserId) {
                return res.status(401).json({ error: "Not authorized" });
            }

            const { query } = buildResponseQuery(fallbackUserId, req.body?.formId);
            const fallbackResponses = await Response.find(query).sort({ createdAt: -1 }).limit(100);

            if (fallbackResponses.length > 0) {
                const fallbackQuestion = req.body?.question || "";
                const wantsStructuredSummary = isStructuredSummaryQuestion(fallbackQuestion);

                return res.status(200).json({
                    success: true,
                    answer: wantsStructuredSummary
                        ? buildStructuredSummaryAnswer("", fallbackResponses)
                        : extractInsightPoints(cleanInsightAnswer(`Positive:\n1. Insights were generated from existing response trends.`)),
                    fallback: true,
                });
            }
        } catch (fallbackError) {
            console.error('Fallback analysis failed:', fallbackError);
        }

        res.status(500).json({ error: "Failed to analyze responses. Please try again later." });
    }
};

module.exports = {
    analyzeResponses
};
