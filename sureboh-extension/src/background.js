// background.js - Analysis is now handled by the Python backend

async function analyzeWithBackend(text, url = '') {
    const body = {
        content: text,
        source_url: url,
        type: 'article',
        from_user: null,
        group_chat: false
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

    // 1. Clear Verdict Explanation
    if (data.explanation) {
        summaryEn.push({
            type: data.classification === "Likely accurate" ? 'real' : 'fake',
            text: data.explanation
        });
    }
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

    // 2. Supporting Evidence or Missing Context
    if (data.classification === "Likely accurate") {
        if (data.supporting_evidence) summaryEn.push({ type: 'real', text: `Verified: ${data.supporting_evidence}` });
        if (data.zh?.supporting_evidence) summaryZh.push({ type: 'real', text: `已验证: ${data.zh.supporting_evidence}` });
        if (data.ms?.supporting_evidence) summaryMs.push({ type: 'real', text: `Disahkan: ${data.ms.supporting_evidence}` });
    } else if (data.missing_context) {
        summaryEn.push({ type: 'info', text: `Context needed: ${data.missing_context}` });
        if (data.zh?.missing_context) summaryZh.push({ type: 'info', text: `缺少背景: ${data.zh.missing_context}` });
        if (data.ms?.missing_context) summaryMs.push({ type: 'info', text: `Konteks diperlukan: ${data.ms.missing_context}` });
    }

    // 3. Recommended Action
    if (data.recommended_action) summaryEn.push({ type: 'info', text: `Action: ${data.recommended_action}` });
    if (data.zh?.recommended_action) summaryZh.push({ type: 'info', text: `建议: ${data.zh.recommended_action}` });
    if (data.ms?.recommended_action) summaryMs.push({ type: 'info', text: `Tindakan: ${data.ms.recommended_action}` });

    return {
        trust_score: trustScore,
        classification: data.classification,
        confidence_level: data.confidence_level,
        verdict: {
            en: verdictEn,
            zh: verdictEn === "Likely accurate" ? "基本准确" : verdictEn === "Potentially misleading" ? "可能含有误导性信息" : "未经证实 / 不确定",
            ms: verdictEn === "Likely accurate" ? "Mungkin tepat" : verdictEn === "Potentially misleading" ? "Mungkin mengelirukan" : "Tidak disahkan / tidak pasti"
        },
        summary: {
            en: summaryEn,
            zh: summaryZh,
            ms: summaryMs
        },
        sources: data.source_credibility ? [{ name: data.source_credibility, icon: "🔍", url: url }] : []
    };
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
