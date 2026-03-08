import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, CheckCircle2, ScanSearch, Fingerprint, HelpCircle } from 'lucide-react';

// Alert style by classification
const ALERT_STYLES = {
    uncertain: {
        bg: 'bg-gray-800/90', border: 'border-gray-500/50',
        textBody: 'text-gray-100', icon: 'text-gray-300', Icon: HelpCircle,
    },
    potentially_misleading: {
        bg: 'bg-amber-900/90', border: 'border-amber-500/50',
        textBody: 'text-amber-100', icon: 'text-amber-200', Icon: AlertTriangle,
    },
};
const DEFAULT_ALERT = {
    bg: 'bg-red-900/90', border: 'border-red-500/50',
    textBody: 'text-red-100', icon: 'text-red-200', Icon: AlertTriangle,
};
function alertStyle(cls) { return ALERT_STYLES[cls] || DEFAULT_ALERT; }

function SynthIDPill({ r }) {
    const detected = r.is_synthid_watermarked;
    return (
        <div className={`flex items-center gap-1.5 backdrop-blur-sm text-white px-2.5 py-1 rounded-full shadow self-start ${detected ? 'bg-purple-900/80 border border-purple-500/40' : 'bg-black/60 border border-white/20'}`}>
            <Fingerprint className={`w-3 h-3 ${detected ? 'text-purple-300' : 'text-gray-400'}`} />
            <span className="text-[11px] font-medium">
                SynthID: {detected ? 'AI watermark' : 'No watermark'} · {(r.confidence * 100).toFixed(0)}%
            </span>
        </div>
    );
}

function SynthIDControl({ chromeMessage, onStart }) {
    const [status, setStatus] = useState('idle');
    const [synthResult, setSynthResult] = useState(null);

    const check = () => {
        if (status !== 'idle') return;
        setStatus('loading');
        onStart?.();
        chrome.runtime.sendMessage(
            { type: 'SYNTHID_CHECK', src: chromeMessage.src, imageB64: chromeMessage.imageB64, mime: chromeMessage.mime },
            (response) => {
                if (chrome.runtime.lastError || !response) { setStatus('idle'); return; }
                setSynthResult(response);
                setStatus('done');
            }
        );
    };

    if (status === 'done' && synthResult) return <SynthIDPill r={synthResult} />;

    if (status === 'loading') {
        return (
            <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-sm text-white px-2.5 py-1 rounded-full border border-white/20 shadow self-start">
                <svg className="animate-spin h-3 w-3 text-purple-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-[11px] font-medium">Checking SynthID…</span>
            </div>
        );
    }

    return (
        <button
            onClick={check}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm text-white text-[11px] font-semibold hover:bg-black/80 transition-colors border border-white/20 shadow self-start"
            style={{ pointerEvents: 'auto' }}
        >
            <Fingerprint className="w-3 h-3 text-purple-300" />
            Check SynthID
        </button>
    );
}

export function ImageScanOverlay({ chromeMessage, reactive }) {
    const [state, setState] = useState(reactive ? 'idle' : 'loading');
    const [result, setResult] = useState(null);
    const synthidActive = useRef(false);

    useEffect(() => {
        if (state !== 'loading') return;
        if (!chrome?.runtime?.sendMessage) { setState('idle'); return; }

        chrome.runtime.sendMessage(chromeMessage, (response) => {
            if (chrome.runtime.lastError || !response) { setState('idle'); return; }
            setResult(response);
            setState(response.is_flagged ? 'flagged' : 'safe');
        });
    }, [state]);

    // Auto-dismiss safe badge after 3s, but not if user clicked SynthID
    useEffect(() => {
        if (state !== 'safe') return;
        const t = setTimeout(() => { if (!synthidActive.current) setState('idle'); }, 3000);
        return () => clearTimeout(t);
    }, [state]);

    if (state === 'idle' && !reactive) return null;

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
            <div className="absolute top-2 left-2 z-50 flex flex-col gap-1" style={{ pointerEvents: 'none' }}>
                <div className="flex items-center gap-1.5 bg-green-900/80 backdrop-blur-sm text-white px-2.5 py-1 rounded-full border border-green-500/40 shadow">
                    <CheckCircle2 className="w-3 h-3 text-green-300" />
                    <span className="text-[11px] font-medium">Image looks safe</span>
                </div>
                <SynthIDControl chromeMessage={chromeMessage} onStart={() => { synthidActive.current = true; }} />
            </div>
        );
    }

    if (state === 'flagged') {
        const cls = result?.classification;
        const style = alertStyle(cls);
        const { Icon } = style;
        return (
            <div className="absolute top-2 left-2 right-2 z-50 flex flex-col gap-1" style={{ pointerEvents: 'auto' }}>
                <div className={`${style.bg} backdrop-blur-sm border ${style.border} text-white px-3 py-2 rounded-lg shadow-lg flex items-start gap-2 max-w-sm`}>
                    <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${style.icon}`} />
                    <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-bold tracking-tight">
                            Image Alert
                            {cls && cls !== 'safe' && (
                                <span className="ml-1.5 font-normal opacity-75 capitalize">· {cls.replace(/_/g, ' ')}</span>
                            )}
                        </span>
                        <span className={`text-[11px] ${style.textBody} font-medium leading-snug`}>{result?.warning || result?.explanation}</span>
                    </div>
                </div>
                <SynthIDControl chromeMessage={chromeMessage} />
            </div>
        );
    }

    return null;
}

