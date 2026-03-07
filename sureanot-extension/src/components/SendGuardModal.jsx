import React, { useEffect } from 'react';
import { ShieldAlert, ShieldCheck, Send, X } from 'lucide-react';

export function SendGuardModal({ assessment, onSendAnyway, onCancel, safeMode = false }) {
    const isLoading = !assessment && !safeMode;
    const score = assessment?.trust_score ?? 0;
    const reason = assessment?.summary?.en?.[0]?.text || assessment?.verdict?.en || 'This message scored low on our trust scale.';

    // Auto-dismiss the "All Clear" panel after 3 seconds
    useEffect(() => {
        if (safeMode && onCancel) {
            const t = setTimeout(onCancel, 3000);
            return () => clearTimeout(t);
        }
    }, [safeMode, onCancel]);

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2147483646,
                pointerEvents: 'auto',
            }}
        >
            {/* Backdrop */}
            <div
                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)' }}
                onClick={onCancel}
            />

            {/* Card */}
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-5 w-[340px] max-w-[90vw] relative z-10 font-sans">
                {isLoading ? (
                    <div className="flex flex-col items-center gap-3 py-4">
                        <svg className="animate-spin h-8 w-8 text-orange-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <p className="text-sm font-semibold text-gray-600">Checking for misinformation…</p>
                        <p className="text-xs text-gray-400">SureAnot.ai</p>
                    </div>
                ) : safeMode ? (
                    /* ── All Clear panel ── */
                    <>
                        <div className="flex items-start gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                                <ShieldCheck className="w-5 h-5 text-green-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-gray-900 text-sm leading-snug">All Clear — looks safe to send!</h3>
                                <p className="text-xs text-gray-500 mt-0.5">No misinformation detected by SureAnot.ai</p>
                            </div>
                            <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 shrink-0">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="bg-green-50 border border-green-100 rounded-lg p-3 mb-4">
                            <div className="flex items-center gap-2">
                                <div className="h-1.5 flex-1 bg-green-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-green-500 rounded-full transition-all duration-500" style={{ width: `${score}%` }} />
                                </div>
                                <span className="text-xs font-bold text-green-700 whitespace-nowrap">{score}% Trust</span>
                            </div>
                        </div>
                        <button
                            onClick={onCancel}
                            className="w-full px-3 py-2 rounded-lg bg-green-500 text-white text-sm font-semibold hover:bg-green-600 transition-colors"
                        >
                            Got it
                        </button>
                    </>
                ) : (
                    <>
                        {/* Header */}
                        <div className="flex items-start gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                                <ShieldAlert className="w-5 h-5 text-red-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-gray-900 text-sm leading-snug">Heads up — SureAnot.ai flagged this</h3>
                                <p className="text-xs text-gray-500 mt-0.5">This message may contain misinformation</p>
                            </div>
                            <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 shrink-0">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Reason + score */}
                        <div className="bg-red-50 border border-red-100 rounded-lg p-3 mb-4">
                            <p className="text-xs text-red-800 font-medium leading-relaxed">{reason}</p>
                            <div className="mt-2.5 flex items-center gap-2">
                                <div className="h-1.5 flex-1 bg-red-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-red-400 rounded-full transition-all duration-500" style={{ width: `${score}%` }} />
                                </div>
                                <span className="text-xs font-bold text-red-600 whitespace-nowrap">{score}% Trust</span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                            <button
                                onClick={onCancel}
                                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Keep Editing
                            </button>
                            <button
                                onClick={onSendAnyway}
                                className="flex-1 px-3 py-2 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors flex items-center justify-center gap-1.5"
                            >
                                <Send className="w-3.5 h-3.5" />
                                Send Anyway
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
