# Installation & Quick Start Guide

## 🚀 Quick Start (5 minutes)

### Prerequisites
- Google Chrome browser (version 88 or higher)
- Active Telegram account with access to Telegram Web

### Step 1: Download the Extension

```bash
# Clone the repository
git clone https://github.com/yourusername/telegram-fake-news-checker.git
cd telegram-fake-news-checker
```

Or download as ZIP:
1. Click the green "Code" button on GitHub
2. Select "Download ZIP"
3. Extract the ZIP file to a location on your computer

### Step 2: Create Icon Files

The extension requires icon files to run. Choose one of these methods:

#### Method A: Generate Simple Icons (Requires ImageMagick)

```bash
cd hackomania2026
chmod +x setup-icons.sh
./setup-icons.sh
```

#### Method B: Create Placeholder Icons Manually

Create four PNG files in the `hackomania2026/images/` directory:
- `icon-16.png` (16x16 pixels)
- `icon-32.png` (32x32 pixels)
- `icon-48.png` (48x48 pixels)
- `icon-128.png` (128x128 pixels)

You can use any simple colored squares or download free shield icons from:
- https://favicon.io/
- https://flaticon.com/ (search: "shield security")
- https://icons8.com/ (search: "shield")

#### Method C: Use Python to Generate Icons (Cross-platform)

```python
# Save as create_icons.py in hackomania2026 folder
from PIL import Image, ImageDraw

def create_icon(size, filename):
    img = Image.new('RGBA', (size, size), (102, 126, 234, 255))
    draw = ImageDraw.Draw(img)
    # Draw a simple shield shape
    margin = size // 8
    points = [
        (size//2, margin),
        (size-margin, margin*2),
        (size-margin, size//2),
        (size//2, size-margin),
        (margin, size//2),
        (margin, margin*2)
    ]
    draw.polygon(points, fill=(255, 255, 255, 255))
    img.save(f'images/{filename}')
    print(f"✓ Created {filename}")

# Create directory
import os
os.makedirs('images', exist_ok=True)

# Generate all sizes
create_icon(16, 'icon-16.png')
create_icon(32, 'icon-32.png')
create_icon(48, 'icon-48.png')
create_icon(128, 'icon-128.png')
print("\n✅ All icons created!")
```

Run with: `python create_icons.py`

### Step 3: Load Extension in Chrome

1. **Open Chrome Extensions Page**
   - Type `chrome://extensions/` in your address bar, OR
   - Click menu (⋮) → More Tools → Extensions

2. **Enable Developer Mode**
   - Look for the toggle in the top-right corner
   - Switch it ON

3. **Load the Extension**
   - Click the "Load unpacked" button
   - Navigate to and select the `hackomania2026` folder
   - Click "Select Folder" or "Open"

4. **Verify Installation**
   - You should see "Telegram Fake News Checker" in your extensions list
   - The extension should show as "Enabled"
   - Pin it to your toolbar by clicking the puzzle icon and then the pin icon

### Step 4: Use on Telegram Web

1. **Open Telegram Web**
   - Navigate to https://web.telegram.org
   - Log in to your Telegram account

2. **Activate the Extension**
   - Click the extension icon (🛡️) in your Chrome toolbar
   - Verify the status shows "Active" (green dot)
   - Keep "Enable Protection" toggle ON

3. **Start Chatting**
   - Open any chat
   - The extension will automatically analyze messages
   - Flagged messages will show warning indicators

## 🎯 First Time Setup

### Configure Your Preferences

1. **Click the extension icon** to open the popup

2. **Choose Your Mode**:
   - **Automatic Mode** (Recommended): Checks all messages automatically
   - **Manual Mode**: Check only when you click the button

3. **Optional: Add API Keys** (for enhanced fact-checking)
   - Expand "API Settings" section
   - Add Google Fact Check Tools API key (optional)
   - Add NewsAPI key (optional)
   - Click "Save API Keys"

### Understanding the Interface

#### Status Indicators
- **Green dot + "Active"**: Extension is running
- **Red dot + "Inactive"**: Extension is paused

#### Warning Badges
- 🚫 **Red** (High Risk 70-100%): Strong indicators of misinformation
- ⚠️ **Orange** (Medium Risk 40-69%): Multiple warning signs detected
- ℹ️ **Yellow** (Low Risk 0-39%): Minor concerns noted

#### Action Buttons
- **Details**: Show why the message was flagged
- **Check with Fact-Checker**: Verify using external APIs
- **Dismiss**: Remove warning for this message

## 🔧 Configuration Options

### Basic Settings

| Setting | Description | Default |
|---------|-------------|---------|
| Enable Protection | Turn extension on/off | ON |
| Checking Mode | Automatic or Manual | Automatic |

### Advanced Settings (Optional)

#### API Integration

**Google Fact Check Tools API**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable "Fact Check Tools API"
4. Create credentials → API Key
5. Copy and paste into extension settings

**NewsAPI**
1. Visit [NewsAPI.org](https://newsapi.org/)
2. Sign up for free account (up to 100 requests/day)
3. Copy API key from dashboard
4. Paste into extension settings

### Statistics

The extension tracks:
- **Messages Checked**: Total number of analyzed messages
- **Messages Flagged**: How many showed warning signs

Access via the popup dashboard.

## 📱 Testing the Extension

### Test Messages

Try sending these test messages to yourself to see how the extension works:

**High Risk Example:**
```
URGENT!!! BREAKING NEWS!!! Scientists HATE this one WEIRD TRICK!!! 
They don't want you to KNOW this SHOCKING truth!!! SHARE NOW before 
it gets DELETED!!! bit.ly/xyz123
```

**Medium Risk Example:**
```
Breaking: New study claims miracle cure found! This will blow your mind! 
Click here to learn more!!!
```

**Low Risk Example:**
```
According to a study published in Nature by researchers at MIT, 
new findings suggest... [credible source link]
```

### Expected Results

- High risk message should show 🚫 red warning
- Medium risk message should show ⚠️ orange warning
- Low risk message might show ℹ️ yellow or no warning

## 🐛 Troubleshooting

### Extension Won't Load

**Error: "Manifest file is missing or unreadable"**
- Solution: Make sure you selected the `hackomania2026` folder, not the parent folder

**Error: "Could not load icon"**
- Solution: Icons are missing. Follow Step 2 above to create icon files

### No Warnings Appearing

**Check These:**
1. ✓ Is the extension enabled in popup?
2. ✓ Are you on https://web.telegram.org (not desktop app)?
3. ✓ Did you refresh the page after loading extension?
4. ✓ Are messages long enough? (Minimum 50 characters)

**Debug Steps:**
1. Press F12 to open Developer Tools
2. Click "Console" tab
3. Look for errors (red text)
4. Check if you see "Telegram Fake News Checker initialized"

### API Keys Not Working

**Common Issues:**
- API key has typos (copy-paste carefully)
- API not enabled in Google Cloud Console
- API quota exceeded
- Invalid or expired key

**Solution:**
1. Verify key is correctly copied
2. Check API dashboard for status
3. Ensure billing is enabled (if required)
4. Try regenerating the key

### Performance Issues

**If Telegram Web is slow:**
1. Switch to "Manual" mode
2. Clear cache in extension popup
3. Disable API checking temporarily
4. Close other tabs/extensions

## 🔒 Privacy & Permissions

### What the Extension Can Access

- **storage**: Save your settings locally
- **activeTab**: Interact with Telegram Web page
- **web.telegram.org**: Read messages on this site only

### What the Extension CANNOT Do

- ❌ Access other websites
- ❌ Send your data anywhere (without API usage)
- ❌ Read your Telegram credentials
- ❌ Access your contacts or profile
- ❌ Modify your messages

### Data Privacy

- All analysis happens locally in your browser
- No data sent to developers
- API calls only when you use fact-checking features
- API keys stored locally in Chrome secure storage

## 🆘 Getting Help

### Documentation
- [README.md](README.md) - Full documentation
- [images/README.md](images/README.md) - Icon creation guide

### Support Channels
- **GitHub Issues**: Report bugs or request features
- **Discussions**: Ask questions and share tips

### Common Questions

**Q: Does this work on Telegram Desktop app?**
A: No, only on Telegram Web (web.telegram.org)

**Q: Will this slow down my browser?**
A: Minimal impact. Uses efficient local analysis. Switch to manual mode if needed.

**Q: How accurate is the detection?**
A: Local analysis provides guidance, not absolute truth. External APIs improve accuracy.

**Q: Can I use this in other languages?**
A: Currently optimized for English. Other languages coming soon.

**Q: Is this free?**
A: Yes, completely free. API services have free tiers.

## ✅ Verification Checklist

Before reporting issues, verify:

- [ ] Chrome version 88 or higher
- [ ] All icon files exist in images/ folder
- [ ] Extension shows as "Enabled" in chrome://extensions/
- [ ] On https://web.telegram.org (not desktop app)
- [ ] Extension status shows "Active" in popup
- [ ] Page refreshed after loading extension
- [ ] Browser console shows no errors

## 🎓 Next Steps

Now that you're set up:

1. **Read the full [README.md](README.md)** for detailed features
2. **Learn about warning flags** and what they mean
3. **Configure API keys** for enhanced checking
4. **Share feedback** to help improve the extension
5. **Stay informed** and think critically!

---

**Need more help?** Open an issue on GitHub or check existing issues for solutions.

**Happy fact-checking! 🛡️**