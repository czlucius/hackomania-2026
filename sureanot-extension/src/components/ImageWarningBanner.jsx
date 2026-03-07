import React from 'react';
import { AlertTriangle } from 'lucide-react';

export function ImageWarningBanner({ message }) {
    return (
        <div className="absolute top-2 left-2 right-2 z-50 pointer-events-auto">
            <div className="bg-red-900/90 backdrop-blur-sm border border-red-500/50 text-white px-3 py-2 rounded-lg shadow-lg flex items-start gap-2 max-w-sm">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-200" />
                <div className="flex flex-col">
                    <span className="text-sm font-bold tracking-tight">Image Alert</span>
                    <span className="text-xs text-red-100 font-medium leading-tight">
                        {message}
                    </span>
                </div>
            </div>
        </div>
    );
}
