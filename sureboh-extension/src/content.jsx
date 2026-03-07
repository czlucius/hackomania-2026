import React from 'react';
import { createRoot } from 'react-dom/client';
import { InjectedOverlay } from './components/InjectedOverlay';
import cssText from './index.css?inline';

const isHWZ = window.location.hostname.includes('hardwarezone');
const isTelegram = window.location.hostname.includes('telegram');

let platformName = 'WhatsApp';
if (isHWZ) platformName = 'HardwareZone';
if (isTelegram) platformName = 'Telegram Web';

console.log(`SureBoh.ai Content Script Loaded! Listening for ${platformName} messages...`);

const scanDOM = () => {
    // --- Telegram Web Logic ---
    if (isTelegram) {
        const messages = document.querySelectorAll('.message, [class*="Message"], .message-content, .text-content, [class*="text-content"]');

        let newFound = 0;
        messages.forEach(msg => {
            if (msg.hasAttribute('data-sureboh-analyzed')) return;

            const rawText = msg.innerText || msg.textContent;
            if (!rawText || rawText.trim().length < 15) return;

            newFound++;
            msg.setAttribute('data-sureboh-analyzed', 'true');
        });

        if (newFound > 0) {
            console.log(`SureBoh.ai: Analyzed ${newFound} new Telegram messages.`);
        }

        // Re-iterate the original loop to actually inject the DOM... this was a bit messy, let's just do it in one loop.
        messages.forEach(msg => {
            if (msg.hasAttribute('data-sureboh-injected')) return;
            msg.setAttribute('data-sureboh-injected', 'true');

            const rawText = msg.innerText || msg.textContent;
            if (!rawText || rawText.trim().length < 15) return;

            if (getComputedStyle(msg).position === 'static') {
                msg.style.position = 'relative';
            }

            const container = document.createElement('div');
            container.style.position = 'relative';
            container.style.marginTop = '4px';
            container.style.display = 'block';
            container.style.width = '100%';
            container.style.clear = 'both';
            container.style.zIndex = '50';

            msg.appendChild(container);

            const shadow = container.attachShadow({ mode: 'open' });
            const style = document.createElement('style');
            style.textContent = cssText;
            shadow.appendChild(style);

            const reactRoot = document.createElement('div');
            reactRoot.style.width = '100%';
            shadow.appendChild(reactRoot);

            const root = createRoot(reactRoot);
            root.render(<InjectedOverlay text={rawText} />);
        });
    }

    // --- HardwareZone Logic ---
    else if (isHWZ) {
        console.log("SureBoh.ai: Scanning HWZ DOM...");
        // HWZ uses class 'post-content' or similar for forum posts
        const posts = document.querySelectorAll('.post-content:not([data-sureboh-analyzed]), .bbWrapper:not([data-sureboh-analyzed])');
        console.log(`SureBoh.ai: Found ${posts.length} unanalyzed HWZ posts.`);
        posts.forEach(post => {
            const rawText = post.innerText;
            if (!rawText || rawText.length < 20) {
                console.log("SureBoh.ai: Skipping short post:", rawText);
                post.setAttribute('data-sureboh-analyzed', 'skipped');
                return;
            }

            console.log("SureBoh.ai: Analyzing HWZ Post:", rawText.slice(0, 30));
            post.setAttribute('data-sureboh-analyzed', 'true');

            if (getComputedStyle(post).position === 'static') {
                post.style.position = 'relative';
            }

            const container = document.createElement('div');
            // Flow normally at the bottom of the post
            container.style.position = 'relative';
            container.style.marginTop = '12px';
            container.style.marginBottom = '8px';
            container.style.display = 'block';
            container.style.width = '100%';
            container.style.clear = 'both';
            container.style.zIndex = '50';

            post.appendChild(container);

            const shadow = container.attachShadow({ mode: 'open' });
            const style = document.createElement('style');
            style.textContent = cssText;
            shadow.appendChild(style);

            const reactRoot = document.createElement('div');
            reactRoot.style.width = '100%';
            shadow.appendChild(reactRoot);

            const root = createRoot(reactRoot);
            root.render(<InjectedOverlay text={rawText} />);
        });
    }

    // --- WhatsApp Logic ---
    else {
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
                // Flow normally at the bottom of the message text
                container.style.position = 'relative';
                container.style.marginTop = '4px';
                container.style.display = 'block';
                container.style.width = '100%';
                container.style.clear = 'both';
                container.style.zIndex = '50';

                targetContainer.appendChild(container);

                const shadow = container.attachShadow({ mode: 'open' });

                const style = document.createElement('style');
                style.textContent = cssText;
                shadow.appendChild(style);

                const reactRoot = document.createElement('div');
                reactRoot.style.width = '100%';
                shadow.appendChild(reactRoot);

                const root = createRoot(reactRoot);
                root.render(<InjectedOverlay text={rawText} />);
            }
        });
    }
};

// Run once immediately to catch Server-Side Rendered content (like HWZ posts)
setTimeout(scanDOM, 1000);

// Wait for UI to load and changes (for SPAs like WhatsApp)
const observer = new MutationObserver((mutations) => {
    let shouldScan = false;
    for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
            shouldScan = true;
            break;
        }
    }
    if (shouldScan) {
        scanDOM();
    }
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});
