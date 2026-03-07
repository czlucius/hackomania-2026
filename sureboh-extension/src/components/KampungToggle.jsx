import React, { useState } from 'react';

export function KampungToggle({ currentLang, onLanguageChange }) {
    const languages = [
        { code: 'en', label: 'EN' },
        { code: 'zh', label: '中文' },
        { code: 'ms', label: 'Melayu' }
    ];

    return (
        <div className="flex bg-gray-100 p-1 rounded-md mb-3 pointer-events-auto">
            {languages.map(lang => (
                <button
                    key={lang.code}
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onLanguageChange(lang.code);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className={`flex-1 text-xs py-1 px-2 rounded font-medium transition-colors ${currentLang === lang.code
                        ? 'bg-white shadow-sm text-gray-800'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    {lang.label}
                </button>
            ))}
        </div>
    );
}
