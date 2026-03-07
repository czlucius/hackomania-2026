import React from 'react';
import { createRoot } from 'react-dom/client';
import { InjectedOverlay } from './components/InjectedOverlay';
import cssText from './index.css?inline';

// Wait for WhatsApp Web UI to load
const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        if (mutation.addedNodes.length) {
            // Look for plain text messages in WhatsApp
            const messages = document.querySelectorAll('div[data-pre-plain-text]:not([data-sureboh-analyzed])');

            messages.forEach(msg => {
                msg.setAttribute('data-sureboh-analyzed', 'true');

                const rawText = msg.querySelector('span.selectable-text')?.innerText;
                if (!rawText || rawText.length < 10) return; // Skip very short messages

                // We wrap the message node or insert inside depending on layout constraints.
                const bubble = msg.closest('[role="row"]') || msg.parentNode;

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
