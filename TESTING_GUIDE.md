# Testing SureAnot.ai Features

The merge conflicts are resolved and the local backend is up and running. Here is how you can test the new Instagram, Reddit, and Send Guard features:

### 1. Load the Extension
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top right corner).
3. Click **Load unpacked** and select the `/Users/weidong/Documents/development/hackomania-2026/sureboh-extension/dist` folder.
*Note: If you already have it loaded, click the **Reload** icon on the extension card.*

### 2. Test Image Analysis (Instagram & WhatsApp)
1. Go to **Instagram** (`instagram.com`) or **WhatsApp Web**.
2. Find any post or reel containing a large image.
3. You should see a "SureAnot Scan" overlay on the image. Click it!
4. It will send a request to the backend `/api/image/check` endpoint to verify if the image is manipulated or AI-generated.

### 3. Test Text Fact-Checking (Reddit & Telegram)
1. Go to **Reddit** (`reddit.com/r/singapore` or `reddit.com/r/singaporeraw`).
2. The extension will automatically inject the SureAnot "Check" UI under the 3 most recent posts or comments.
3. Click it to verify claims! (Wait for the factual nutrition label to pop out).

### 4. Test Send Guard (WhatsApp & Telegram)
1. Open **WhatsApp Web** or **Telegram Web**.
2. Type a message containing an outrageous claim (e.g., *"Government giving $500 to everyone who downloads this new Singpass app! http://fake-link.com"*).
3. Try to hit send (**Enter** or the **Send button**).
4. If in "Proactive Mode", it will intercept your message, analyze it, and pop up a warning modal preventing you from sending fake news by mistake!
