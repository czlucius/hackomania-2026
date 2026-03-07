const OPENAI_KEY = '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';
const OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions';

const SYSTEM_PROMPT = `You are SureBoh.ai, a fact-checking AI assistant specializing in Singapore misinformation. Analyze the provided text and return a JSON object (no markdown, just raw JSON) with this exact structure:
{
  "trust_score": <integer 0-100>,
  "verdict": {
    "en": "<one of: Verified | Unverified | Misleading | Scam>",
    "zh": "<Chinese translation of verdict>",
    "ms": "<Malay translation of verdict>"
  },
  "summary": {
    "en": [
      { "type": "<fake|real|info>", "text": "<concise point>" }
    ],
    "zh": [
      { "type": "<fake|real|info>", "text": "<Chinese translation>" }
    ],
    "ms": [
      { "type": "<fake|real|info>", "text": "<Malay translation>" }
    ]
  },
  "sources": [
    { "name": "<source name>", "icon": "<emoji>", "url": "<official URL if known, else omit>" }
  ]
}

Rules & Persona:
- You are decisive. If a claim matches a known news report, official government statement (e.g. SPF, MOH, MOT, Singapore Customs), or widely documented fact, mark it as **Verified** (Trust Score 80-100).
- If a claim is clearly false or matches a known scam/misinformation pattern, mark it as **Misleading** or **Scam** (Trust Score 0-30).
- Only use **Unverified** (Trust Score 40-70) if the claim is truly ambiguous, needs more info, or is a personal opinion/anecdote that cannot be fact-checked.
- For news reports (like cigarette seizures at Changi, police arrests, etc.), if the details (location, numbers, dates) match official reports, **VEIRFY IT**.
- Use type "fake" for the misinformation being claimed (if any), "real" for the correct fact, "info" for neutral observations.
- Always include gov.sg sources or official news links (AsiaOne, Straits Times, Mothership) if they are mentioned or relevant.
- Return ONLY valid JSON.`;

async function analyzeWithOpenAI(text) {
    const body = {
        model: 'gpt-4o-mini',
        temperature: 0.2,
        max_tokens: 1024,
        messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: `Text to analyze:\n"${text}"` }
        ],
        response_format: { type: 'json_object' }
    };

    const res = await fetch(OPENAI_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_KEY}`
        },
        body: JSON.stringify(body)
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`OpenAI API error: ${res.status} - ${err?.error?.message || res.statusText}`);
    }

    const data = await res.json();
    const rawText = data?.choices?.[0]?.message?.content;
    if (!rawText) throw new Error('No response from OpenAI');

    return JSON.parse(rawText);
}

// Fallback response for errors
const errorFallback = {
    trust_score: 50,
    verdict: { en: "Unverified", zh: "未验证", ms: "Tidak Disahkan" },
    summary: {
        en: [{ type: 'info', text: "Analysis could not be completed. Please try again." }],
        zh: [{ type: 'info', text: "无法完成分析，请再试一次。" }],
        ms: [{ type: 'info', text: "Analisis tidak dapat diselesaikan. Sila cuba lagi." }]
    },
    sources: []
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'ANALYZE_MESSAGE') {
        analyzeWithOpenAI(request.text)
            .then(result => sendResponse(result))
            .catch(err => {
                console.error('OpenAI analysis failed:', err);
                sendResponse(errorFallback);
            });

        return true; // indicates asynchronous response

    } else if (request.type === 'SUBMIT_VOTE') {
        const { vote, assessment } = request;
        const claimText = assessment?.verdict?.en || 'Unknown Claim';
        const platform = sender?.tab?.url?.includes('whatsapp') ? 'WhatsApp'
            : sender?.tab?.url?.includes('hardwarezone') ? 'HardwareZone'
                : sender?.tab?.url?.includes('telegram') ? 'Telegram'
                    : 'Unknown';

        fetch('http://localhost:8000/api/telemetry/vote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                claim_text: claimText,
                verdict: assessment?.verdict?.en,
                trust_score: assessment?.trust_score,
                vote: vote,
                platform: platform
            })
        })
            .then(res => res.json())
            .then(data => console.log('Vote submitted:', data))
            .catch(err => console.error('Failed to submit vote:', err));

        return true;

    } else if (request.type === 'ANALYZE_IMAGE') {
        const { src, alt } = request;
        let response = null;
        const textToAnalyze = (src + " " + alt).toLowerCase();

        if (textToAnalyze.includes('ai-generated') || textToAnalyze.includes('midjourney') || textToAnalyze.includes('deepfake')) {
            response = { warning: "Potential AI-generated or manipulated image detected. Verify the source." };
        } else if (textToAnalyze.includes('scam') || textToAnalyze.includes('phishing')) {
            response = { warning: "This image contains patterns associated with known phishing campaigns." };
        }

        setTimeout(() => sendResponse(response), 800);
        return true;
    }
});
