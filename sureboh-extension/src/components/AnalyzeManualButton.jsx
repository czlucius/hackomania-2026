import React, { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { InjectedOverlay } from './InjectedOverlay';

export function AnalyzeManualButton({ text, compact = false }) {
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    if (isAnalyzing) {
        return <InjectedOverlay text={text} />;
    }

    if (compact) {
        return (
            <button
                onClick={() => setIsAnalyzing(true)}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 text-xs font-medium transition-colors shadow-sm pointer-events-auto"
                style={{ whiteSpace: 'nowrap' }}
            >
                <ShieldAlert className="w-3.5 h-3.5 text-gray-500" />
                Check claim
            </button>
        );
    }

    return (
        <div className="w-full pointer-events-auto mt-2">
            <button
                onClick={() => setIsAnalyzing(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium transition-colors shadow-sm"
            >
                <ShieldAlert className="w-4 h-4 text-gray-500" />
                Analyze with SureAnot.ai
            </button>
        </div>
    );
}
