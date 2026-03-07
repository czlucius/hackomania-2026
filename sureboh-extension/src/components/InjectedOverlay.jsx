import React, { useState } from 'react';
import { ExplainabilityTooltip } from './ExplainabilityTooltip';
import { CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';

export function InjectedOverlay({ text }) {
    const [assessment, setAssessment] = useState(null);
    const [loading, setLoading] = useState(true);

    React.useEffect(() => {
        if (!chrome?.runtime?.sendMessage) {
            // Fallback for development/testing outside extension
            setAssessment({
                trust_score: 40,
                verdict: { en: "Unverified" },
                summary: { en: ["Test mock data"] },
                sources: []
            });
            setLoading(false);
            return;
        }

        let retries = 0;
        const maxRetries = 3;

        const sendAnalysis = () => {
            chrome.runtime.sendMessage({ type: 'ANALYZE_MESSAGE', text }, (response) => {
                if (chrome.runtime.lastError) {
                    console.warn(`SureBoh.ai: Message channel closed (attempt ${retries + 1}):`, chrome.runtime.lastError.message);
                    if (retries < maxRetries) {
                        retries++;
                        setTimeout(sendAnalysis, 2000 * retries); // exponential backoff
                    } else {
                        console.error('SureBoh.ai: Max retries reached, giving up.');
                        setAssessment({
                            trust_score: null,
                            classification: 'Unverified / uncertain',
                            confidence_level: 'Low',
                            verdict: { en: 'Retry failed', zh: '重试失败', ms: 'Cuba semula gagal' },
                            summary: { en: [{ type: 'info', text: 'Analysis timed out. Click to retry.' }], zh: [], ms: [] },
                            sources: []
                        });
                        setLoading(false);
                    }
                    return;
                }
                setAssessment(response);
                setLoading(false);
            });
        };

        sendAnalysis();
    }, [text]);

    if (loading) {
        return (
            <div className="w-full pointer-events-auto mt-1 flex px-3 py-2 rounded-lg border bg-gray-50 text-gray-500 shadow-sm items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-[13px] font-medium font-sans">Analyzing with SureBoh.ai...</span>
            </div>
        );
    }
    const score = assessment?.trust_score ?? 0;

    let scoreColor = '';
    let Icon = ShieldAlert;

    if (score > 80) {
        scoreColor = 'bg-green-50 text-green-800 border-green-200';
        Icon = CheckCircle2;
    } else if (score >= 40) {
        scoreColor = 'bg-yellow-50 text-yellow-800 border-yellow-200';
        Icon = AlertTriangle;
    } else {
        scoreColor = 'bg-red-50 text-red-800 border-red-200';
        Icon = ShieldAlert;
    }

    return (
        <div className="w-full pointer-events-auto mt-1">
            <ExplainabilityTooltip assessment={assessment}>
                <div className={`cursor-pointer w-full flex flex-row items-center justify-between gap-2 px-3 py-2 rounded-lg border shadow-sm transition-all hover:shadow-md hover:scale-[1.01] ${scoreColor}`}>
                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                        <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                        <span className="text-[11px] sm:text-[13px] font-bold tracking-tight">{assessment?.verdict?.en || 'Analyzing...'}</span>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs opacity-90 font-medium whitespace-nowrap">
                        <span className="inline">Hover for Analysis</span>
                        <span className="inline">•</span>
                        <span>{score}% Trust</span>
                    </div>
                </div>
            </ExplainabilityTooltip>
        </div>
    );
}
