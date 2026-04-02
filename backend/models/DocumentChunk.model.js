const mongoose = require('mongoose');

const documentChunkSchema = new mongoose.Schema({
    content: {
        type: String,
        required: true,
    },
    embedding: {
        type: [Number],
        required: true,
    },
    metadata: {
        source: String,
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// Since we are using MongoDB Atlas Vector Search, you'll need to create a search index in your Atlas dashboard.
// If the user wants me to do that via code, I can't, but I can provide the configuration.

module.exports = mongoose.model('DocumentChunk', documentChunkSchema);
