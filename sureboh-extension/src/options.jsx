import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { SettingsForm } from './components/SettingsForm';
import './index.css';

function Options() {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-sm border border-gray-100">
                <div>
                    <h2 className="text-center text-3xl font-extrabold text-gray-900">
                        SureAnot.ai Settings
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Customize your fact-checking experience and privacy preferences.
                    </p>
                </div>
                <SettingsForm />
            </div>
        </div>
    );
}

const root = createRoot(document.getElementById('root'));
root.render(<Options />);
