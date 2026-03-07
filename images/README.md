# Extension Icons

This directory contains the icon files for the Telegram Fake News Checker extension.

## Required Icons

The extension requires the following icon sizes:

- `icon-16.png` - 16x16 pixels (toolbar icon, small)
- `icon-32.png` - 32x32 pixels (toolbar icon, medium)
- `icon-48.png` - 48x48 pixels (extension management page)
- `icon-128.png` - 128x128 pixels (Chrome Web Store, extension details)

## Creating Icons

### Option 1: Use an Online Tool

1. Visit [Favicon Generator](https://favicon.io/) or [Real Favicon Generator](https://realfavicongenerator.net/)
2. Upload a high-resolution shield/security icon (🛡️ emoji or custom design)
3. Generate all required sizes
4. Download and place in this directory

### Option 2: Use Image Editor

1. Create a 128x128 base icon in your preferred editor (Photoshop, GIMP, Figma, etc.)
2. Use a shield or lock icon with a gradient background (purple/blue theme)
3. Resize to create smaller versions:
   - 16x16 (ensure clarity at small size)
   - 32x32
   - 48x48
4. Export as PNG with transparency

### Option 3: Use Emoji as Icon (Quick Start)

For quick development/testing, you can use an emoji as icon:

```bash
# Using ImageMagick (install: apt-get install imagemagick)
convert -size 16x16 xc:transparent -font Arial-Unicode-MS -pointsize 14 -fill "#667eea" -gravity center -annotate +0+0 "🛡" icon-16.png
convert -size 32x32 xc:transparent -font Arial-Unicode-MS -pointsize 28 -fill "#667eea" -gravity center -annotate +0+0 "🛡" icon-32.png
convert -size 48x48 xc:transparent -font Arial-Unicode-MS -pointsize 42 -fill "#667eea" -gravity center -annotate +0+0 "🛡" icon-48.png
convert -size 128x128 xc:transparent -font Arial-Unicode-MS -pointsize 112 -fill "#667eea" -gravity center -annotate +0+0 "🛡" icon-128.png
```

## Design Guidelines

### Color Scheme
- Primary: #667eea (purple/blue)
- Secondary: #764ba2 (purple)
- Accent: #28a745 (green for active state)

### Icon Style
- Simple and recognizable
- Shield or lock symbol to represent protection
- Clean lines that work at small sizes
- Transparent background

### Recommendations
- Use a shield icon to represent protection
- Add a checkmark or "!" symbol to indicate verification
- Keep design minimal for clarity at 16x16 size
- Ensure good contrast for visibility

## Current Status

⚠️ **Icons are currently placeholders**

To use the extension immediately, you need to add icon files to this directory. The extension will not load properly without them.

### Quick Fix (Temporary)

Create simple colored squares as placeholders:

```bash
# Using ImageMagick
convert -size 16x16 xc:"#667eea" icon-16.png
convert -size 32x32 xc:"#667eea" icon-32.png
convert -size 48x48 xc:"#667eea" icon-48.png
convert -size 128x128 xc:"#667eea" icon-128.png
```

Or download free icons from:
- [Flaticon](https://www.flaticon.com/) (search: "shield", "security", "verify")
- [Icons8](https://icons8.com/) (search: "shield", "protection")
- [Font Awesome](https://fontawesome.com/) (convert icon to PNG)

## License

Icons should be either:
- Original creations
- Public domain
- Licensed for commercial use
- Properly attributed if required

Make sure to check license terms when using third-party icons.