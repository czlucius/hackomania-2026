import React from 'react';
import { createRoot } from 'react-dom/client';
import { InjectedOverlay } from './components/InjectedOverlay';
import cssText from './index.css?inline';

console.log("SureBoh.ai Content Script V4 Loaded! Listening for WhatsApp message bubbles...");

// Wait for WhatsApp Web UI to load
const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        if (mutation.addedNodes.length) {
            // Find just the exact text elements to perfectly contour the overlay
            // In WhatsApp Web, the div with class 'copyable-text' that has 'data-pre-plain-text' is typically the message wrapper
            const messages = document.querySelectorAll('div.copyable-text[data-pre-plain-text]:not([data-sureboh-analyzed])');

            messages.forEach(msg => {
                msg.setAttribute('data-sureboh-analyzed', 'true');

                const rawText = msg.querySelector('span.selectable-text')?.innerText || msg.innerText;
                if (!rawText || rawText.length < 5) return;

                // Find the closest message bubble wrapper (usually the parent of this block)
                const bubble = msg.closest('.message-in') || msg.closest('.message-out') || msg;

                // We want to attach to the inner bubble content, which has background colors
                // Typically this is the first child of the .message-in/.message-out wrapper
                let targetContainer = bubble;

                // Look for the specific inner bubble element with border-radius (WhatsApp usually uses classes like .copyable-area or specific scoped classes for the bubble)
                // A safe heuristic is the child div that wraps the copyable-text
                try {
                    const innerDivs = bubble.querySelectorAll('div');
                    for (const div of innerDivs) {
                        // Find the first div that seems to be the main structural bubble (it will have border radius or padding)
                        const style = window.getComputedStyle(div);
                        if (style.backgroundColor !== 'rgba(0, 0, 0, 0)' && style.backgroundColor !== 'transparent') {
                            targetContainer = div;
                            break;
                        }
                    }
                } catch (e) { }

                if (getComputedStyle(targetContainer).position === 'static') {
                    targetContainer.style.position = 'relative';
                }

                // Add padding bottom if there's no space for the icons
                targetContainer.style.paddingBottom = '10px';

                const container = document.createElement('div');
                container.style.position = 'absolute';
                container.style.inset = '0';
                container.style.pointerEvents = 'none';
                container.style.zIndex = '50';
                container.style.borderRadius = getComputedStyle(targetContainer).borderRadius || '8px';
                container.style.overflow = 'hidden';

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
            });
        }
    }
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});
