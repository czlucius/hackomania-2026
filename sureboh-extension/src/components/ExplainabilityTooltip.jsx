import React, { useState } from 'react';
import { useFloating, useInteractions, useHover, offset, flip, shift, arrow } from '@floating-ui/react';
import { KampungToggle } from './KampungToggle';

export function ExplainabilityTooltip({ children, assessment }) {
    const [isOpen, setIsOpen] = useState(false);
    const [lang, setLang] = useState('en');

    const { x, y, strategy, refs, context } = useFloating({
        open: isOpen,
        onOpenChange: setIsOpen,
        placement: 'top-start',
        middleware: [offset(10), flip(), shift()],
    });

    const hover = useHover(context);
    const { getReferenceProps, getFloatingProps } = useInteractions([hover]);

    const scoreColor = assessment?.trust_score > 80
        ? 'text-green-500 stroke-green-500'
        : assessment?.trust_score >= 40
            ? 'text-yellow-500 stroke-yellow-500'
            : 'text-red-500 stroke-red-500';

    return (
        <>
            <div ref={refs.setReference} {...getReferenceProps()} className="inline-block relative">
                {children}
            </div>
            {isOpen && (
                <div
                    ref={refs.setFloating}
                    style={{
                        position: strategy,
                        top: y ?? 0,
                        left: x ?? 0,
                        width: 'max-content',
                    }}
                    {...getFloatingProps()}
                    className="z-[9999] bg-white rounded-xl shadow-2xl border border-gray-100 p-4 w-72 pointer-events-auto"
                >
                    <KampungToggle currentLang={lang} onLanguageChange={setLang} />

                    <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-100">
                        {/* Progress Ring */}
                        <div className="relative w-12 h-12 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-gray-100" />
                                <circle
                                    cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent"
                                    strokeDasharray={20 * 2 * Math.PI}
                                    strokeDashoffset={20 * 2 * Math.PI * (1 - (assessment?.trust_score || 0) / 100)}
                                    className={`transition-all duration-1000 ease-out ${scoreColor}`}
                                />
                            </svg>
                            <span className={`absolute text-xs font-bold ${scoreColor.split(' ')[0]}`}>{assessment?.trust_score}%</span>
                        </div>

                        <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">AI Confidence</p>
                            <h3 className={`text-lg font-bold ${scoreColor.split(' ')[0]}`}>{assessment?.verdict[lang]}</h3>
                        </div>
                    </div>

                    <ul className="space-y-2 mb-3">
                        {assessment?.summary[lang]?.map((point, idx) => (
                            <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                                <span className="text-blue-500 mt-1">•</span>
                                <span className="leading-snug">{point}</span>
                            </li>
                        ))}
                    </ul>

                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                        <span className="text-xs text-gray-400 font-medium">Sources:</span>
                        {assessment?.sources?.length > 0 ? (
                            <div className="flex gap-1">
                                {assessment.sources.map((src, i) => (
                                    <span key={i} title={src.name} className="text-lg cursor-help bg-gray-50 rounded p-1">{src.icon}</span>
                                ))}
                            </div>
                        ) : (
                            <span className="text-xs text-gray-500 italic">None</span>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
