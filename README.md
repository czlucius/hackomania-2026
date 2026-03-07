# SureBoh.ai

SureBoh.ai is a full-stack, multilingual fact-checking assistant built for the Singaporean context. It seamlessly integrates into popular social platforms to evaluate claims for credibility and provides highly contextual "nutrition labels" for information—without breaking the host site's UI.

## Features

- **Multi-Platform Support:** Works perfectly on **WhatsApp Web**, **Telegram Web**, and **HardwareZone (HWZ)** forums.
- **Contextual Native Injection:** Uses DOM observers to target specific message/post selectors, rendering intuitive UIs (Auto-analysis Banners and Manual "Analyze" buttons) directly next to content.
- **Intelligent Fact-Checking Backend:** Powered by a Python FastAPI backend that interfaces with advanced LLMs, specifically tuned to verify claims against official Singaporean sources (SPF, MOH, MOM, MOT, etc.).
- **Explainability Tooltip:** A robust popover providing an AI Trust Score, a clear verdict (Likely accurate, Unverified / uncertain, Potentially misleading), and an un-truncated explanation of the reasoning.
- **Multi-Language "Kampung" Support:** Fully localized. View AI analysis natively in English (EN), Chinese (中文), and Malay (Melayu) using the Kampung Toggle.
- **Privacy Controls:** An intuitive extension Options page allows users to switch between "Proactive" (auto-scan everything) and "Reactive" (manual scan only) modes.
- **Community Vetting:** Users can Upvote (👍) or Downvote (👎) AI assessments, which syncs to a backend telemetry endpoint.
- **Shadow DOM Isolation:** Extension UI is rendered inside Shadow Roots to prevent style conflicts with the host pages while taking advantage of Tailwind CSS.

## Architecture

1. **Frontend (`/sureboh-extension`)**: A Manifest V3 Chrome Extension built with React, Vite, and Tailwind CSS.
2. **Backend (`/backend`)**: A lightweight Python FastAPI server that handles the LLM orchestration, structured output parsing, and multi-language translations.

## Setup & Running

### 1. Run the Python Backend
The backend requires `uv` to manage the environment and dependencies.
```bash
cd backend
uv sync # Install dependencies
uv run fastapi dev main.py --port 8000
```
This will start the local server on `http://localhost:8000`.

### 2. Build the Chrome Extension
```bash
cd sureboh-extension
npm install
npm run build
```
This compiles the optimized production extension into the `sureboh-extension/dist` folder.

### 3. Load the Extension
1. Open Chrome and navigate to `chrome://extensions`.
2. Enable **Developer mode** (top right corner).
3. Click **Load unpacked** and select the `hackomania-2026/sureboh-extension/dist` folder.

### 4. Test it Out!
1. **HardwareZone**: Go to a thread (e.g., [Cigarette Seizures at Changi](https://forums.hardwarezone.com.sg/threads/3-chinese-passengers-caught-red-handed-at-changi-t1-green-channel-over-300-cartons-of-duty-unpaid-cigarettes-seized.7192186/)). The first post will instantly show a loading box followed by the analysis. Subsequent posts will have manual "Analyze" buttons.
2. **Settings**: Right-click the SureBoh.ai extension icon -> Options to test Proactive vs Reactive modes.

## Tech Stack
- Frontend: React, Tailwind CSS, Manifest V3, Vite (`@crxjs/vite-plugin`), `@floating-ui/react`
- Backend: Python, FastAPI, Pydantic, OpenAI SDK (Structured Outputs)
