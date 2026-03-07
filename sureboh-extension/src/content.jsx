import React from 'react';
import { createRoot } from 'react-dom/client';
import { InjectedOverlay } from './components/InjectedOverlay';
import cssText from './index.css?inline';

console.log("SureBoh.ai Content Script V5 Loaded! Listening for WhatsApp message texts...");

// Wait for WhatsApp Web UI to load
const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        if (mutation.addedNodes.length) {
            // Find any span that looks like long text
            const textSpans = document.querySelectorAll('span:not([data-sureboh-analyzed])');

            textSpans.forEach(span => {
                // Heuristic: Is it a text node that could be a message?
                if (span.childNodes.length === 1 && span.childNodes[0].nodeType === Node.TEXT_NODE) {
                    const rawText = span.innerText;
                    // Ignore tiny UI labels, timestamps, etc.
                    if (!rawText || rawText.length < 10) return;

                    // Mark as processed
                    span.setAttribute('data-sureboh-analyzed', 'true');

                    // We attach the overlay container DIRECTLY to the span's parent
                    // This avoids wrapping the entire row container
                    const targetContainer = span.parentElement;
                    if (!targetContainer) return;

                    if (getComputedStyle(targetContainer).position === 'static') {
                        targetContainer.style.position = 'relative';
                    }

                    const container = document.createElement('div');
                    container.style.position = 'absolute';
                    // Apply a tiny negative inset to cover the exact text geometry without bleeding into flex layouts
                    container.style.inset = '-4px';
                    container.style.pointerEvents = 'none';
                    container.style.zIndex = '50';
                    container.style.borderRadius = '4px';

                    targetContainer.appendChild(container);

                    const shadow = container.attachShadow({ mode: 'open' });

                    const style = document.createElement('style');
                    style.textContent = cssText;
                    shadow.appendChild(style);

                    const reactRoot = document.createElement('div');
                    reactRoot.style.height = '100%';
                    reactRoot.style.width = '100%';
                    shadow.appendChild(reactRoot);

                    const root = createRoot(reactRoot);
                    root.render(<InjectedOverlay text={rawText} />);
                }
            });
        }
    }
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});
