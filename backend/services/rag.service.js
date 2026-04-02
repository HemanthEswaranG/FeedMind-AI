const { InferenceClient } = require("@huggingface/inference");
const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");
const mongoose = require('mongoose');
const DocumentChunk = require('../models/DocumentChunk.model');
const dotenv = require("dotenv");

dotenv.config();

const hf = new InferenceClient(process.env.HF_TOKEN);

/**
 * Generates numerical embeddings for text chunks using HuggingFace.
 */
const getEmbedding = async (text) => {
    try {
        const response = await hf.featureExtraction({
            model: "sentence-transformers/all-MiniLM-L6-v2",
            inputs: text,
        });
        // Ensure we return a flat array
        return Array.isArray(response[0]) ? response[0] : response;
    } catch (error) {
        console.error("Error getting embedding from HF:", error);
        throw error;
    }
};

/**
 * Splits text into chunks and stores them into MongoDB for RAG.
 */
const ingestTextIntoRag = async (text, fileName, userId = null) => {
    if (!process.env.HF_TOKEN) {
        console.warn("HF_TOKEN not configured, skipping RAG ingestion.");
        return;
    }

    try {
        console.log(`🧠 Ingesting text into RAG (MongoDB) for file: ${fileName}`);
        
        // 1. Split text into manageable chunks
        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
        });
        const chunks = await splitter.splitText(text);

        console.log(`🧩 Split text into ${chunks.length} chunks. Creating embeddings...`);

        // 2. Process and save each chunk to MongoDB
        const storagePromises = chunks.map(async (chunk, index) => {
            try {
                const embedding = await getEmbedding(chunk);
                const doc = new DocumentChunk({
                    content: chunk,
                    embedding: embedding,
                    metadata: {
                        source: fileName,
                        userId: userId ? new mongoose.Types.ObjectId(userId) : null,
                    },
                });
                await doc.save();
                if (index === 0) console.log(`📄 First chunk saved successfully for ${fileName}`);
            } catch (err) {
                console.error(`❌ Error saving chunk ${index}:`, err.message);
                throw err;
            }
        });

        await Promise.all(storagePromises);
        
        console.log(`✅ RAG ingestion complete! Saved ${chunks.length} chunks.`);
    } catch (error) {
        console.error("❌ RAG ingestion failed:", error);
    }
};

/**
 * Uses MongoDB Atlas Vector Search to retrieve context and answer a query.
 * Note: You must have a vector search index named "vector_index" on the "document_chunks" collection.
 */
const resolveWithRAG = async (userQuery, userId = null) => {
    if (!process.env.HF_TOKEN) {
        throw new Error("RAG system not fully configured. HF_TOKEN is missing.");
    }

    // 1. Turn query into a vector
    const queryEmbedding = await getEmbedding(userQuery);
  
    // 2. Perform Vector Search (MongoDB Aggregation)
    // IMPORTANT: This requires an Atlas Vector Search index.
    const pipeline = [
        {
            "$vectorSearch": {
                "index": "vector_index", 
                "path": "embedding",
                "queryVector": queryEmbedding,
                "numCandidates": 100,
                "limit": 5,
            }
        }
    ];

    // If userId is provided, filter the results to only include the user's data
    let matches = await DocumentChunk.aggregate(pipeline);

    if (userId) {
        matches = matches.filter(m => m.metadata && m.metadata.userId && m.metadata.userId.toString() === userId.toString());
    }

    if (!matches || matches.length === 0) {
        console.log("No relevant context found in RAG.");
        return "I'm sorry, I couldn't find any relevant context to answer your question.";
    }

    const context = matches.map(m => m.content).join("\n");

    // 3. Generate Final AI Response with Context using HuggingFace or Gemini
    // Using HuggingFace's Llama model as per original intent
    const response = await hf.chatCompletion({
        model: "meta-llama/Llama-3.2-3B-Instruct",
        messages: [
            { role: "system", content: "Use the provided context to answer the question." },
            { role: "user", content: `Context:\n${context}\n\nQuestion: ${userQuery}` }
        ],
        temperature: 0.1,
        max_tokens: 300
    });

    return response.choices[0].message.content;
};

/**
 * Retrieves the most relevant context for a query without generating a dynamic response.
 */
const getRelevantContext = async (query, userId = null, limit = 5) => {
    if (!process.env.HF_TOKEN) {
        throw new Error("RAG system not fully configured. HF_TOKEN is missing.");
    }

    const queryEmbedding = await getEmbedding(query);
  
    const pipeline = [
        {
            "$vectorSearch": {
                "index": "vector_index", 
                "path": "embedding",
                "queryVector": queryEmbedding,
                "numCandidates": 100,
                "limit": limit,
            }
        }
    ];

    let matches = await DocumentChunk.aggregate(pipeline);

    if (userId) {
        matches = matches.filter(m => m.metadata && m.metadata.userId && m.metadata.userId.toString() === userId.toString());
    }

    return matches.map(m => m.content).join("\n\n---\n\n");
};

module.exports = {
    getEmbedding,
    ingestTextIntoRag,
    resolveWithRAG,
    getRelevantContext
};
