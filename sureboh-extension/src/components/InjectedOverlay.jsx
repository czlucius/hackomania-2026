import React, { useState } from 'react';
import { ExplainabilityTooltip } from './ExplainabilityTooltip';
import { CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';

export function InjectedOverlay({ text, onVerifiedClick }) {
    const [assessment, setAssessment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [revealed, setRevealed] = useState(false);

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
                sources: []
            });
            setLoading(false);
        }
    }, [text]);

    if (loading) return null;

    const score = assessment?.trust_score ?? 0;

    if (score > 80) {
        return (
            <ExplainabilityTooltip assessment={assessment}>
                <div className="absolute top-1 right-2 cursor-pointer z-50">
                    <CheckCircle2 className="w-4 h-4 text-green-500 fill-green-100" />
                </div>
            </ExplainabilityTooltip>
        );
    }

    if (score >= 40 && score <= 79) {
        return (
            <div className="absolute inset-0 rounded-lg border-l-4 border-yellow-400 shadow-[rgba(253,224,71,0.3)_0px_0px_8px_0px] pointer-events-none">
                <ExplainabilityTooltip assessment={assessment}>
                    <div className="absolute -left-3 -top-2 cursor-pointer pointer-events-auto bg-white rounded-full p-1 shadow-md">
                        <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    </div>
                </ExplainabilityTooltip>
            </div>
        );
    }

    // Misleading Claim (< 40)
    return (
        <div className={`absolute inset-0 z-50 rounded-lg flex items-center justify-center transition-all ${revealed ? 'pointer-events-none bg-transparent' : 'bg-white/30 backdrop-blur-md'}`}>
            {!revealed && (
                <ExplainabilityTooltip assessment={assessment}>
                    <button
                        onClick={() => setRevealed(true)}
                        className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-full shadow-lg text-sm font-semibold transition-transform hover:scale-105"
                    >
                        <ShieldAlert className="w-4 h-4" />
                        ⚠️ Misleading Claim: Click to Reveal
                    </button>
                </ExplainabilityTooltip>
            )}
        </div>
    );
}
