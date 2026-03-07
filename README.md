# SureBoh.ai Chrome Extension

SureBoh.ai is a Chrome Extension that injects natively into WhatsApp Web. It proactively scans incoming messages, evaluates their credibility, and seamlessly overlays a highly contextual, multilingual "nutrition label" for the information without breaking the host site's UI.

## Features
- **Contextual Native Injection:** Uses MutationObserver to target WhatsApp Web's specific message selectors. UI is rendered natively overlaying message bubbles.
- **Frosted Glass & Glow Overlay:** Dynamically highlights Verified, Unverified, or Misleading claims with elegant Tailwind CSS styling.
- **Explainability Tooltip:** A precise popover (via `@floating-ui/react`) providing an AI Confidence Score, reasoning, and verified sources.
- **Kampung Toggle:** A localization feature enabling instant translation between English (EN), Chinese (中文), and Malay (Melayu).
- **Shadow DOM Isolation:** Renders inside a Shadow Root, scoping Tailwind CSS exclusively to the plugin, preventing it from overriding WhatsApp Web CSS.

## Setup & Testing
1. Navigate to `sureboh-extension` and run `npm install`.
2. Run `npm run build` to compile the optimized Manifest V3 extension into the `dist` folder.
3. Open Chrome and navigate to `chrome://extensions`.
4. Enable **Developer mode** (top right corner).
5. Click **Load unpacked** and select the `hackomania-2026/sureboh-extension/dist` folder.
6. Open [WhatsApp Web](https://web.whatsapp.com/).
7. Send a message matching test conditions:
   - "cdc voucher expiry scam" -> triggers Misleading warning.
   - "official gov.sg announcements" -> triggers Verified checkmark.
   - Other generic statements -> triggers Unverified warning.

## Tech Stack
- React (injected via Content Scripts)
- Tailwind CSS (scoped via Shadow DOM)
- Manifest V3 & Vite (`@crxjs/vite-plugin`)
