import React, { useState } from 'react';
import { ExplainabilityTooltip } from './ExplainabilityTooltip';
import { CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';

export function InjectedOverlay({ text }) {
    const [assessment, setAssessment] = useState(null);
    const [loading, setLoading] = useState(true);

    React.useEffect(() => {
        // Need to use chrome.runtime to communicate with background
        if (chrome?.runtime?.sendMessage) {
            chrome.runtime.sendMessage({ type: 'ANALYZE_MESSAGE', text }, (response) => {
                setAssessment(response);
                setLoading(false);
            });
        } else {
            // Fallback for development/testing outside extension
            setAssessment({
                trust_score: 40,
                verdict: { en: "Unverified" },
                summary: { en: ["Test mock data"] },
                sources: [
                    { name: "Singapore Police Force", icon: "👮", url: "https://www.police.gov.sg/" },
                    { name: "ScamShield", icon: "🛡️", url: "https://www.scamshield.org.sg/" }
                ]
            });
            setLoading(false);
        }
    }, [text]);

    if (loading) return null;

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
                <div className={`cursor-pointer w-full min-w-max flex flex-row items-center justify-between gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border shadow-sm transition-all hover:shadow-md hover:scale-[1.01] ${scoreColor}`}>
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
