// background.js - Analysis is now handled by the Python backend

// Open settings page on first install for onboarding
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        chrome.runtime.openOptionsPage();
    }
});

async function analyzeWithBackend(text, url = '') {
    // Get user language preference from storage
    const settings = await chrome.storage.sync.get(['kampungLang']);
    const preferredLang = settings.kampungLang || 'en';

    const body = {
        content: text,
        source_url: url,
        type: 'article',
        from_user: null,
        group_chat: false,
        preferred_lang: preferredLang
    };

    const res = await fetch('http://localhost:8000/api/check', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    if (!res.ok) {
        throw new Error(`Backend API error: ${res.status}`);
    }

    const data = await res.json();

    // Map backend response (FakeNewsAnalysisResult) to a concise UI format
    let verdictEn = "Unverified / uncertain";
    let trustScore = 50;

    if (data.classification === "Likely accurate") {
        verdictEn = "Likely accurate";
        trustScore = 95;
    } else if (data.classification === "Potentially misleading") {
        verdictEn = "Potentially misleading";
        trustScore = 15;
    }

    // Create clean, concise summary lists for EN, ZH, and MS
    const summaryEn = [];
    const summaryZh = [];
    const summaryMs = [];

    // 1. Clear Verdict Explanation (Localized)
    if (data.explanation) {
        summaryEn.push({
            type: data.classification === "Likely accurate" ? 'real' : 'fake',
            text: data.explanation
        });
    }
    // Only populate if backend sent it (respecting optimization)
    if (data.zh?.explanation) {
        summaryZh.push({
            type: data.classification === "Likely accurate" ? 'real' : 'fake',
            text: data.zh.explanation
        });
    }
    if (data.ms?.explanation) {
        summaryMs.push({
            type: data.classification === "Likely accurate" ? 'real' : 'fake',
            text: data.ms.explanation
        });
    }

    // 2. Secondary Fields (English Only - Optimized for Speed)
    if (data.classification === "Likely accurate") {
        if (data.supporting_evidence) summaryEn.push({ type: 'real', text: `Verified: ${data.supporting_evidence}` });
    } else if (data.missing_context) {
        summaryEn.push({ type: 'info', text: `Context needed: ${data.missing_context}` });
    }

    if (data.recommended_action) summaryEn.push({ type: 'info', text: `Action: ${data.recommended_action}` });

    return {
        trust_score: trustScore,
        classification: data.classification,
        confidence_level: data.confidence_level,
        verdict: {
            en: data.verdict || verdictEn,
            zh: data.zh?.explanation ? (verdictEn === "Likely accurate" ? "基本准确" : verdictEn === "Potentially misleading" ? "可能含有误导性信息" : "未经证实 / 不确定") : null,
            ms: data.ms?.explanation ? (verdictEn === "Likely accurate" ? "Mungkin tepat" : verdictEn === "Potentially misleading" ? "Mungkin mengelirukan" : "Tidak disahkan / tidak pasti") : null
        },
        summary: {
            en: summaryEn,
            zh: summaryZh,
            ms: summaryMs
        },
        sources: data.source_credibility ? [{ name: data.source_credibility, icon: "🔍", url: url }] : [],
        original_explanation: data.explanation // Store for on-demand translation
    };
}

async function translateOnDemand(text, targetLang) {
    const res = await fetch('http://localhost:8000/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, target_lang: targetLang })
    });
    if (!res.ok) throw new Error("Translation failed");
    return await res.json();
}

// Fallback response for errors
const errorFallback = {
    trust_score: 50,
    classification: "Unverified / uncertain",
    confidence_level: "Low",
    verdict: { en: "Unverified / uncertain", zh: "未经证实 / 不确定", ms: "Tidak disahkan / tidak pasti" },
    summary: {
        en: [{ type: 'info', text: "Analysis could not be completed. Please try again." }],
        zh: [{ type: 'info', text: "无法完成分析，请再试一次。" }],
        ms: [{ type: 'info', text: "Analisis tidak dapat diselesaikan. Sila cuba lagi." }]
    },
    sources: []
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'ANALYZE_MESSAGE') {
        analyzeWithBackend(request.text, sender?.tab?.url)
            .then(result => sendResponse(result))
            .catch(err => {
                console.error('Backend analysis failed:', err);
                sendResponse(errorFallback);
            });

        return true; // indicates asynchronous response
    } else if (request.type === 'TRANSLATE_RESULT') {
        translateOnDemand(request.text, request.targetLang)
            .then(result => sendResponse(result))
            .catch(err => {
                console.error('Translation failed:', err);
                sendResponse({ explanation: "Error translating." });
            });
        return true;
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
                verdict: assessment?.classification || 'Unknown',
                trust_score: assessment?.trust_score || 50,
                vote: vote === 1 ? 'upvote' : 'downvote',
                platform: platform,
                url: assessment?.source_url || sender?.tab?.url || ''
            })
        })
            .then(res => res.json())
            .then(data => console.log('Vote submitted:', data))
            .catch(err => console.error('Failed to submit vote:', err));

        return true;

    } else if (request.type === 'ANALYZE_IMAGE') {
        const { src } = request;

        fetch('http://localhost:8000/api/image/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_url: src })
        })
            .then(res => res.json())
            .then(data => sendResponse({ warning: data.warning }))
            .catch(err => {
                console.error('Image analysis failed:', err);
                sendResponse({ warning: null });
            });

        return true;
    }
});
