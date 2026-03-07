# SureBoh.ai

SureBoh.ai is a full-stack, multilingual fact-checking assistant built for the Singaporean context. It seamlessly integrates into popular social platforms to evaluate claims for credibility and provides highly contextual "nutrition labels" for information—without breaking the host site's UI.
# SureAnot.ai

SureAnot.ai is a full-stack, multilingual fact-checking assistant built for the Singaporean context. It seamlessly integrates into popular social platforms to evaluate claims for credibility and provides highly contextual "nutrition labels" for information—without breaking the host site's UI.

## Table of Contents
- [Features](#features)
- [Project Architecture](#project-architecture)
- [Repository Structure](#repository-structure)
- [How to Run (Development)](#how-to-run-development)

## Features
- **In-Situ Assessment:** Analyze posts directly on Reddit (r/singapore, r/asksingapore) and WhatsApp Web.
- **Multilingual Support:** Explain facts in English, Chinese (Simplified), Malay, and Tamil.
- **AI-Driven Context:** Extends OpenAI with robust source vetting using the `exa_py` engine.
- **Chrome Extension UI:** Custom tailwind-injected components rendered inside Shadow DOMs to prevent CSS leaking.

## Project Architecture
1. **Frontend (`/sureanot-extension`)**: A Manifest V3 Chrome Extension built with React, Vite, and Tailwind CSS.
2. **Backend (`/backend`)**: A FastAPI Python server acting as the analysis engine, backed by OpenAI and Exa.

## Repository Structure
The repo is split into two primary applications:
*   `backend/` - Contains everything needed for the Python Fast API.
*   `sureanot-extension/` - Contains the React/Vite source code for the Chrome Extension.

## How to Run (Development)

### Frontend (Google Chrome Extension)
1. Navigate to the extension folder:
   ```bash
   cd sureanot-extension
   ```
2. Install dependencies and build the extension:
   ```bash
   npm install && npm run build
   ```
   This compiles the optimized production extension into the `sureanot-extension/dist` folder.
3. Load the extension in Chrome:
   1. Open Google Chrome and go to `chrome://extensions/`
   2. Turn on **Developer mode** in the top right.
   3. Click **Load unpacked** and select the `hackomania-2026/sureanot-extension/dist` folder.

### Testing Features
1. **In Action**: Go to `reddit.com/r/singapore` or `web.whatsapp.com`. You should see the SureAnot UI appear alongside posts.
2. **Settings**: Right-click the SureAnot.ai extension icon -> Options to test Proactive vs Reactive modes.
