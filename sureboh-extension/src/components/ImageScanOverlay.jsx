import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, ScanSearch } from 'lucide-react';

export function ImageScanOverlay({ chromeMessage, reactive }) {
    const [state, setState] = useState(reactive ? 'idle' : 'loading');
    const [result, setResult] = useState(null);

    useEffect(() => {
        if (state !== 'loading') return;
        if (!chrome?.runtime?.sendMessage) { setState('idle'); return; }

        chrome.runtime.sendMessage(chromeMessage, (response) => {
            if (chrome.runtime.lastError || !response) { setState('idle'); return; }
            if (response.is_flagged) {
                setResult(response);
                setState('flagged');
            } else {
                setState('safe');
            }
        });
    }, [state]);

    // Auto-dismiss safe badge after 3 s
    useEffect(() => {
        if (state !== 'safe') return;
        const t = setTimeout(() => setState('idle'), 3000);
        return () => clearTimeout(t);
    }, [state]);

    if (state === 'idle' && !reactive) return null;

    // Reactive idle: small "Check Image" button bottom-left of the image
    if (state === 'idle') {
        return (
            <div className="absolute bottom-2 left-2 z-50" style={{ pointerEvents: 'auto' }}>
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
                    <span className="text-[11px] font-medium">Scanning image…</span>
                </div>
            </div>
        );
    }

    if (state === 'safe') {
        return (
            <div className="absolute top-2 left-2 z-50 pointer-events-none">
                <div className="flex items-center gap-1.5 bg-green-900/80 backdrop-blur-sm text-white px-2.5 py-1 rounded-full border border-green-500/40 shadow">
                    <CheckCircle2 className="w-3 h-3 text-green-300" />
                    <span className="text-[11px] font-medium">Image looks safe</span>
                </div>
            </div>
        );
    }

    if (state === 'flagged') {
        return (
            <div className="absolute top-2 left-2 right-2 z-50" style={{ pointerEvents: 'auto' }}>
                <div className="bg-red-900/90 backdrop-blur-sm border border-red-500/50 text-white px-3 py-2 rounded-lg shadow-lg flex items-start gap-2 max-w-sm">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-200" />
                    <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-bold tracking-tight">
                            Image Alert
                            {result?.classification && result.classification !== 'safe' && (
                                <span className="ml-1.5 font-normal opacity-75 capitalize">· {result.classification.replace(/_/g, ' ')}</span>
                            )}
                        </span>
                        <span className="text-[11px] text-red-100 font-medium leading-snug">{result?.warning || result?.explanation}</span>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}
