import React from 'react';
import { createRoot } from 'react-dom/client';
import { InjectedOverlay } from './components/InjectedOverlay';
import { AnalyzeManualButton } from './components/AnalyzeManualButton';
import { ImageWarningBanner } from './components/ImageWarningBanner';
import cssText from './index.css?inline';

const isHWZ = window.location.hostname.includes('hardwarezone');
const isTelegram = window.location.hostname.includes('telegram');

let platformName = 'WhatsApp';
if (isHWZ) platformName = 'HardwareZone';
if (isTelegram) platformName = 'Telegram Web';

console.log(`SureBoh.ai Content Script Loaded! Listening for ${platformName} messages...`);

let currentAnalysisMode = 'proactive';

const getComponentForMode = (text) => {
    return currentAnalysisMode === 'reactive'
        ? <AnalyzeManualButton text={text} />
        : <InjectedOverlay text={text} />;
};

if (chrome?.storage?.sync) {
    chrome.storage.sync.get(['analysisMode'], (result) => {
        if (result.analysisMode) {
            currentAnalysisMode = result.analysisMode;
        }
    });

    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'sync' && changes.analysisMode) {
            currentAnalysisMode = changes.analysisMode.newValue;
        }
    });
}

const scanDOM = () => {
    // --- Telegram Web Logic ---
    if (isTelegram) {
        // Telegram Web (K version): messages are in .message > .text-content or .message-content
        // Telegram Web (Z version): messages are in .message-text or .text
        const selectors = [
            '.text-content:not([data-sureboh-injected])',
            '.message-text:not([data-sureboh-injected])',
            '.translatable-message:not([data-sureboh-injected])',
            '.message > .bubble-content .text:not([data-sureboh-injected])',
        ].join(', ');

        const allMessages = document.querySelectorAll(selectors);
        // Only analyze the most recent 3 messages to avoid overwhelming the service worker
        const messages = Array.from(allMessages).slice(-3);
        console.log(`SureBoh.ai: Found ${allMessages.length} Telegram messages, analyzing ${messages.length} most recent.`);

        messages.forEach(msg => {
            const rawText = (msg.innerText || msg.textContent || '').trim();
            console.log(`SureBoh.ai: Telegram msg text (${rawText.length} chars): "${rawText.slice(0, 60)}"`);
            if (rawText.length < 15) return;

            msg.setAttribute('data-sureboh-injected', 'true');

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
            root.render(getComponentForMode(rawText));
        });
    }

    // --- HardwareZone Logic ---
    else if (isHWZ) {
        console.log("SureBoh.ai: Scanning HWZ DOM...");
        // HWZ uses class 'post-content' or similar for forum posts
        const posts = document.querySelectorAll('.post-content:not([data-sureboh-analyzed]), .bbWrapper:not([data-sureboh-analyzed])');
        console.log(`SureBoh.ai: Found ${posts.length} unanalyzed HWZ posts.`);

        // Extract Thread Title for context
        const threadTitle = document.querySelector('h1.p-title-value')?.innerText || document.title || '';

        // Determine if there are already analyzed posts on this page to correctly sequence
        const alreadyAnalyzedCount = document.querySelectorAll('[data-sureboh-analyzed="true"]').length;

        posts.forEach((post, index) => {
            // Extract text but also include full URLs if they exist
            const links = Array.from(post.querySelectorAll('a')).map(a => a.href).filter(href => href && !href.includes('javascript:'));
            const linkContext = links.length > 0 ? `\n\nLinks found in post:\n${links.join('\n')}` : '';

            const rawText = (post.innerText || post.textContent || '').trim();
            if (rawText.length < 20) {
                console.log("SureBoh.ai: Skipping short post:", rawText.slice(0, 20));
                post.setAttribute('data-sureboh-analyzed', 'skipped');
                return;
            }

            // Combined context for AI
            const analysisPayload = `Thread Title: ${threadTitle}\n\nPost Content: ${rawText}${linkContext}`;

            const currentPostIndex = alreadyAnalyzedCount + index;
            post.setAttribute('data-sureboh-analyzed', 'true');

            if (getComputedStyle(post).position === 'static') {
                post.style.position = 'relative';
            }

            const container = document.createElement('div');
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

            // Logic: Auto-analyze the first post (index 0), rest are manual
            if (currentPostIndex === 0) {
                console.log("SureBoh.ai: Auto-analyzing first HWZ post.");
                root.render(<InjectedOverlay text={analysisPayload} />);
            } else {
                console.log(`SureBoh.ai: Adding manual button for HWZ post #${currentPostIndex + 1}.`);
                root.render(<AnalyzeManualButton text={analysisPayload} />);
            }
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
                root.render(getComponentForMode(rawText));
            }
        });
    }

    // --- Image Scanning Logic (Cross-platform) ---
    const images = document.querySelectorAll('img:not([data-sureboh-img-analyzed])');
    images.forEach(img => {
        img.setAttribute('data-sureboh-img-analyzed', 'true');
        const src = img.src || '';
        const alt = img.alt || '';

        // Skip tiny base64 or purely UI icons
        if (!src || src.startsWith('data:') || img.width < 100 || img.height < 100) return;

        if (chrome?.runtime?.sendMessage) {
            chrome.runtime.sendMessage({ type: 'ANALYZE_IMAGE', src, alt }, (response) => {
                if (response && response.warning) {
                    const parent = img.parentElement;
                    if (!parent) return;

                    if (getComputedStyle(parent).position === 'static') {
                        parent.style.position = 'relative';
                    }

                    const container = document.createElement('div');
                    // Style container so absolute children position contextually
                    container.style.position = 'absolute';
                    container.style.top = '0';
                    container.style.left = '0';
                    container.style.width = '100%';
                    container.style.height = '100%';
                    container.style.pointerEvents = 'none'; // let clicks pass through to the image
                    container.style.zIndex = '50';

                    parent.appendChild(container);

                    const shadow = container.attachShadow({ mode: 'open' });
                    const style = document.createElement('style');
                    style.textContent = cssText;
                    shadow.appendChild(style);

                    const reactRoot = document.createElement('div');
                    shadow.appendChild(reactRoot);

                    const root = createRoot(reactRoot);
                    root.render(<ImageWarningBanner message={response.warning} />);
                }
            });
        }
    });
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
