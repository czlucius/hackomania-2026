import React, { useState, useEffect } from 'react';
import { Shield, Globe, Zap, CheckCircle2, ChevronRight } from 'lucide-react';

const LANG_OPTIONS = [
    { value: 'en', label: 'English', native: 'English', flag: '🇸🇬' },
    { value: 'zh', label: 'Chinese', native: '中文 (简体)', flag: '🇨🇳' },
    { value: 'ms', label: 'Malay', native: 'Bahasa Melayu', flag: '🇲🇾' },
    { value: 'ta', label: 'Tamil', native: 'தமிழ்', flag: '🇮🇳' },
];

const MODE_OPTIONS = [
    {
        value: 'proactive',
        icon: Zap,
        title: 'Proactive',
        description: 'Automatically scans every message as you browse. Best for catching misinformation early.',
        color: 'indigo',
    },
    {
        value: 'reactive',
        icon: Shield,
        title: 'On-Demand',
        description: 'Only analyzes when you hover over the pill badge. Saves resources and is more private.',
        color: 'indigo',
    },
];

function RadioCard({ option, selected, onSelect }) {
    const Icon = option.icon;
    const isSelected = selected === option.value;
    return (
        <button
            type="button"
            onClick={() => onSelect(option.value)}
            className={`w-full text-left flex items-start gap-4 p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer focus:outline-none
                ${isSelected
                    ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-gray-50'}`}
        >
            <div className={`mt-0.5 p-2 rounded-lg ${isSelected ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'}`}>
                <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${isSelected ? 'text-indigo-900' : 'text-gray-800'}`}>{option.title}</p>
                <p className="mt-0.5 text-xs text-gray-500 leading-relaxed">{option.description}</p>
            </div>
            <div className={`mt-1 h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors
                ${isSelected ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300 bg-white'}`}>
                {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
            </div>
        </button>
    );
}

export function SettingsForm({ isOnboarding = false, onComplete }) {
    const [settings, setSettings] = useState({
        analysisMode: 'proactive',
        language: 'en',
    });
    const [saved, setSaved] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (chrome?.storage?.sync) {
            chrome.storage.sync.get({ analysisMode: 'proactive', language: 'en' }, (result) => {
                setSettings({ analysisMode: result.analysisMode, language: result.language });
                setLoading(false);
            });
        } else {
            setLoading(false);
        }
    }, []);

    const handleChange = (key, value) => {
        const next = { ...settings, [key]: value };
        setSettings(next);
        setSaved(false);
        if (chrome?.storage?.sync) {
            // Also save language under kampungLang key so tooltip can read it
            const toSave = { ...next, kampungLang: next.language };
            chrome.storage.sync.set(toSave, () => {
                setSaved(true);
                setTimeout(() => setSaved(false), 2000);
            });
        }
    };

    if (loading) return null;

    return (
        <div className="space-y-8">
            {/* Scanning Mode */}
            <section className="space-y-3">
                <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-4 h-4 text-indigo-500" />
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Scanning Mode</h3>
                </div>
                <div className="space-y-2">
                    {MODE_OPTIONS.map(opt => (
                        <RadioCard
                            key={opt.value}
                            option={opt}
                            selected={settings.analysisMode}
                            onSelect={(v) => handleChange('analysisMode', v)}
                        />
                    ))}
                </div>
            </section>

            {/* Language */}
            <section className="space-y-3">
                <div className="flex items-center gap-2 mb-1">
                    <Globe className="w-4 h-4 text-indigo-500" />
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Display Language</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {LANG_OPTIONS.map(lang => (
                        <button
                            key={lang.value}
                            type="button"
                            onClick={() => handleChange('language', lang.value)}
                            className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all duration-200 cursor-pointer focus:outline-none
                                ${settings.language === lang.value
                                    ? 'border-indigo-500 bg-indigo-50'
                                    : 'border-gray-200 bg-white hover:border-indigo-200 hover:bg-gray-50'}`}
                        >
                            <span className="text-2xl">{lang.flag}</span>
                            <span className={`text-xs font-semibold ${settings.language === lang.value ? 'text-indigo-700' : 'text-gray-600'}`}>{lang.label}</span>
                            <span className="text-[10px] text-gray-400">{lang.native}</span>
                        </button>
                    ))}
                </div>
            </section>

            {/* Save / CTA */}
            <div className="flex items-center justify-between pt-2">
                <span className={`text-sm font-medium transition-opacity duration-300 ${saved ? 'text-green-600 opacity-100' : 'opacity-0'}`}>
                    <CheckCircle2 className="inline w-4 h-4 mr-1 mb-0.5" />Saved!
                </span>
                {isOnboarding && onComplete && (
                    <button
                        type="button"
                        onClick={onComplete}
                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                        Start Using SureAnot.ai
                        <ChevronRight className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    );
}
