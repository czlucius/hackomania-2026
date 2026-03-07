require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDB, insertVote } = require('./db');

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

// Main telemetry endpoint for votes
app.post('/api/telemetry/vote', async (req, res) => {
    try {
        const { claim_text, verdict, trust_score, vote, platform } = req.body;

        if (!claim_text || vote === undefined) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Insert into ClickHouse
        await insertVote(
            String(claim_text),
            String(verdict || 'unknown'),
            Number(trust_score || 0),
            Number(vote),
            String(platform || 'unknown')
        );

        res.status(200).json({ success: true, message: 'Vote recorded' });
    } catch (error) {
        console.error("Error processing vote:", error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// Basic healthcheck
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Initialize database then start server
initDB().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Telemetry Server running on http://localhost:${PORT}`);
    });
});
