import React, { useState, useEffect } from 'react';
import { Settings, Shield, Globe, Zap } from 'lucide-react';

export function SettingsForm() {
    const [settings, setSettings] = useState({
        analysisMode: 'proactive',   // proactive | reactive
        aiEngine: 'cloud',           // cloud | gemma
        language: 'en'               // en | zh | ms
    });

    const [saved, setSaved] = useState(false);

    useEffect(() => {
        // Load settings
        if (chrome?.storage?.sync) {
            chrome.storage.sync.get(['analysisMode', 'aiEngine', 'language'], (result) => {
                if (result.analysisMode || result.aiEngine || result.language) {
                    setSettings({
                        analysisMode: result.analysisMode || 'proactive',
                        aiEngine: result.aiEngine || 'cloud',
                        language: result.language || 'en'
                    });
                }
            });
        }
    }, []);

    const handleChange = (key, value) => {
        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);
        setSaved(false);

        // Save immediately
        if (chrome?.storage?.sync) {
            chrome.storage.sync.set(newSettings, () => {
                setSaved(true);
                setTimeout(() => setSaved(false), 2000);
            });
        }
    };

    return (
        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            {/* Analysis Mode */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-lg font-medium text-gray-900">Scanning Mode</h3>
                </div>

                <div className="space-y-3">
                    <label className={`relative flex cursor-pointer rounded-lg border bg-white p-4 shadow-sm focus:outline-none ${settings.analysisMode === 'proactive' ? 'border-indigo-500 ring-2 ring-indigo-500' : 'border-gray-300'}`}>
                        <input type="radio" name="analysisMode" value="proactive" className="sr-only"
                            checked={settings.analysisMode === 'proactive'}
                            onChange={() => handleChange('analysisMode', 'proactive')}
                        />
                        <span className="flex flex-1">
                            <span className="flex flex-col">
                                <span className="block text-sm font-medium text-gray-900">Proactive (Auto-scan)</span>
                                <span className="mt-1 flex items-center text-sm text-gray-500">Automatically scans and flags messages as you browse.</span>
                            </span>
                        </span>
                        <div className={`h-5 w-5 rounded-full border flex items-center justify-center ${settings.analysisMode === 'proactive' ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-300'}`}>
                            {settings.analysisMode === 'proactive' && <div className="h-2 w-2 rounded-full bg-white" />}
                        </div>
                    </label>

                    <label className={`relative flex cursor-pointer rounded-lg border bg-white p-4 shadow-sm focus:outline-none ${settings.analysisMode === 'reactive' ? 'border-indigo-500 ring-2 ring-indigo-500' : 'border-gray-300'}`}>
                        <input type="radio" name="analysisMode" value="reactive" className="sr-only"
                            checked={settings.analysisMode === 'reactive'}
                            onChange={() => handleChange('analysisMode', 'reactive')}
                        />
                        <span className="flex flex-1">
                            <span className="flex flex-col">
                                <span className="block text-sm font-medium text-gray-900">Reactive (On-demand)</span>
                                <span className="mt-1 flex items-center text-sm text-gray-500">Only wait for manual clicks or specific links. Best for privacy.</span>
                            </span>
                        </span>
                        <div className={`h-5 w-5 rounded-full border flex items-center justify-center ${settings.analysisMode === 'reactive' ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-300'}`}>
                            {settings.analysisMode === 'reactive' && <div className="h-2 w-2 rounded-full bg-white" />}
                        </div>
                    </label>
                </div>
            </div>

            <hr className="border-gray-200" />

            {/* AI Engine */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-lg font-medium text-gray-900">Fact-Check Engine</h3>
                </div>

                <div className="space-y-3">
                    <label className={`relative flex cursor-pointer rounded-lg border bg-white p-4 shadow-sm focus:outline-none ${settings.aiEngine === 'cloud' ? 'border-indigo-500 ring-2 ring-indigo-500' : 'border-gray-300'}`}>
                        <input type="radio" name="aiEngine" value="cloud" className="sr-only"
                            checked={settings.aiEngine === 'cloud'}
                            onChange={() => handleChange('aiEngine', 'cloud')}
                        />
                        <span className="flex flex-1">
                            <span className="flex flex-col">
                                <span className="block text-sm font-medium text-gray-900">Cloud API</span>
                                <span className="mt-1 flex items-center text-sm text-gray-500">High accuracy, routes text to secure enterprise cloud endpoint.</span>
                            </span>
                        </span>
                        <div className={`h-5 w-5 rounded-full border flex items-center justify-center ${settings.aiEngine === 'cloud' ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-300'}`}>
                            {settings.aiEngine === 'cloud' && <div className="h-2 w-2 rounded-full bg-white" />}
                        </div>
                    </label>

                    <label className={`relative flex cursor-pointer rounded-lg border bg-white p-4 shadow-sm focus:outline-none ${settings.aiEngine === 'gemma' ? 'border-indigo-500 ring-2 ring-indigo-500' : 'border-gray-300'}`}>
                        <input type="radio" name="aiEngine" value="gemma" className="sr-only"
                            checked={settings.aiEngine === 'gemma'}
                            onChange={() => handleChange('aiEngine', 'gemma')}
                        />
                        <span className="flex flex-1">
                            <span className="flex flex-col">
                                <span className="block text-sm font-medium text-gray-900">Local LLM (Gemma)</span>
                                <span className="mt-1 flex items-center text-sm text-gray-500">100% private. Text never leaves your device.</span>
                            </span>
                        </span>
                        <div className={`h-5 w-5 rounded-full border flex items-center justify-center ${settings.aiEngine === 'gemma' ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-300'}`}>
                            {settings.aiEngine === 'gemma' && <div className="h-2 w-2 rounded-full bg-white" />}
                        </div>
                    </label>
                </div>
            </div>

            <hr className="border-gray-200" />

            {/* Language */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-lg font-medium text-gray-900">Language Preference</h3>
                </div>

                <select
                    value={settings.language}
                    onChange={(e) => handleChange('language', e.target.value)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                >
                    <option value="en">English (Default)</option>
                    <option value="zh">Chinese (Simplified) - 中文</option>
                    <option value="ms">Malay - Bahasa Melayu</option>
                </select>
            </div>

            <div className="pt-4 flex items-center justify-between">
                <span className={`text-sm tracking-wide ${saved ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                    {saved ? 'Settings Saved Automatically ✓' : ''}
                </span>
            </div>
        </form>
    );
}
