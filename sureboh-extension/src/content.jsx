import React from 'react';
import { createRoot } from 'react-dom/client';
import { InjectedOverlay } from './components/InjectedOverlay';
import cssText from './index.css?inline';

console.log("SureBoh.ai Content Script Loaded! Listening for WhatsApp messages...");

// Wait for WhatsApp Web UI to load
const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        if (mutation.addedNodes.length) {
            // Broaden the search: try looking for common message classes or role row
            const messages = document.querySelectorAll('div.message-in:not([data-sureboh-analyzed]), div.message-out:not([data-sureboh-analyzed]), div[role="row"]:not([data-sureboh-analyzed])');

            messages.forEach(msg => {
                msg.setAttribute('data-sureboh-analyzed', 'true');

                // WhatsApp text is often within span.selectable-text
                const textNodes = msg.querySelectorAll('span.selectable-text.copyable-text');
                let rawText = '';
                textNodes.forEach(n => rawText += n.innerText + ' ');

                // Fallback text extraction if exact classes changed
                if (!rawText.trim()) {
                    rawText = msg.innerText || '';
                }

                if (!rawText || rawText.length < 10) return; // Skip very short messages

                console.log("SureBoh.ai: Found message to analyze!", rawText.substring(0, 30) + "...");

                // We inject a container right over the message bubble
                const bubble = msg;

                // Ensure bubble is relative for absolute positioning of overlay
                if (getComputedStyle(bubble).position === 'static') {
                    bubble.style.position = 'relative';
                }

                const container = document.createElement('div');
                container.style.position = 'absolute';
                container.style.inset = '0';
                container.style.pointerEvents = 'none'; // let clicks pass through mostly
                container.style.zIndex = '50';

                bubble.appendChild(container);

                // Create Shadow DOM to isolate styles
                const shadow = container.attachShadow({ mode: 'open' });

                // Add Tailwind CSS to shadow root from inline import
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
