// Mock database of viral rumors
const mockDb = {
    "cdc vouchers expiry scam": {
        trust_score: 25,
        verdict: {
            en: "Misleading",
            zh: "误导",
            ms: "Mengelirukan"
        },
        summary: {
            en: [
                { type: 'fake', text: "Fake Claim: CDC vouchers expire early and Singpass login is required." },
                { type: 'real', text: "Real Fact: Vouchers do not expire early. Legitimate links end strictly with .gov.sg." }
            ],
            zh: [
                { type: 'fake', text: "虚假声明: 社理会邻里购物券会提前过期，需要登录 Singpass。" },
                { type: 'real', text: "真实事实: 购物券不会提前过期。正规链接严格以 .gov.sg 结尾。" }
            ],
            ms: [
                { type: 'fake', text: "Dakwaan Palsu: Baucar CDC luput lebih awal dan log masuk Singpass diperlukan." },
                { type: 'real', text: "Hakikatnya: Baucar tidak luput lebih awal. Pautan sah berakhir dengan .gov.sg." }
            ]
        },
        sources: [
            { name: "Gov.sg", icon: "🏛️" },
            { name: "SPF", icon: "👮" }
        ]
    },
    "default_verified": {
        trust_score: 95,
        verdict: {
            en: "Verified",
            zh: "已验证",
            ms: "Telah Disahkan"
        },
        summary: {
            en: [
                { type: 'real', text: "This information matches official government announcements directly." },
                { type: 'info', text: "No signs of manipulation or phishing attempts detected." }
            ],
            zh: [
                { type: 'real', text: "此信息与官方政府公告完全相符。" },
                { type: 'info', text: "未检测到任何操纵或网络钓鱼企图。" }
            ],
            ms: [
                { type: 'real', text: "Maklumat ini sejajar sepenuhnya dengan pengumuman rasmi kerajaan." },
                { type: 'info', text: "Tiada tanda manipulasi atau percubaan memancing data dikesan." }
            ]
        },
        sources: [
            { name: "Gov.sg", icon: "🏛️" }
        ]
    },
    "default_unverified": {
        trust_score: 60,
        verdict: {
            en: "Unverified",
            zh: "未验证",
            ms: "Tidak Disahkan"
        },
        summary: {
            en: [
                { type: 'info', text: "This claim lacks sufficient corroboration from credible sources. Proceed with caution." }
            ],
            zh: [
                { type: 'info', text: "这一说法缺乏来自可靠来源的充分佐证。分享前请谨慎对待。" }
            ],
            ms: [
                { type: 'info', text: "Dakwaan ini kurang sokongan yang mencukupi daripada sumber yang boleh dipercayai. Berhati-hati." }
            ]
        },
        sources: []
    }
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'ANALYZE_MESSAGE') {
        const text = request.text.toLowerCase();

        // Simple mock logic based on keywords
        let response;
        if (text.includes("cdc voucher") || text.includes("scam") || text.includes("free money")) {
            response = mockDb["cdc vouchers expiry scam"];
        } else if (text.includes("official") || text.includes("gov.sg")) {
            response = mockDb["default_verified"];
        } else {
            // Default to unverified for most other messages just as a demonstration,
            // or we can just not return anything if it's too short, but let's test the UI.
            response = mockDb["default_unverified"];
        }

        // Simulate network delay
        setTimeout(() => {
            sendResponse(response);
        }, 500);

        return true; // indicates asynchronous response
    } else if (request.type === 'SUBMIT_VOTE') {
        const { vote, assessment } = request;

        // Determine original claim text from assessment if possible, or just send a placeholder
        // In a real app we'd pass the actual text from the content script
        const claimText = assessment?.verdict?.en || 'Unknown Claim';

        // Identify platform (can be expanded later by passing it from content script)
        const platform = sender?.tab?.url?.includes('whatsapp') ? 'WhatsApp'
            : sender?.tab?.url?.includes('hardwarezone') ? 'HardwareZone'
                : sender?.tab?.url?.includes('telegram') ? 'Telegram'
                    : 'Unknown';

        fetch('http://localhost:8000/api/telemetry/vote', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                claim_text: claimText,
                verdict: assessment?.verdict?.en,
                trust_score: assessment?.trust_score,
                vote: vote,
                platform: platform
            })
        })
            .then(res => res.json())
            .then(data => console.log('Vote submitted to telemetry backend:', data))
            .catch(err => console.error('Failed to submit vote:', err));

        return true;
    } else if (request.type === 'ANALYZE_IMAGE') {
        const { src, alt } = request;

        // Mock image detection based on keywords in alt text or src URL
        let response = null;
        const textToAnalyze = (src + " " + alt).toLowerCase();

        if (textToAnalyze.includes('ai-generated') || textToAnalyze.includes('midjourney') || textToAnalyze.includes('deepfake')) {
            response = {
                warning: "Potential AI-generated or manipulated image detected. Verify the source."
            };
        } else if (textToAnalyze.includes('scam') || textToAnalyze.includes('phishing')) {
            response = {
                warning: "This image contains patterns associated with known phishing campaigns."
            };
        }

        // Simulate network delay for image processing
        setTimeout(() => {
            sendResponse(response);
        }, 800);

        return true;
    }
});
