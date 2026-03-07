import React from 'react';
import { createRoot } from 'react-dom/client';
import { InjectedOverlay } from './components/InjectedOverlay';
import cssText from './index.css?inline';

console.log("SureBoh.ai Content Script Loaded! Listening for WhatsApp messages...");

console.log("SureBoh.ai Content Script V3 Loaded! Listening for precise WhatsApp messages...");

// Wait for WhatsApp Web UI to load
const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        if (mutation.addedNodes.length) {
            // Find just the exact text elements to perfectly contour the overlay
            const textSpans = document.querySelectorAll('span.selectable-text.copyable-text:not([data-sureboh-analyzed])');

            textSpans.forEach(span => {
                span.setAttribute('data-sureboh-analyzed', 'true');

                const rawText = span.innerText;
                if (!rawText || rawText.length < 5) return; // Skip very short messages

                // WhatsApp text spans are nested. Find the closest DIV that encompasses the text block tightly.
                let bubble = span.parentElement;
                while (bubble && bubble.tagName !== 'DIV') {
                    bubble = bubble.parentElement;
                }

                if (!bubble) return;

                if (getComputedStyle(bubble).position === 'static') {
                    bubble.style.position = 'relative';
                }

                const container = document.createElement('div');
                container.style.position = 'absolute';
                container.style.inset = '-4px'; // Slight overflow to cover text naturally but not row
                container.style.pointerEvents = 'none'; // Only React children catch clicks
                container.style.zIndex = '50';

                bubble.appendChild(container);

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
            });
        }
    }
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});
