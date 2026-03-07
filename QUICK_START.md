# ⚡ Quick Start Guide

Get started with Telegram Fake News Checker in under 5 minutes!

## 📥 Installation (2 minutes)

### Step 1: Generate Icons
```bash
cd hackomania2026
python3 create_icons.py
```

### Step 2: Load in Chrome
1. Open Chrome → `chrome://extensions/`
2. Enable **Developer mode** (toggle top-right)
3. Click **Load unpacked**
4. Select the `hackomania2026` folder
5. Done! 🎉

## 🚀 First Use (1 minute)

1. **Open Telegram Web**
   - Go to https://web.telegram.org
   - Log in to your account

2. **Activate Extension**
   - Click the shield icon (🛡️) in your toolbar
   - Verify status shows "Active" (green dot)

3. **Start Monitoring**
   - Open any chat
   - The extension automatically analyzes messages
   - Look for warning badges on suspicious messages

## 🎯 Understanding Warnings

| Icon | Risk Level | Action |
|------|-----------|---------|
| 🚫 Red | HIGH (70-100%) | ⚠️ Likely false - Do not share |
| ⚠️ Orange | MEDIUM (40-69%) | ⚠️ Verify before sharing |
| ℹ️ Yellow | LOW (0-39%) | ℹ️ Exercise normal caution |

## 🔧 Quick Settings

Click extension icon to access:

- **Enable/Disable**: Toggle protection on/off
- **Mode**: 
  - 🤖 **Automatic** - Checks all messages
  - 👆 **Manual** - Check on demand
- **Statistics**: View messages checked and flagged

## 📝 Test It Out

Send yourself this test message on Telegram Web:

```
URGENT!!! BREAKING NEWS!!! Scientists HATE this one WEIRD TRICK! 
They don't want you to KNOW this SHOCKING truth!!! SHARE NOW!!!
```

Expected result: 🚫 **High risk warning**

## 💡 Quick Tips

✅ **DO:**
- Read the "Details" to understand why messages are flagged
- Use "Check with Fact-Checker" for important claims
- Think critically even without warnings
- Verify information from multiple sources

❌ **DON'T:**
- Blindly trust or dismiss based solely on warnings
- Share high-risk messages without verification
- Assume no warning means 100% accurate
- Ignore your own judgment

## 🆘 Troubleshooting

**Extension not working?**
- ✓ Are you on web.telegram.org (not desktop app)?
- ✓ Is extension enabled in popup?
- ✓ Did you refresh the page?
- ✓ Check console (F12) for errors

**No icons?**
- Run: `python3 create_icons.py`
- Or see `images/README.md` for alternatives

**Need more help?**
- See [INSTALLATION.md](INSTALLATION.md) for detailed guide
- See [README.md](README.md) for full documentation
- Open an issue on GitHub

## 🎓 Learn More

- **How it works**: [DETECTION_GUIDE.md](DETECTION_GUIDE.md)
- **Full features**: [README.md](README.md)
- **Contributing**: [CONTRIBUTING.md](CONTRIBUTING.md)

## 📊 What Gets Detected?

The extension flags messages with:
- Sensationalist keywords ("URGENT", "SHOCKING")
- ALL CAPS text (>30%)
- Excessive punctuation (!!!, ???)
- Emotional manipulation language
- Shortened URLs (bit.ly, tinyurl)
- Claims without credible sources

## 🔒 Privacy

- ✅ All analysis done locally
- ✅ No data collection
- ✅ No tracking
- ✅ Open source code

## ⚙️ Optional: API Setup

For enhanced fact-checking (optional):

1. **Get API Keys** (free tiers available):
   - Google Fact Check: console.cloud.google.com
   - NewsAPI: newsapi.org

2. **Add to Extension**:
   - Click extension icon
   - Expand "API Settings"
   - Paste keys → Save

## 🎯 Your Mission

Help combat misinformation by:
1. ✅ Verifying before sharing
2. ✅ Thinking critically
3. ✅ Checking sources
4. ✅ Staying informed
5. ✅ Educating others

---

**Ready to go? Open Telegram Web and start protecting yourself from fake news! 🛡️**

Questions? Check [README.md](README.md) or open an issue on GitHub.