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
        sources: (data.sources || []).map(src => {
            let faviconUrl = null;
            if (src.url) {
                try {
                    const domain = new URL(src.url).hostname;
                    faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
                } catch (e) {}
            }
            return { name: src.name, url: src.url || null, faviconUrl };
        }),
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

async function analyzeImageWithBackend(imageUrl, imageB64, mime, alt, platform) {
    const cacheKey = getImageCacheKey(imageUrl, imageB64);
    if (cacheKey && imageCache.has(cacheKey)) {
        console.log('SureAnot.ai: Image cache hit');
        return imageCache.get(cacheKey);
    }

    // Instagram CDN URLs (fbcdn.net / cdninstagram.com) are signed and can't be
    // fetched directly by OpenAI. Fetch the image in the service worker and
    // convert to base64 before forwarding to the backend.
    if (!imageB64 && imageUrl && (
        imageUrl.includes('fbcdn.net') ||
        imageUrl.includes('cdninstagram.com') ||
        platform === 'Instagram'
    )) {
        try {
            const resp = await fetch(imageUrl);
            if (resp.ok) {
                const contentType = resp.headers.get('content-type') || 'image/jpeg';
                const buffer = await resp.arrayBuffer();
                const bytes = new Uint8Array(buffer);
                let binary = '';
                for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
                imageB64 = btoa(binary);
                mime = contentType.split(';')[0] || 'image/jpeg';
                imageUrl = null; // don't send the URL to the backend anymore
            }
        } catch (e) {
            console.warn('SureAnot.ai: Could not fetch Instagram image for base64 encoding', e);
        }
    }

    const body = {
        context: alt || null,
        platform: platform || null,
    };

    if (imageB64) {
        body.image_b64 = imageB64;
        body.image_mime = mime || 'image/jpeg';
    } else if (imageUrl) {
        body.image_url = imageUrl;
    } else {
        return null;
    }

    const res = await fetch('http://localhost:8000/api/image/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error(`Image API error: ${res.status}`);
    const result = await res.json();

    if (cacheKey) imageCache.set(cacheKey, result);
    return result;
}
