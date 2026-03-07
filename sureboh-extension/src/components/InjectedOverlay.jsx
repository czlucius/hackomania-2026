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
            <div className="absolute inset-0 pointer-events-none flex justify-end items-end p-1">
                <ExplainabilityTooltip assessment={assessment}>
                    <div className="cursor-pointer pointer-events-auto bg-green-50 rounded-full shadow-sm">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                    </div>
                </ExplainabilityTooltip>
            </div>
        );
    }

    if (score >= 40 && score <= 79) {
        return (
            <div className="absolute inset-0 rounded border-l-4 border-yellow-400 pointer-events-none">
                <ExplainabilityTooltip assessment={assessment}>
                    <div className="absolute -left-3 -top-2 cursor-pointer pointer-events-auto bg-white rounded-full p-0.5 shadow-md">
                        <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    </div>
                </ExplainabilityTooltip>
            </div>
        );
    }

    // Misleading Claim (< 40)
    return (
        <div className={`absolute inset-0 z-50 rounded flex items-center justify-center transition-all duration-300 ${revealed ? 'pointer-events-none' : 'bg-red-500/20 backdrop-blur-[4px] pointer-events-auto'}`}>

            {/* Small Icon Badge visible after reveal */}
            {revealed && (
                <div className="absolute -right-2 -top-2 pointer-events-auto">
                    <ExplainabilityTooltip assessment={assessment}>
                        <div className="bg-white rounded-full p-1 cursor-pointer shadow-md border border-red-200">
                            <ShieldAlert className="w-4 h-4 text-red-600" />
                        </div>
                    </ExplainabilityTooltip>
                </div>
            )}

            {/* Big Button visible before reveal */}
            {!revealed && (
                <ExplainabilityTooltip assessment={assessment}>
                    <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setRevealed(true); }}
                        className="flex items-center gap-1.5 bg-red-50 text-red-700 border border-red-200 px-3 py-1.5 rounded shadow-lg text-[11px] font-bold transition-transform hover:scale-105"
                    >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        MISLEADING: Click
                    </button>
                </ExplainabilityTooltip>
            )}
        </div>
    );
}
