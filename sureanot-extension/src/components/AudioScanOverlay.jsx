import React, { useState, useEffect } from 'react';
import { Mic, CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';
import { ExplainabilityTooltip } from './ExplainabilityTooltip';

export function AudioScanOverlay({ chromeMessage }) {
    const [assessment, setAssessment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (!chrome?.runtime?.sendMessage) {
            setLoading(false);
            setError(true);
            return;
        }

        let retries = 0;
        const maxRetries = 2;

        const sendAnalysis = () => {
            chrome.runtime.sendMessage(chromeMessage, (response) => {
                if (chrome.runtime.lastError || !response) {
                    if (retries < maxRetries) {
                        retries++;
                        setTimeout(sendAnalysis, 2000 * retries);
                    } else {
                        setError(true);
                        setLoading(false);
                    }
                    return;
                }
                if (response.error) {
                    setError(true);
                    setLoading(false);
                    return;
                }
                setAssessment(response);
                setLoading(false);
            });
        };

        sendAnalysis();
    }, [chromeMessage]);

    if (loading) {
        return (
            <div className="w-full pointer-events-auto mt-1 flex px-3 py-2 rounded-lg border bg-gray-50 text-gray-500 shadow-sm items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-primary shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <Mic className="w-4 h-4 shrink-0 text-gray-400" />
                <span className="text-[13px] font-medium font-sans">Transcribing voice message…</span>
            </div>
        );
    }

    if (error || !assessment) return null;

    const score = assessment.trust_score ?? 50;

    let scoreColor = 'bg-red-50 text-red-800 border-red-200';
    let Icon = ShieldAlert;

    if (score > 80) {
        scoreColor = 'bg-green-50 text-green-800 border-green-200';
        Icon = CheckCircle2;
    } else if (score >= 40) {
        scoreColor = 'bg-yellow-50 text-yellow-800 border-yellow-200';
        Icon = AlertTriangle;
    }

    const transcript = assessment.transcript || '';

    return (
        <div className="w-full pointer-events-auto mt-1">
            <ExplainabilityTooltip assessment={assessment}>
                <div className={`cursor-pointer w-full flex flex-col gap-1 px-3 py-2 rounded-lg border shadow-sm transition-all hover:shadow-md hover:scale-[1.01] ${scoreColor}`}>
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                            <Mic className="w-3.5 h-3.5 shrink-0 opacity-70" />
                            <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                            <span className="text-[11px] sm:text-[13px] font-bold tracking-tight">
                                {assessment?.verdict?.en || 'Voice: Unverified'}
                            </span>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs opacity-90 font-medium whitespace-nowrap">
                            <span>🎙️ Voice</span>
                            <span>•</span>
                            <span>Hover for Analysis</span>
                            <span>•</span>
                            <span>{score}% Trust</span>
                        </div>
                    </div>
                    {transcript.length > 0 && (
                        <p className="text-[10px] opacity-70 italic leading-snug truncate">
                            &ldquo;{transcript.length > 100 ? transcript.slice(0, 100) + '…' : transcript}&rdquo;
                        </p>
                    )}
                </div>
            </ExplainabilityTooltip>
        </div>
    );
}
