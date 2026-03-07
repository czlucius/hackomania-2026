#!/bin/bash
# Setup script for generating placeholder icons for Telegram Fake News Checker
# This creates simple colored icons as placeholders until proper icons are designed

echo "🛡️  Telegram Fake News Checker - Icon Setup"
echo "==========================================="
echo ""

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "⚠️  ImageMagick not found. Installing placeholder icons requires ImageMagick."
    echo ""
    echo "Install ImageMagick:"
    echo "  Ubuntu/Debian: sudo apt-get install imagemagick"
    echo "  macOS: brew install imagemagick"
    echo "  Windows: Download from https://imagemagick.org/script/download.php"
    echo ""
    echo "Alternatively, you can:"
    echo "  1. Use online tools like favicon.io to generate icons"
    echo "  2. Download free shield icons from flaticon.com or icons8.com"
    echo "  3. Create icons manually using an image editor"
    echo ""
    exit 1
fi

# Create images directory if it doesn't exist
mkdir -p images

echo "Generating placeholder icons..."
echo ""

# Generate simple gradient shield icons
# Using a purple/blue gradient matching the extension theme

# Create 128x128 base icon with gradient
convert -size 128x128 \
    gradient:"#667eea"-"#764ba2" \
    -gravity center \
    \( -size 100x100 xc:none -fill white \
       -draw "path 'M 50,10 L 90,30 L 90,60 Q 90,80 50,90 Q 10,80 10,60 L 10,30 Z'" \
    \) \
    -composite \
    images/icon-128.png

echo "✓ Created icon-128.png (128x128)"

# Resize for other sizes
convert images/icon-128.png -resize 48x48 images/icon-48.png
echo "✓ Created icon-48.png (48x48)"

convert images/icon-128.png -resize 32x32 images/icon-32.png
echo "✓ Created icon-32.png (32x32)"

convert images/icon-128.png -resize 16x16 images/icon-16.png
echo "✓ Created icon-16.png (16x16)"

echo ""
echo "✅ All icons generated successfully!"
echo ""
echo "📝 Note: These are placeholder icons. For production use, consider:"
echo "   - Designing custom icons with better detail"
echo "   - Using professional icon design services"
echo "   - Downloading high-quality icons from icon libraries"
echo ""
echo "Next steps:"
echo "   1. Load the extension in Chrome (chrome://extensions/)"
echo "   2. Enable Developer Mode"
echo "   3. Click 'Load unpacked' and select the hackomania2026 folder"
echo ""
