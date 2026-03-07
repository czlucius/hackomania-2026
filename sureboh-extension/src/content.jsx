import React from 'react';
import { createRoot } from 'react-dom/client';
import { InjectedOverlay } from './components/InjectedOverlay';
import { AnalyzeManualButton } from './components/AnalyzeManualButton';
import { ImageWarningBanner } from './components/ImageWarningBanner';
import cssText from './index.css?inline';

const isHWZ = window.location.hostname.includes('hardwarezone');
const isTelegram = window.location.hostname.includes('telegram');
const isWhatsApp = window.location.hostname.includes('whatsapp');
const isReddit = window.location.hostname.includes('reddit') &&
    (window.location.pathname.startsWith('/r/singapore') || window.location.pathname.startsWith('/r/asksingapore'));

let platformName = 'Unknown';
if (isWhatsApp) platformName = 'WhatsApp';
if (isHWZ) platformName = 'HardwareZone';
if (isTelegram) platformName = 'Telegram Web';
if (isReddit) platformName = 'Reddit';

console.log(`SureAnot.ai Content Script Loaded! Listening for ${platformName} messages...`);

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
            '.text-content:not([data-sureanot-injected])',
            '.message-text:not([data-sureanot-injected])',
            '.translatable-message:not([data-sureanot-injected])',
            '.message > .bubble-content .text:not([data-sureanot-injected])',
        ].join(', ');

        const allMessages = document.querySelectorAll(selectors);
        // Only analyze the most recent 3 messages to avoid overwhelming the service worker
        const messages = Array.from(allMessages).slice(-3);
        console.log(`SureAnot.ai: Found ${allMessages.length} Telegram messages, analyzing ${messages.length} most recent.`);

        messages.forEach(msg => {
            const rawText = (msg.innerText || msg.textContent || '').trim();
            console.log(`SureAnot.ai: Telegram msg text (${rawText.length} chars): "${rawText.slice(0, 60)}"`);
            if (rawText.length < 15) return;

            msg.setAttribute('data-sureanot-injected', 'true');

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
        console.log("SureAnot.ai: Scanning HWZ DOM...");
        // HWZ uses class 'post-content' or similar for forum posts
        const posts = document.querySelectorAll('.post-content:not([data-sureanot-analyzed]), .bbWrapper:not([data-sureanot-analyzed])');
        console.log(`SureAnot.ai: Found ${posts.length} unanalyzed HWZ posts.`);

        // Extract Thread Title for context
        const threadTitle = document.querySelector('h1.p-title-value')?.innerText || document.title || '';

        // Determine if there are already analyzed posts on this page to correctly sequence
        const alreadyAnalyzedCount = document.querySelectorAll('[data-sureanot-analyzed="true"]').length;

        posts.forEach((post, index) => {
            // Extract text but also include full URLs if they exist
            const links = Array.from(post.querySelectorAll('a')).map(a => a.href).filter(href => href && !href.includes('javascript:'));
            const linkContext = links.length > 0 ? `\n\nLinks found in post:\n${links.join('\n')}` : '';

            const rawText = (post.innerText || post.textContent || '').trim();
            if (rawText.length < 20) {
                console.log("SureAnot.ai: Skipping short post:", rawText.slice(0, 20));
                post.setAttribute('data-sureanot-analyzed', 'skipped');
                return;
            }

            // Combined context for AI
            const analysisPayload = `Thread Title: ${threadTitle}\n\nPost Content: ${rawText}${linkContext}`;

            const currentPostIndex = alreadyAnalyzedCount + index;
            post.setAttribute('data-sureanot-analyzed', 'true');

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
                console.log("SureAnot.ai: Auto-analyzing first HWZ post.");
                root.render(<InjectedOverlay text={analysisPayload} />);
            } else {
                console.log(`SureAnot.ai: Adding manual button for HWZ post #${currentPostIndex + 1}.`);
                root.render(<AnalyzeManualButton text={analysisPayload} />);
            }
        });
    }

    // --- WhatsApp Logic ---
    else if (isWhatsApp) {
        // confirmed via DOM inspection: .message-in and .message-out return actual message bubbles
        // .copyable-text holds the text content inside each bubble
        const allMsgBubbles = document.querySelectorAll(
            '.message-in:not([data-sureanot-analyzed]), .message-out:not([data-sureanot-analyzed])'
        );
        // Limit to 3 most recent to avoid overwhelming the service worker
        const msgBubbles = Array.from(allMsgBubbles).slice(-3);
        console.log(`SureAnot.ai: Found ${allMsgBubbles.length} WhatsApp messages, analyzing ${msgBubbles.length} most recent.`);

        msgBubbles.forEach(bubble => {
            // Try multiple text selectors for different WhatsApp Web versions
            const textEl = bubble.querySelector('.copyable-text') ||
                bubble.querySelector('[data-pre-plain-text]') ||
                bubble.querySelector('span[dir="ltr"]');
            const rawText = (textEl?.innerText || textEl?.textContent || '').trim();
            console.log(`SureAnot.ai: WhatsApp bubble text (${rawText.length}): "${rawText.slice(0, 60)}"`);
            if (!rawText || rawText.length < 10) return;

            bubble.setAttribute('data-sureanot-analyzed', 'true');

            // Inject after the bubble's content
            const bubbleContent = bubble.querySelector('.copyable-area') || bubble;

            const container = document.createElement('div');
            container.style.position = 'relative';
            container.style.marginTop = '4px';
            container.style.display = 'block';
            container.style.width = '100%';
            container.style.clear = 'both';
            container.style.zIndex = '50';

            bubbleContent.appendChild(container);

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

    // --- Reddit Logic (r/singapore, r/asksingapore) ---
    else if (isReddit) {
        // Target post titles and comment content on Reddit's new UI
        const selectors = [
            'shreddit-post:not([data-sureanot-injected])',
            '.Comment:not([data-sureanot-injected]) p',
            '[data-testid="post-container"]:not([data-sureanot-injected])',
        ].join(', ');

        const allItems = document.querySelectorAll(selectors);
        const items = Array.from(allItems).filter(el => {
            const text = (el.innerText || el.textContent || '').trim();
            return text.length > 30;
        }).slice(-3);

        console.log(`SureAnot.ai: Found ${allItems.length} Reddit items, analyzing ${items.length} most recent.`);

        items.forEach(item => {
            const rawText = (item.innerText || item.textContent || '').trim().slice(0, 2000);
            item.setAttribute('data-sureanot-injected', 'true');

            const container = document.createElement('div');
            container.style.position = 'relative';
            container.style.marginTop = '6px';
            container.style.marginBottom = '6px';
            container.style.display = 'block';
            container.style.width = '100%';
            container.style.clear = 'both';
            container.style.zIndex = '50';

            item.appendChild(container);

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

    // --- Image Scanning Logic (Cross-platform) ---
    const images = document.querySelectorAll('img:not([data-sureanot-img-analyzed])');
    images.forEach(img => {
        img.setAttribute('data-sureanot-img-analyzed', 'true');
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
