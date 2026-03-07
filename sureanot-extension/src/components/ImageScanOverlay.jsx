import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, ScanSearch } from 'lucide-react';

export function ImageScanOverlay({ chromeMessage, reactive }) {
    const [state, setState] = useState(reactive ? 'idle' : 'loading');
    const [result, setResult] = useState(null);
    const [isHovered, setIsHovered] = useState(false);

    const isTelegram = chromeMessage?.platform === 'Telegram Web';

    useEffect(() => {
        if (state !== 'loading') return;
        if (!chrome?.runtime?.sendMessage) { setState('idle'); return; }

        chrome.runtime.sendMessage(chromeMessage, (response) => {
            if (chrome.runtime.lastError || !response) { setState('idle'); return; }
            if (response.is_flagged) {
                setResult(response);
                setState('flagged');
            } else {
                setResult({ classification: 'safe', explanation: 'No AI generation or manipulation detected.' });
                setState('safe');
            }
        });
    }, [state]);

    if (state === 'idle' && !reactive) return null;

    // Reactive idle: small "Check Image" button bottom-left of the image
    if (state === 'idle') {
        return (
            <div className="absolute bottom-2 left-2 z-50 pointer-events-auto">
                <button
                    onClick={() => setState('loading')}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-sm text-white text-[11px] font-semibold hover:bg-black/90 transition-colors border border-white/20 shadow"
                >
                    <ScanSearch className="w-3 h-3" />
                    Check Image
                </button>
            </div>
        );
    }

    if (state === 'loading') {
        return (
            <div className="absolute top-2 left-2 z-50 pointer-events-none">
                <div className="flex items-center gap-1.5 bg-black/70 backdrop-blur-sm text-white px-2.5 py-1 rounded-full border border-white/20 shadow">
                    <svg className="animate-spin h-3 w-3 text-blue-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span className="text-[11px] font-medium">Scanning…</span>
                </div>
            </div>
        );
    }

    const isManipulated = result?.classification === 'manipulated';
    const bgColor = state === 'safe' ? 'bg-green-900/90 border-green-500/50' : (isManipulated ? 'bg-purple-900/90 border-purple-500/50' : 'bg-red-900/90 border-red-500/50');
    const TextColor = state === 'safe' ? 'text-green-300' : (isManipulated ? 'text-purple-300' : 'text-red-300');
    const Icon = state === 'safe' ? CheckCircle2 : AlertTriangle;

    let shortLabel = state === 'safe' ? 'Authentic' : (isManipulated ? 'AI Generated' : 'Flagged');
    let detailedLabel = state === 'safe'
        ? 'Likely Authentic / Not AI'
        : (isManipulated ? 'Likely AI-Generated' : 'Potentially Misleading');

    return (
        <div
            className="absolute top-2 left-2 right-2 flex pointer-events-none z-50"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div
                className={`flex items-start gap-2 backdrop-blur-sm border px-2.5 py-1.5 rounded-lg shadow-lg pointer-events-auto cursor-default transition-all duration-300 ${bgColor} text-white max-w-sm overflow-hidden`}
            >
                <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${TextColor}`} />
                <div className="flex flex-col gap-0.5 overflow-hidden">
                    <span className="text-xs font-bold tracking-tight whitespace-nowrap">
                        {isHovered ? detailedLabel : shortLabel}
                    </span>
                    {isHovered && result?.explanation && (
                        <span className="text-[11px] font-medium leading-snug opacity-90 mt-1 pb-0.5" style={{ whiteSpace: 'normal', wordWrap: 'break-word', display: 'block', minWidth: '150px' }}>
                            {result.explanation}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
