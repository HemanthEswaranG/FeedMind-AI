const express = require('express');
const ocrRoutes = require('./routes/new-ocr-route.js');

const app = express();
const PORT = process.env.PORT || 3000;


app.use(express.json());

// Routes
app.use('/api/ocr', ocrRoutes);

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});