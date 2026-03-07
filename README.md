# Telegram Fake News Checker 🛡️

A Chrome extension that helps identify potential misinformation and fake news in your Telegram Web chats using advanced heuristic analysis and optional fact-checking APIs.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Chrome](https://img.shields.io/badge/chrome-extension-yellow.svg)

## 🌟 Features

- **Real-time Message Analysis**: Automatically scans Telegram Web messages as they appear
- **Risk Scoring System**: Assigns risk scores to messages based on multiple factors
- **Visual Warning Indicators**: Color-coded badges (🚫 High, ⚠️ Medium, ℹ️ Low) show potential misinformation
- **Detailed Explanations**: View specific warning flags for each flagged message
- **Two Checking Modes**:
  - **Automatic**: Continuously monitor and check all messages
  - **Manual**: Check messages only when you request it
- **External Fact-Checking**: Optional integration with Google Fact Check Tools API and NewsAPI
- **Privacy-Focused**: All analysis performed locally unless external APIs are used
- **Statistics Dashboard**: Track how many messages have been checked and flagged
- **Cache System**: Reduces redundant API calls for previously checked content

## 🔍 How It Works

### Local Analysis
The extension analyzes messages for:
- **Suspicious Keywords**: "breaking", "urgent", "shocking", "they don't want you to know", etc.
- **Excessive Capitalization**: SHOUTING IN ALL CAPS
- **Excessive Punctuation**: Multiple exclamation or question marks (!!!, ???)
- **Emotional Manipulation**: Words designed to provoke strong emotional responses
- **Unverified Claims**: Claims without credible source citations
- **Suspicious URLs**: Shortened URLs or links from unreliable domains

### Risk Scoring
Each message receives a risk score (0-100) based on detected patterns:
- **0-39**: Low risk (ℹ️ Info icon)
- **40-69**: Medium risk (⚠️ Warning icon)
- **70-100**: High risk (🚫 Stop icon)

### External Verification
Optionally integrate with:
- **Google Fact Check Tools API**: Verify claims against known fact-checks
- **NewsAPI**: Check if claims appear in mainstream news sources

## 📦 Installation

### Method 1: Load Unpacked Extension (Developer Mode)

1. **Download or Clone this repository**:
   ```bash
   git clone https://github.com/yourusername/telegram-fake-news-checker.git
   cd telegram-fake-news-checker
   ```

2. **Open Chrome Extensions page**:
   - Navigate to `chrome://extensions/`
   - Or: Menu → More Tools → Extensions

3. **Enable Developer Mode**:
   - Toggle the "Developer mode" switch in the top right corner

4. **Load the Extension**:
   - Click "Load unpacked"
   - Select the `hackomania2026` folder from this repository

5. **Verify Installation**:
   - You should see "Telegram Fake News Checker" in your extensions list
   - The extension icon (🛡️) should appear in your Chrome toolbar

### Method 2: Chrome Web Store (Coming Soon)
The extension will be available on the Chrome Web Store after review.

## 🚀 Usage

### Basic Setup

1. **Open Telegram Web**:
   - Navigate to https://web.telegram.org
   - Log in to your account

2. **Enable the Extension**:
   - Click the extension icon (🛡️) in your toolbar
   - Ensure the "Enable Protection" toggle is ON
   - The status should show "Active" with a green dot

3. **Choose Your Mode**:
   - **Automatic Mode**: Extension checks all messages automatically
   - **Manual Mode**: Click "Check with Fact-Checker" button on messages

### Using the Extension

1. **View Warnings**:
   - Flagged messages will show a colored badge at the bottom
   - Click "Details" to see why the message was flagged

2. **Check with External APIs**:
   - Click "Check with Fact-Checker" for external verification
   - Results will appear below the warning flags

3. **Dismiss Warnings**:
   - Click "Dismiss" if you believe a warning is incorrect
   - The warning will be removed for that message

### Configuration

#### API Keys (Optional)

To enable external fact-checking:

1. **Get API Keys**:
   - **Google Fact Check Tools API**: 
     - Visit [Google Cloud Console](https://console.cloud.google.com/)
     - Enable "Fact Check Tools API"
     - Create credentials and copy your API key
   
   - **NewsAPI**:
     - Visit [NewsAPI.org](https://newsapi.org/)
     - Sign up for a free account
     - Copy your API key from the dashboard

2. **Add Keys to Extension**:
   - Click the extension icon
   - Expand "API Settings"
   - Paste your API keys
   - Click "Save API Keys"

#### Settings

- **Enable/Disable**: Toggle the extension on/off
- **Checking Mode**: Switch between Automatic and Manual
- **Clear Cache**: Remove cached fact-check results
- **Re-analyze**: Force re-check of all visible messages

## 📊 Understanding Warning Flags

### Common Warning Flags

| Flag | Meaning | Example |
|------|---------|---------|
| Suspicious keyword | Sensationalist language detected | "URGENT!", "SHOCKING truth" |
| Excessive capitalization | Too many capital letters | "THIS IS THE TRUTH!!!" |
| Excessive punctuation | Multiple punctuation marks | "Really??? Are you sure!!!" |
| Multiple URLs | Several links in one message | "Check this... and this... and this..." |
| Claims without sources | Unverified statements | "Studies show..." (no source cited) |
| Emotional manipulation | Words designed to provoke emotion | "TERRIFYING", "AMAZING", "OUTRAGEOUS" |

### Risk Score Interpretation

- **Low (0-39)**: Minor concerns, use normal caution
- **Medium (40-69)**: Multiple warning signs, verify before sharing
- **High (70-100)**: Strong indicators of misinformation, investigate thoroughly

## 🔒 Privacy & Security

### Data Collection
- **No personal data is collected or transmitted**
- Message text is only analyzed locally in your browser
- External APIs are only used when you explicitly request fact-checking

### Permissions Explained
- `storage`: Save your settings and preferences
- `activeTab`: Interact with Telegram Web page
- `host_permissions` (web.telegram.org): Analyze messages on Telegram Web

### Security
- API keys are stored locally in Chrome's secure storage
- No third-party tracking or analytics
- All code is open source and auditable

## 🛠️ Development

### Project Structure
```
hackomania2026/
├── manifest.json          # Extension configuration
├── content.js            # Main content script (message analysis)
├── content.css           # Styles for warning indicators
├── service-worker.js     # Background worker (API calls)
├── popup.html            # Extension popup interface
├── popup.js              # Popup functionality
└── images/               # Extension icons
```

### Tech Stack
- **Manifest Version**: 3 (latest Chrome extension standard)
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **APIs**: Chrome Extensions API
- **Optional APIs**: Google Fact Check Tools API, NewsAPI

### Building from Source

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/telegram-fake-news-checker.git
   ```

2. No build process required - it's vanilla JavaScript!

3. Load in Chrome as described in Installation section

### Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🐛 Troubleshooting

### Extension Not Working

**Problem**: No warnings appear on Telegram messages

**Solutions**:
- Verify you're on https://web.telegram.org (not the desktop app)
- Check that the extension is enabled in the popup
- Refresh the Telegram Web page
- Check Chrome's console for errors (F12 → Console tab)

### API Integration Issues

**Problem**: External fact-checking doesn't work

**Solutions**:
- Verify API keys are correctly entered
- Check API key quotas/limits haven't been exceeded
- Ensure APIs are enabled in your Google Cloud/NewsAPI dashboard
- Check browser console for API error messages

### Performance Issues

**Problem**: Extension slows down Telegram Web

**Solutions**:
- Switch to "Manual" mode to reduce automatic checking
- Clear the cache in extension settings
- Disable external API checking
- Close and reopen Telegram Web tab

## ⚠️ Disclaimer

This extension is a tool to help identify **potential** misinformation. It is not perfect and should not be your only source of truth. Always:

- Use critical thinking when evaluating information
- Verify important claims from multiple credible sources
- Understand that some legitimate messages may be flagged
- Remember that absence of flags doesn't guarantee accuracy

The developers are not responsible for any decisions made based on this tool's analysis.

## 📜 License

MIT License - see LICENSE file for details

## 🤝 Acknowledgments

- Created for Hackomania 2026
- Uses heuristic analysis techniques from media literacy research
- Icon designs inspired by security and trust indicators

## 📞 Support

- **Report Issues**: [GitHub Issues](https://github.com/yourusername/telegram-fake-news-checker/issues)
- **Feature Requests**: Open an issue with the "enhancement" label
- **Security Issues**: Please report privately to security@example.com

## 🗺️ Roadmap

- [ ] Support for more languages
- [ ] Integration with additional fact-checking APIs
- [ ] Machine learning-based analysis
- [ ] Browser support (Firefox, Edge)
- [ ] Export flagged messages report
- [ ] Whitelist/blacklist management
- [ ] Custom keyword configuration

---

**Made with ❤️ for a more informed internet**