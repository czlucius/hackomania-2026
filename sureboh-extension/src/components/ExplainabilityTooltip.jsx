import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { useFloating, useInteractions, useHover, safePolygon, offset, flip, shift, useClick, useDismiss, useRole } from '@floating-ui/react';
import { ThumbsUp, ThumbsDown, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { KampungToggle } from './KampungToggle';
import cssText from '../index.css?inline';

// Singleton body-level shadow DOM portal — escapes ALL stacking contexts
// Appended directly to document.body so z-index is supreme
let _portalMount = null;
function getPortalMount() {
    if (!_portalMount) {
        const host = document.createElement('div');
        host.style.cssText = [
            'position:fixed',
            'top:0',
            'left:0',
            'width:0',
            'height:0',
            'overflow:visible',
            'z-index:2147483647',
            'pointer-events:none',
        ].join(';');
        document.body.appendChild(host);

        const shadow = host.attachShadow({ mode: 'open' });
        const style = document.createElement('style');
        style.textContent = cssText;
        shadow.appendChild(style);

        _portalMount = document.createElement('div');
        _portalMount.style.cssText = 'width:0;height:0;overflow:visible;';
        shadow.appendChild(_portalMount);
    }
    return _portalMount;
}

export function ExplainabilityTooltip({ children, assessment }) {
    const [isOpen, setIsOpen] = useState(false);
    const [lang, setLang] = useState('en');
    const [userVote, setUserVote] = useState(null); // 'up' | 'down' | null

    const { x, y, strategy, refs, context } = useFloating({
        open: isOpen,
        onOpenChange: setIsOpen,
        placement: 'top-start',
        strategy: 'fixed',
        middleware: [offset(10), flip(), shift()],
    });

    const hover = useHover(context, {
        handleClose: safePolygon(),
        delay: { open: 0, close: 300 },
    });

    const click = useClick(context);
    const dismiss = useDismiss(context);
    const role = useRole(context);

    const { getReferenceProps, getFloatingProps } = useInteractions([hover, click, dismiss, role]);

    const scoreColor = assessment?.trust_score > 80
        ? 'text-green-500 stroke-green-500'
        : assessment?.trust_score >= 40
            ? 'text-yellow-500 stroke-yellow-500'
            : 'text-red-500 stroke-red-500';

    const floatingPanel = isOpen && (
        <div
            ref={refs.setFloating}
            style={{
                position: strategy,
                top: y ?? 0,
                left: x ?? 0,
                width: refs.reference.current?.getBoundingClientRect().width ?? 320,
                pointerEvents: 'auto',
            }}
            {...getFloatingProps()}
            className="bg-white rounded-xl shadow-2xl border border-gray-100 p-4"
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

            <ul className="space-y-3 mb-3">
                {assessment?.summary[lang]?.map((point, idx) => {
                    if (typeof point === 'string') {
                        return (
                            <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                                <span className="text-blue-500 mt-1">•</span>
                                <span className="leading-snug">{point}</span>
                            </li>
                        );
                    }

                    let Icon = Info;
                    let bgColor = 'bg-gray-50';
                    let iconColor = 'text-gray-500';
                    let textColor = 'text-gray-700';

                    if (point.type === 'fake') {
                        Icon = AlertTriangle;
                        bgColor = 'bg-red-50';
                        iconColor = 'text-red-500';
                        textColor = 'text-red-900';
                    } else if (point.type === 'real') {
                        Icon = CheckCircle2;
                        bgColor = 'bg-green-50';
                        iconColor = 'text-green-500';
                        textColor = 'text-green-900';
                    } else if (point.type === 'info') {
                        Icon = Info;
                        bgColor = 'bg-blue-50';
                        iconColor = 'text-blue-500';
                        textColor = 'text-blue-900';
                    }

                    return (
                        <li key={idx} className={`p-2.5 rounded-lg flex items-start gap-2.5 ${bgColor}`}>
                            <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${iconColor}`} />
                            <span className={`text-sm leading-snug font-medium ${textColor}`}>
                                {point.text}
                            </span>
                        </li>
                    );
                })}
            </ul>

            <div className="flex items-center justify-between pt-2 border-t border-gray-100 mt-2">
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 font-medium">Sources:</span>
                    {assessment?.sources?.length > 0 ? (
                        <div className="flex gap-1">
                            {assessment.sources.map((src, i) => {
                                if (src.url) {
                                    return (
                                        <a key={i} href={src.url} target="_blank" rel="noopener noreferrer" title={src.name} className="flex items-center justify-center w-6 h-6 text-base cursor-pointer bg-gray-50 rounded hover:bg-gray-100 transition-colors">
                                            {src.icon}
                                        </a>
                                    );
                                }
                                return (
                                    <span key={i} title={src.name} className="flex items-center justify-center w-6 h-6 text-base cursor-help bg-gray-50 rounded">{src.icon}</span>
                                );
                            })}
                        </div>
                    ) : (
                        <span className="text-xs text-gray-500 italic">None</span>
                    )}
                </div>

                {/* Voting Actions */}
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={() => {
                            if (!userVote && chrome?.runtime?.sendMessage) {
                                setUserVote('up');
                                chrome.runtime.sendMessage({ type: 'SUBMIT_VOTE', vote: 1, assessment });
                            }
                        }}
                        disabled={!!userVote}
                        className={`p-1.5 rounded-md transition-colors ${userVote === 'up' ? 'bg-green-100 text-green-700' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'} ${userVote === 'down' ? 'opacity-30' : ''}`}
                        title="Helpful"
                    >
                        <ThumbsUp className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => {
                            if (!userVote && chrome?.runtime?.sendMessage) {
                                setUserVote('down');
                                chrome.runtime.sendMessage({ type: 'SUBMIT_VOTE', vote: -1, assessment });
                            }
                        }}
                        disabled={!!userVote}
                        className={`p-1.5 rounded-md transition-colors ${userVote === 'down' ? 'bg-red-100 text-red-700' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'} ${userVote === 'up' ? 'opacity-30' : ''}`}
                        title="Not Helpful"
                    >
                        <ThumbsDown className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <>
            <div ref={refs.setReference} {...getReferenceProps()} className="block w-full relative">
                {children}
            </div>
            {isOpen && ReactDOM.createPortal(floatingPanel, getPortalMount())}
        </>
    );
}
