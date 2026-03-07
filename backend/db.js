const { createClient } = require('@clickhouse/client');

// Connect to local ClickHouse by default
const client = createClient({
    url: process.env.CLICKHOUSE_URL || 'http://localhost:8123',
    username: process.env.CLICKHOUSE_USER || 'default',
    password: process.env.CLICKHOUSE_PASSWORD || '',
    database: process.env.CLICKHOUSE_DB || 'default',
});

async function initDB() {
    try {
        // Ensure the table exists
        await client.command({
            query: `
        CREATE TABLE IF NOT EXISTS assessment_votes (
          id UUID DEFAULT generateUUIDv4(),
          timestamp DateTime DEFAULT now(),
          claim_text String,
          verdict String,
          trust_score Int32,
          vote Int8,
          platform String DEFAULT 'unknown',
          classification String DEFAULT '',
          confidence_level String DEFAULT ''
        ) ENGINE = MergeTree()
        ORDER BY (timestamp, id);
      `
        });
        console.log("ClickHouse initialized: assessment_votes table ready.");
    } catch (error) {
        console.error("Failed to initialize ClickHouse DB:", error);
    }
}

async function insertVote(claimText, verdict, trustScore, vote, platform, classification, confidenceLevel) {
    try {
        await client.insert({
            table: 'assessment_votes',
            values: [
                {
                    claim_text: claimText,
                    verdict: verdict,
                    trust_score: trustScore,
                    vote: vote,
                    platform: platform,
                    classification: classification || '',
                    confidence_level: confidenceLevel || ''
                }
            ],
            format: 'JSONEachRow'
        });
        return true;
    } catch (error) {
        console.error("Failed to insert vote:", error);
        throw error;
    }
}

module.exports = {
    client,
    initDB,
    insertVote
};
