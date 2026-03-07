import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { SettingsForm } from './components/SettingsForm';
import './index.css';

function Options() {
    const [isFirstRun, setIsFirstRun] = useState(false);
    const [onboardingDone, setOnboardingDone] = useState(false);

    useEffect(() => {
        if (chrome?.storage?.sync) {
            chrome.storage.sync.get({ onboardingComplete: false }, (result) => {
                setIsFirstRun(!result.onboardingComplete);
            });
        }
    }, []);

    const handleComplete = () => {
        if (chrome?.storage?.sync) {
            chrome.storage.sync.set({ onboardingComplete: true }, () => {
                setOnboardingDone(true);
            });
        } else {
            setOnboardingDone(true);
        }
    };

    if (onboardingDone) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center p-6">
                <div className="text-center space-y-4 max-w-sm">
                    <div className="text-5xl">🎉</div>
                    <h2 className="text-2xl font-bold text-gray-900">You're all set!</h2>
                    <p className="text-gray-500 text-sm">Open WhatsApp Web, Telegram, or HardwareZone and SureBoh.ai will automatically start protecting you.</p>
                    <p className="text-xs text-gray-400 mt-4">You can change settings anytime by right-clicking the extension icon → Manage Extension → Options</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-md">

                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl shadow-lg mb-4">
                        <span className="text-3xl">🛡️</span>
                    </div>
                    {isFirstRun ? (
                        <>
                            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Welcome to SureBoh.ai</h1>
                            <p className="mt-2 text-gray-500 text-sm">Set up your preferences before getting started. You can change these anytime.</p>
                        </>
                    ) : (
                        <>
                            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">SureBoh.ai Settings</h1>
                            <p className="mt-1 text-gray-500 text-sm">Customize your fact-checking experience.</p>
                        </>
                    )}
                </div>

                {/* Settings Card */}
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
                    <SettingsForm
                        isOnboarding={isFirstRun}
                        onComplete={handleComplete}
                    />
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-gray-400 mt-6">
                    SureBoh.ai · Made with ❤️ for Singapore at Hackomania 2026
                </p>
            </div>
        </div>
    );
}

const root = createRoot(document.getElementById('root'));
root.render(<Options />);
