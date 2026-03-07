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
                "CDC vouchers do not expire early and legitimate links end with .gov.sg.",
                "Scammers use fake links to phish for Singpass credentials."
            ],
            zh: [
                "社理会邻里购物券不会提前过期，正规链接以 .gov.sg 结尾。",
                "诈骗者利用虚假链接试图钓取 Singpass 凭证。"
            ],
            ms: [
                "Baucar CDC tidak luput lebih awal dan pautan sah berakhir dengan .gov.sg.",
                "Penipu menggunakan pautan palsu untuk memancing data log masuk Singpass."
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
                "This information matches official government announcements.",
                "No signs of manipulation or phishing attempts detected."
            ],
            zh: [
                "此信息与官方政府公告相符。",
                "未检测到任何操纵或网络钓鱼企图。"
            ],
            ms: [
                "Maklumat ini sejajar dengan pengumuman rasmi kerajaan.",
                "Tiada tanda manipulasi atau percubaan memancing data dikesan."
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
                "This claim lacks sufficient corroboration from credible sources.",
                "Proceed with caution before sharing."
            ],
            zh: [
                "这一说法缺乏来自可靠来源的充分佐证。",
                "分享前请谨慎对待。"
            ],
            ms: [
                "Dakwaan ini kurang sokongan yang mencukupi daripada sumber yang boleh dipercayai.",
                "Berhati-hati sebelum berkongsi."
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
    }
});
