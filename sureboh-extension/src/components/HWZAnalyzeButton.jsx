import React, { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { InjectedOverlay } from './InjectedOverlay';

export function HWZAnalyzeButton({ text }) {
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    if (isAnalyzing) {
        return <InjectedOverlay text={text} />;
    }

    return (
        <div className="w-full pointer-events-auto mt-2">
            <button
                onClick={() => setIsAnalyzing(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium transition-colors shadow-sm"
            >
                <ShieldAlert className="w-4 h-4 text-gray-500" />
                Analyze with SureBoh.ai
            </button>
        </div>
    );
}
