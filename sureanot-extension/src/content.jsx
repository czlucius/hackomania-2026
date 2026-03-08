import React from 'react';
import { createRoot } from 'react-dom/client';
import { InjectedOverlay } from './components/InjectedOverlay';
import { AnalyzeManualButton } from './components/AnalyzeManualButton';
import { ImageScanOverlay } from './components/ImageScanOverlay';
import { SendGuardModal } from './components/SendGuardModal';
import cssText from './index.css?inline';

const isHWZ = window.location.hostname.includes('hardwarezone');
const isTelegram = window.location.hostname.includes('telegram');
const isWhatsApp = window.location.hostname.includes('whatsapp');
const isInstagram = window.location.hostname.includes('instagram');
// Keep a static hostname flag; the subreddit path is re-checked on every scanDOM
// call so SPA navigation (reddit.com -> r/singapore) is handled correctly.
const isRedditHostname = window.location.hostname.includes('reddit');
const isReddit = isRedditHostname &&
    window.location.pathname.toLowerCase().match(/^\/r\/(singapore|asksingapore|singaporeraw)\b/);

let platformName = 'Unknown';
if (isWhatsApp) platformName = 'WhatsApp';
if (isHWZ) platformName = 'HardwareZone';
if (isTelegram) platformName = 'Telegram Web';
if (isReddit) platformName = 'Reddit';
if (isInstagram) platformName = 'Instagram';
// Convert a loaded <img> element to a base64 JPEG string via canvas.
// Returns { b64, mime } or null if the canvas is tainted (cross-origin without CORS).
function imgToBase64(img) {
    try {
        const MAX = 800;
        const w = img.naturalWidth || img.width || MAX;
        const h = img.naturalHeight || img.height || MAX;
        const scale = Math.min(1, MAX / Math.max(w, h));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(w * scale);
        canvas.height = Math.round(h * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
        return { b64: dataUrl.split(',')[1], mime: 'image/jpeg' };
    } catch (e) {
        return null;
    }
}

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
            '.Message .text-content:not([data-sureanot-injected])',
            '.message-content.text:not([data-sureanot-injected])',
            '[class*="message-text"]:not([data-sureanot-injected])'
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
            root.render(<AnalyzeManualButton text={rawText} />);
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
            root.render(<AnalyzeManualButton text={rawText} />);
        });
    }

    // --- Reddit Logic (r/singapore, r/asksingapore, r/singaporeraw) ---
    // Re-evaluate the subreddit path every scan so SPA navigation is handled.
    else if (isRedditHostname && window.location.pathname.toLowerCase().match(/^\/r\/(singapore|asksingapore|singaporeraw)\b/)) {
        // ── Posts (auto-analyze, same as other platforms) ──────────────────
        const posts = Array.from(
            document.querySelectorAll('shreddit-post:not([data-sureanot-injected])')
        ).filter(el => (el.getAttribute('post-title') || '').length > 5).slice(0, 3);

        posts.forEach(item => {
            const title = item.getAttribute('post-title') || '';
            const body = item.querySelector('[slot="text-body"]')?.innerText?.trim() || '';
            const rawText = (body ? `${title}\n\n${body}` : title).slice(0, 2000);
            if (!rawText) return;
            item.setAttribute('data-sureanot-injected', 'true');

            const container = document.createElement('div');
            container.style.cssText = 'position:relative;margin-top:6px;margin-bottom:6px;display:block;width:100%;clear:both;z-index:50;';
            item.insertAdjacentElement('afterend', container);

            const shadow = container.attachShadow({ mode: 'open' });
            const style = document.createElement('style');
            style.textContent = cssText;
            shadow.appendChild(style);
            const reactRoot = document.createElement('div');
            reactRoot.style.width = '100%';
            shadow.appendChild(reactRoot);
            createRoot(reactRoot).render(getComponentForMode(rawText));
        });

        // ── Comments (click-to-analyze only, injected into the action bar) ─────
        // shreddit-comment's shadow DOM action row exposes a `comment-insight` slot.
        // By giving our host element that slot name and appending it to the
        // shreddit-comment light DOM, the browser distributes it straight into the
        // actions bar — no content displacement, no nesting issues.
        const allComments = Array.from(
            document.querySelectorAll('shreddit-comment:not([data-sureanot-injected])')
        );

        allComments.forEach(item => {
            // Use :scope > so we only read THIS comment's own text, not nested replies.
            const ownContentEl =
                item.querySelector(':scope > [slot="comment-content"]') ||
                item.querySelector(':scope > [id^="comment-body"]');
            const rawText = (ownContentEl?.innerText || ownContentEl?.textContent || '').trim().slice(0, 2000);
            if (!rawText) return;
            item.setAttribute('data-sureanot-injected', 'true');

            // Host element slotted into the action bar via the shadow DOM slot mechanism.
            const host = document.createElement('div');
            host.setAttribute('slot', 'comment-insight');
            host.style.cssText = 'display:inline-flex;align-items:center;';
            item.appendChild(host);

            const shadow = host.attachShadow({ mode: 'open' });
            const style = document.createElement('style');
            style.textContent = cssText;
            shadow.appendChild(style);
            const reactRoot = document.createElement('div');
            shadow.appendChild(reactRoot);
            // Always manual for comments — never auto-fire the API.
            createRoot(reactRoot).render(<AnalyzeManualButton text={rawText} compact />);
        });
    }

    // --- Instagram Logic (captions & post text) ---
    else if (isInstagram) {
        // Instagram captions: 'article h1' is the most stable selector across feed, reels & explore.
        // '_a9zs' is the legacy wrapper class kept as a fallback.
        // We also catch 'article span[class]' blocks with meaningful text as a last resort.
        const captionSelectors = [
            'article h1:not([data-sureanot-injected])',
            '._a9zs:not([data-sureanot-injected])',
        ].join(', ');

        const captions = document.querySelectorAll(captionSelectors);
        console.log(`SureAnot.ai: Found ${captions.length} Instagram caption elements.`);

        captions.forEach(caption => {
            const rawText = (caption.innerText || caption.textContent || '').trim();
            if (rawText.length < 20) return;

            caption.setAttribute('data-sureanot-injected', 'true');

            if (getComputedStyle(caption).position === 'static') {
                caption.style.position = 'relative';
            }

            const container = document.createElement('div');
            container.style.position = 'relative';
            container.style.marginTop = '6px';
            container.style.display = 'block';
            container.style.width = '100%';
            container.style.clear = 'both';
            container.style.zIndex = '50';

            caption.appendChild(container);

            const shadow = container.attachShadow({ mode: 'open' });
            const style = document.createElement('style');
            style.textContent = cssText;
            shadow.appendChild(style);

            const reactRoot = document.createElement('div');
            reactRoot.style.width = '100%';
            shadow.appendChild(reactRoot);

            const root = createRoot(reactRoot);
            root.render(<AnalyzeManualButton text={rawText} />);
        });
    }

    // --- Image Scanning Logic (Cross-platform + Instagram) ---
    // Skip image scanning on Reddit — profile picture avatars trigger false positives.
    if (isRedditHostname) return;

    // On Instagram, target post/reel images inside article; elsewhere scan everything.
    let imgSelector = 'img:not([data-sureanot-img-analyzed])';
    if (isInstagram) {
        imgSelector = 'article img:not([data-sureanot-img-analyzed]), section img:not([data-sureanot-img-analyzed])';
    } else if (isTelegram) {
        // Target images inside chat messages only (skipping avatars/UI)
        imgSelector = '.message img:not([data-sureanot-img-analyzed]), .bubble-content img:not([data-sureanot-img-analyzed]), .media-photo img:not([data-sureanot-img-analyzed]), .message-media img:not([data-sureanot-img-analyzed]), [class*="message"] img:not([data-sureanot-img-analyzed]), .MessageMedia img:not([data-sureanot-img-analyzed])';
    } else if (isWhatsApp) {
        // Target images inside WhatsApp chat bubbles
        imgSelector = '.message-in img:not([data-sureanot-img-analyzed]), .message-out img:not([data-sureanot-img-analyzed]), [data-testid="msg-container"] img:not([data-sureanot-img-analyzed])';
    }

    const images = document.querySelectorAll(imgSelector);
    images.forEach(img => {
        const src = img.src || '';
        const alt = img.alt || '';

        // Skip SVG data URIs, UI icons
        if (!src || src.startsWith('data:image/svg') || (src.startsWith('data:') && !src.startsWith('data:image'))) {
            img.setAttribute('data-sureanot-img-analyzed', 'true');
            return;
        }

        // Identify known UI avatars to skip permanently
        if (img.className.includes('emoji') || img.className.includes('avatar') || src.includes('/emoji/')) {
            img.setAttribute('data-sureanot-img-analyzed', 'true');
            return;
        }

        const rect = img.getBoundingClientRect();

        // If not rendered yet, skip without marking analyzed so MutationObserver catches it later
        if (rect.width === 0 && rect.height === 0) {
            return;
        }

        // Skip small icons (like read receipts, small avatars)
        if (rect.width < 50 || rect.height < 50) {
            img.setAttribute('data-sureanot-img-analyzed', 'true');
            return;
        }

        img.setAttribute('data-sureanot-img-analyzed', 'true');

        // Build the chrome message once; the React component sends it internally
        let chromeMessage;
        if (src.startsWith('blob:') || isTelegram || isWhatsApp) {
            // For Telegram and WhatsApp heavily reliant on blob URIs, prefer base64 conversion
            // This is crucial as the blob: URL won't be accessible by our backend directly.
            const b64data = imgToBase64(img);
            if (!b64data) return; // tainted canvas — skip
            chromeMessage = { type: 'ANALYZE_IMAGE', imageB64: b64data.b64, mime: b64data.mime, alt, platform: platformName };
        } else {
            chromeMessage = { type: 'ANALYZE_IMAGE', src, alt, platform: platformName };
        }

        const parent = img.parentElement;
        if (!parent) return;
        if (getComputedStyle(parent).position === 'static') {
            parent.style.position = 'relative';
        }

        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.top = '0';
        container.style.left = '0';
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.pointerEvents = 'none';
        container.style.zIndex = '50';

        parent.appendChild(container);

        const shadow = container.attachShadow({ mode: 'open' });
        const style = document.createElement('style');
        style.textContent = cssText;
        shadow.appendChild(style);

        const reactRoot = document.createElement('div');
        shadow.appendChild(reactRoot);

        const root = createRoot(reactRoot);
        root.render(<ImageScanOverlay chromeMessage={chromeMessage} reactive={currentAnalysisMode === 'reactive'} />);
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

// ---------------------------------------------------------------------------
// Send Guard — intercepts send actions on WhatsApp & Telegram
// Proactive mode : intercepts the send button / Enter key, shows warning modal.
// Reactive mode  : injects a "Check before sending" button next to the send
//                  button without touching the real send at all.
// ---------------------------------------------------------------------------
if ((isWhatsApp || isTelegram) && chrome?.runtime?.sendMessage) {
    let guardRoot = null;
    let bypassGuard = false;

    // ── Shared helpers ──────────────────────────────────────────────────────

    function getGuardMount() {
        const existing = document.getElementById('sureanot-send-guard-host');
        if (existing) return existing._reactMount;

        const host = document.createElement('div');
        host.id = 'sureanot-send-guard-host';
        host.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;overflow:visible;z-index:2147483647;pointer-events:none;';
        document.body.appendChild(host);

        const shadow = host.attachShadow({ mode: 'open' });
        const style = document.createElement('style');
        style.textContent = cssText;
        shadow.appendChild(style);

        const mount = document.createElement('div');
        mount.style.cssText = 'width:0;height:0;overflow:visible;';
        shadow.appendChild(mount);

        host._reactMount = mount;
        return mount;
    }

    function showGuard(assessment, onProceed, onCancel, safeMode = false) {
        if (!guardRoot) guardRoot = createRoot(getGuardMount());
        guardRoot.render(
            <SendGuardModal
                assessment={assessment}
                onSendAnyway={onProceed}
                onCancel={onCancel}
                safeMode={safeMode}
            />
        );
    }

    function hideGuard() {
        guardRoot?.render(null);
    }

    function getComposedText() {
        if (isWhatsApp) {
            const el =
                document.querySelector('[contenteditable="true"][data-tab]') ||
                document.querySelector('.selectable-text.copyable-text[contenteditable="true"]');
            return (el?.innerText || el?.textContent || '').trim();
        }
        if (isTelegram) {
            // Telegram Web K: .input-message-input
            // Telegram Web A: #editable-message-text or .message-input-wrapper contenteditable
            const el =
                document.querySelector('.input-message-input') ||
                document.querySelector('#editable-message-text') ||
                document.querySelector('.input-field-input') ||
                document.querySelector('[contenteditable="true"].composer-input') ||
                document.querySelector('.message-input-wrapper [contenteditable="true"]') ||
                document.querySelector('.reply-markup-message [contenteditable="true"]');
            return (el?.innerText || el?.textContent || '').trim();
        }
        return '';
    }

    function triggerSend() {
        bypassGuard = true;
        if (isWhatsApp) {
            const btn =
                document.querySelector('[data-testid="send"]') ||
                document.querySelector('button[aria-label="Send"]');
            if (btn) { btn.click(); return; }
        }
        if (isTelegram) {
            // Telegram Web K: .btn-send  |  Telegram Web A: button.send
            const btn =
                document.querySelector('button[aria-label="Send Message"]') ||
                document.querySelector('button[aria-label="Send message"]') ||
                document.querySelector('button.send') ||
                document.querySelector('.btn-send');
            if (btn) { btn.click(); return; }
        }
        // Fallback: dispatch Enter on the compose input
        const input =
            document.querySelector('[contenteditable="true"][data-tab]') ||
            document.querySelector('.selectable-text.copyable-text[contenteditable="true"]') ||
            document.querySelector('.input-message-input[contenteditable="true"]');
        if (input) {
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true, cancelable: true }));
        }
    }

    // sendOnSafe=true  → proactive mode: auto-send after a clean result
    // sendOnSafe=false → reactive Check button: just show result, let user decide to send
    async function guardSend(text, sendOnSafe = true) {
        showGuard(null, () => { hideGuard(); if (sendOnSafe) triggerSend(); }, hideGuard);

        try {
            const result = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({ type: 'ANALYZE_MESSAGE', text }, (response) => {
                    if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
                    else resolve(response);
                });
            });

            if ((result?.trust_score ?? 100) < 40) {
                // Potentially fake news — warn the user
                showGuard(result, () => { hideGuard(); triggerSend(); }, hideGuard);
            } else if (sendOnSafe) {
                // Proactive mode: message is safe, proceed with original send
                hideGuard();
                triggerSend();
            } else {
                // Reactive Check button: show "all clear" panel — do NOT auto-send
                showGuard(result, null, hideGuard, true);
            }
        } catch (e) {
            console.warn('SureAnot.ai: Send guard analysis failed, allowing send.', e);
            hideGuard();
            if (sendOnSafe) triggerSend();
        }
    }

    // ── Proactive mode: intercept the send button / Enter ───────────────────

    function onSendClick(e) {
        if (currentAnalysisMode !== 'proactive') return;
        if (bypassGuard) { bypassGuard = false; return; }

        const sendBtn = e.target.closest(
            '[data-testid="send"], button[aria-label="Send"], [data-testid="compose-btn-send"],' +
            'button[aria-label="Send Message"], button[aria-label="Send message"],' +
            'button.send, button.send.main-button, .btn-send'
        );
        if (!sendBtn) return;

        const text = getComposedText();
        if (!text || text.length < 10) return;

        e.preventDefault();
        e.stopPropagation();
        guardSend(text);
    }

    function onEnterKey(e) {
        if (currentAnalysisMode !== 'proactive') return;
        if (e.key !== 'Enter' || e.shiftKey) return;
        if (bypassGuard) { bypassGuard = false; return; }

        const composable = e.target.closest('[contenteditable="true"]');
        if (!composable) return;

        // Skip keypresses inside received message bubbles (Telegram / WhatsApp)
        const inBubble = e.target.closest(
            '.message-in, .message-out, .bubbles-inner, .message-list-item,' +
            '.bubble, .bubbles-group, .document-message, .media-sticker-wrapper'
        );
        if (inBubble) return;

        // For Telegram, only intercept if focus is actually inside the compose area
        if (isTelegram) {
            const inCompose = e.target.closest(
                '.input-message-input, .input-field-input, .composer-input, .chat-input,' +
                '.message-input-wrapper, #editable-message-text'
            );
            if (!inCompose) return;
        }

        const text = getComposedText();
        if (!text || text.length < 10) return;

        e.preventDefault();
        e.stopPropagation();
        guardSend(text);
    }

    document.addEventListener('click', onSendClick, true);
    document.addEventListener('keydown', onEnterKey, true);

    // ── Reactive mode: inject "Check before sending" button ─────────────────

    const REACTIVE_BTN_ID = 'sureanot-check-btn';

    function getSendButton() {
        return (
            document.querySelector('[data-testid="send"]') ||
            document.querySelector('button[aria-label="Send"]') ||
            document.querySelector('button[aria-label="Send Message"]') ||
            document.querySelector('button[aria-label="Send message"]') ||
            document.querySelector('button.send.main-button') ||
            document.querySelector('button.send') ||
            document.querySelector('.btn-send')
        );
    }

    function removeReactiveButton() {
        document.getElementById(REACTIVE_BTN_ID)?.remove();
    }

    function positionReactiveButton() {
        const btn = document.getElementById(REACTIVE_BTN_ID);
        const sendBtn = getSendButton();
        if (!btn || !sendBtn) return;
        const r = sendBtn.getBoundingClientRect();
        const btnWidth = btn.offsetWidth || 90;
        btn.style.top = `${r.top + r.height / 2 - 18}px`;
        btn.style.left = `${r.left - btnWidth - 8}px`;
    }

    function injectReactiveButton() {
        if (document.getElementById(REACTIVE_BTN_ID)) {
            positionReactiveButton();
            return;
        }

        const sendBtn = getSendButton();
        if (!sendBtn) return;

        const btn = document.createElement('button');
        btn.id = REACTIVE_BTN_ID;
        btn.title = 'Check with SureAnot.ai before sending';
        btn.style.cssText = [
            'position:fixed',
            'display:inline-flex',
            'align-items:center',
            'justify-content:center',
            'gap:5px',
            'padding:0 12px',
            'height:36px',
            'border-radius:18px',
            'border:1.5px solid #f97316',
            'background:#fff7ed',
            'color:#c2410c',
            'font-size:12px',
            'font-weight:600',
            'font-family:sans-serif',
            'cursor:pointer',
            'white-space:nowrap',
            'z-index:2147483640',
            'box-sizing:border-box',
            'box-shadow:0 2px 8px rgba(0,0,0,0.15)',
            'pointer-events:auto',
        ].join(';');

        btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> Check`;

        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const text = getComposedText();
            if (!text || text.length < 10) return;
            // Reactive mode: check only — don't auto-send after a clean result
            guardSend(text, false);
        });

        document.body.appendChild(btn);
        // Position after appending so offsetWidth is available
        requestAnimationFrame(positionReactiveButton);
    }

    function syncReactiveButton() {
        if (currentAnalysisMode === 'reactive') {
            injectReactiveButton();
        } else {
            removeReactiveButton();
        }
    }

    // Re-position on any DOM change or scroll/resize
    const guardObserver = new MutationObserver(() => {
        syncReactiveButton();
        positionReactiveButton();
    });
    guardObserver.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', positionReactiveButton);
    window.addEventListener('scroll', positionReactiveButton, true);

    // Also re-sync when the mode changes at runtime
    if (chrome?.storage?.onChanged) {
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'sync' && changes.analysisMode) {
                currentAnalysisMode = changes.analysisMode.newValue;
                syncReactiveButton();
            }
        });
    }

    // Initial injection if already in reactive mode
    setTimeout(syncReactiveButton, 1200);

    console.log(`SureAnot.ai: Send guard active for ${platformName}.`);
}
