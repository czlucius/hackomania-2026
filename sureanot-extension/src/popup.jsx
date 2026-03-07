import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AlignLeft, Image as ImageIcon, Send, ScanSearch, Settings, ArrowRight, UploadCloud, AlertTriangle, CheckCircle2 } from 'lucide-react';
import './index.css';

function PopupApp() {
    const [tab, setTab] = useState('text'); // 'text' | 'image'

    // Text State
    const [textInput, setTextInput] = useState('');

    // Image State
    const [imagePreview, setImagePreview] = useState(null);
    const [imageB64, setImageB64] = useState(null);
    const [imageMime, setImageMime] = useState(null);

    // Shared UI State
    const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'
    const [result, setResult] = useState(null);

    const openSettings = (e) => {
        e.preventDefault();
        chrome.runtime.openOptionsPage();
    };

    const handleTextSubmit = () => {
        if (!textInput.trim() || textInput.length < 10) return;
        setStatus('loading');
        setResult(null);

        chrome.runtime.sendMessage({ type: 'ANALYZE_MESSAGE', text: textInput.trim() }, (response) => {
            if (chrome.runtime.lastError) {
                setStatus('error');
                return;
            }
            setStatus('success');
            setResult(response);
        });
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setStatus('idle');
        setResult(null);

        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target.result;
            setImagePreview(dataUrl);

            // Extract b64 and mime
            const parts = dataUrl.split(',');
            if (parts.length === 2) {
                const mimeMatch = parts[0].match(/:(.*?);/);
                setImageMime(mimeMatch ? mimeMatch[1] : 'image/jpeg');
                setImageB64(parts[1]);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleImageSubmit = () => {
        if (!imageB64) return;
        setStatus('loading');
        setResult(null);

        chrome.runtime.sendMessage({
            type: 'ANALYZE_IMAGE',
            imageB64,
            mime: imageMime,
            alt: "User uploaded image",
            platform: "Manual Check"
        }, (response) => {
            if (chrome.runtime.lastError || !response) {
                setStatus('error');
                return;
            }
            setStatus('success');

            // Map the image result to match the text result UI structure for consistency
            if (!response.is_flagged) {
                setResult({
                    classification: "Likely accurate",
                    trust_score: 95,
                    verdict: { en: "Authentic / Safe" },
                    summary: { en: [{ type: 'info', text: "No evidence of AI manipulation or misinformation detected." }] }
                });
            } else {
                setResult({
                    classification: response.classification === "manipulated" ? "Fake Image" : "Potentially misleading",
                    trust_score: 20,
                    verdict: { en: response.classification === "manipulated" ? "Likely AI-Generated" : "Flagged Image" },
                    summary: {
                        en: [
                            { type: 'fake', text: response.warning || response.explanation },
                            { type: 'info', text: response.explanation }
                        ]
                    }
                });
            }
        });
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 text-slate-900 font-sans">
            {/* Header */}
            <header className="flex items-center justify-between px-4 py-3 bg-white border-b shadow-sm shrink-0">
                <div className="flex items-center gap-2">
                    <img src="/vite.svg" alt="SureAnot.ai" className="w-6 h-6" />
                    <h1 className="font-bold text-base tracking-tight text-indigo-900">SureAnot.ai</h1>
                </div>
                <button onClick={openSettings} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors" title="Settings">
                    <Settings className="w-4 h-4" />
                </button>
            </header>

            {/* Tabs */}
            <div className="flex items-center w-full px-4 pt-3 gap-2 shrink-0 bg-white">
                <button
                    onClick={() => { setTab('text'); setStatus('idle'); setResult(null); }}
                    className={`flex-1 flex items-center justify-center gap-2 pb-2 border-b-2 text-sm font-medium transition-colors ${tab === 'text' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <AlignLeft className="w-4 h-4" /> Text
                </button>
                <button
                    onClick={() => { setTab('image'); setStatus('idle'); setResult(null); }}
                    className={`flex-1 flex items-center justify-center gap-2 pb-2 border-b-2 text-sm font-medium transition-colors ${tab === 'image' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <ImageIcon className="w-4 h-4" /> Image
                </button>
            </div>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">

                {/* TEXT TAB */}
                {tab === 'text' && (
                    <div className="flex flex-col gap-3 h-full">
                        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Paste claim or message</label>
                        <textarea
                            value={textInput}
                            onChange={(e) => setTextInput(e.target.value)}
                            placeholder="e.g. Govt giving out free $500 CDC vouchers, click here to redeem..."
                            className="w-full h-32 p-3 text-sm bg-white border border-slate-200 rounded-lg shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none transition-shadow"
                            disabled={status === 'loading'}
                        />
                        <button
                            onClick={handleTextSubmit}
                            disabled={status === 'loading' || textInput.length < 5}
                            className="mt-auto flex items-center justify-center gap-2 w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
                        >
                            {status === 'loading' ? (
                                <>
                                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Scanning...
                                </>
                            ) : (
                                <>
                                    <ScanSearch className="w-4 h-4" /> Verify Text
                                </>
                            )}
                        </button>
                    </div>
                )}

                {/* IMAGE TAB */}
                {tab === 'image' && (
                    <div className="flex flex-col gap-3 h-full">
                        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Upload image</label>

                        {!imagePreview ? (
                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-lg bg-white hover:bg-slate-50 cursor-pointer transition-colors group">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <UploadCloud className="w-8 h-8 text-slate-400 group-hover:text-indigo-500 mb-2" />
                                    <p className="mb-1 text-sm text-slate-500 font-medium">Click to upload</p>
                                    <p className="text-xs text-slate-400">PNG, JPG or WEBP</p>
                                </div>
                                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                            </label>
                        ) : (
                            <div className="relative w-full h-32 bg-black/5 rounded-lg border overflow-hidden flex items-center justify-center group">
                                <img src={imagePreview} alt="Preview" className="max-w-full max-h-full object-contain" />
                                <button
                                    onClick={() => { setImagePreview(null); setImageB64(null); setStatus('idle'); setResult(null); }}
                                    className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-sm font-medium"
                                >
                                    Remove
                                </button>
                            </div>
                        )}

                        <button
                            onClick={handleImageSubmit}
                            disabled={status === 'loading' || !imageB64}
                            className="mt-auto flex items-center justify-center gap-2 w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
                        >
                            {status === 'loading' ? (
                                <>
                                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Scanning...
                                </>
                            ) : (
                                <>
                                    <ScanSearch className="w-4 h-4" /> Scan Image
                                </>
                            )}
                        </button>
                    </div>
                )}

                {/* RESULTS AREA */}
                {status === 'error' && (
                    <div className="bg-red-50 text-red-700 p-3 rounded-lg border border-red-200 flex items-start gap-2 text-sm">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <p>There was an error communicating with the SureAnot backend. Make sure the server is running.</p>
                    </div>
                )}

                {status === 'success' && result && (
                    <div className="animate-in slide-in-from-bottom-2 fade-in duration-300 flex flex-col gap-3">
                        <div className={`p-3 rounded-lg border relative overflow-hidden flex flex-col gap-2
                            ${result.trust_score >= 70 ? 'bg-green-50 border-green-200' : result.trust_score >= 40 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}
                        >
                            {/* Score ring */}
                            <div className={`absolute -top-6 -right-6 w-20 h-20 rounded-full border-4 opacity-20 ${result.trust_score >= 70 ? 'border-green-500' : result.trust_score >= 40 ? 'border-amber-500' : 'border-red-500'}`} />

                            <h3 className={`font-bold text-base 
                                ${result.trust_score >= 70 ? 'text-green-800' : result.trust_score >= 40 ? 'text-amber-800' : 'text-red-800'}`}>
                                {result.verdict?.en || result.classification}
                            </h3>

                            <ul className="flex flex-col gap-1.5 z-10">
                                {result.summary?.en?.filter((_, i) => i < 2).map((item, i) => (
                                    <li key={i} className="flex items-start gap-1.5 text-sm text-slate-700 leading-snug">
                                        <div className="shrink-0 mt-0.5">
                                            {item.type === 'real' ? <CheckCircle2 className="w-4 h-4 text-green-600" /> :
                                                item.type === 'fake' ? <AlertTriangle className="w-4 h-4 text-red-500" /> :
                                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 mx-1" />}
                                        </div>
                                        <span>{item.text}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
}

const root = createRoot(document.getElementById('root'));
root.render(<PopupApp />);
