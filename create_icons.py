#!/usr/bin/env python3
"""
Icon Generator for Telegram Fake News Checker Extension
Creates placeholder icons in all required sizes for Chrome extension
"""

import os

from PIL import Image, ImageDraw, ImageFont


def create_shield_icon(size, filename):
    """
    Create a shield-style icon with gradient background

    Args:
        size: Icon size in pixels (width and height)
        filename: Output filename
    """
    # Create image with transparent background
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Draw gradient background circle
    for i in range(size):
        # Gradient from purple-blue to darker purple
        r = int(102 + (118 - 102) * (i / size))
        g = int(126 + (75 - 126) * (i / size))
        b = int(234 + (162 - 234) * (i / size))

        circle_size = size - (i * 2)
        if circle_size > 0:
            draw.ellipse([i, i, size - i, size - i], fill=(r, g, b, 255))

    # Calculate shield dimensions based on icon size
    margin = max(size // 6, 2)
    shield_width = size - (margin * 2)
    shield_height = shield_width

    # Draw shield shape
    shield_points = [
        (size // 2, margin),  # Top center
        (size - margin, margin + shield_height // 4),  # Top right
        (size - margin, margin + shield_height // 2),  # Middle right
        (size // 2, size - margin),  # Bottom center (point)
        (margin, margin + shield_height // 2),  # Middle left
        (margin, margin + shield_height // 4),  # Top left
    ]

    # Draw white shield
    draw.polygon(shield_points, fill=(255, 255, 255, 255))

    # Draw checkmark inside shield for larger icons
    if size >= 32:
        check_points = [
            (size // 2 - size // 8, size // 2),
            (size // 2 - size // 16, size // 2 + size // 8),
            (size // 2 + size // 6, size // 2 - size // 6),
        ]

        # Draw thick checkmark
        line_width = max(size // 16, 2)
        draw.line(
            [check_points[0], check_points[1]],
            fill=(102, 126, 234, 255),
            width=line_width,
        )
        draw.line(
            [check_points[1], check_points[2]],
            fill=(102, 126, 234, 255),
            width=line_width,
        )

    # Add subtle border to shield for definition
    border_width = max(1, size // 32)
    for i in range(border_width):
        offset_points = [
            (p[0] - i if idx % 2 == 0 else p[0] + i, p[1] - i if idx < 3 else p[1] + i)
            for idx, p in enumerate(shield_points)
        ]
        draw.line(
            offset_points + [offset_points[0]], fill=(200, 200, 200, 180), width=1
        )

    # Save icon
    img.save(filename, "PNG")
    print(f"✓ Created {filename} ({size}x{size})")


def create_simple_icon(size, filename):
    """
    Create a simple fallback icon (colored square with shield emoji)

    Args:
        size: Icon size in pixels
        filename: Output filename
    """
    img = Image.new("RGBA", (size, size), (102, 126, 234, 255))
    draw = ImageDraw.Draw(img)

    # Try to add text if possible
    try:
        # Attempt to use a font that supports emoji
        font_size = size // 2
        font = ImageFont.truetype(
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", font_size
        )
        text = "🛡"

        # Get text bounding box
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]

        # Center text
        x = (size - text_width) // 2
        y = (size - text_height) // 2

        draw.text((x, y), text, font=font, fill=(255, 255, 255, 255))
    except Exception:
        # If font fails, just draw a simple white square
        margin = size // 4
        draw.rectangle(
            [margin, margin, size - margin, size - margin], fill=(255, 255, 255, 255)
        )

    img.save(filename, "PNG")
    print(f"✓ Created {filename} ({size}x{size})")


def main():
    """Main function to generate all required icon sizes"""
    print("🛡️  Telegram Fake News Checker - Icon Generator")
    print("=" * 50)
    print()

    # Create images directory if it doesn't exist
    os.makedirs("images", exist_ok=True)

    # Icon sizes required by Chrome extensions
    sizes = {
        16: "icon-16.png",
        32: "icon-32.png",
        48: "icon-48.png",
        128: "icon-128.png",
    }

    print("Generating icons with PIL (Pillow)...")
    print()

    try:
        for size, filename in sizes.items():
            filepath = os.path.join("images", filename)
            create_shield_icon(size, filepath)

        print()
        print("✅ All icons generated successfully!")
        print()
        print("📝 Icons created in the 'images/' directory:")
        for filename in sizes.values():
            filepath = os.path.join("images", filename)
            if os.path.exists(filepath):
                file_size = os.path.getsize(filepath)
                print(f"   - {filename} ({file_size} bytes)")

        print()
        print("Next steps:")
        print("   1. Load the extension in Chrome (chrome://extensions/)")
        print("   2. Enable Developer Mode")
        print("   3. Click 'Load unpacked' and select this folder")
        print()

    except Exception as e:
        print(f"❌ Error creating icons: {e}")
        print()
        print("Trying simple fallback icons...")
        print()

        try:
            for size, filename in sizes.items():
                filepath = os.path.join("images", filename)
                create_simple_icon(size, filepath)

            print()
            print("✅ Simple fallback icons created!")
            print("   (Consider replacing with professional icons later)")
            print()

        except Exception as e2:
            print(f"❌ Failed to create fallback icons: {e2}")
            print()
            print("Manual solution:")
            print("   1. Download shield icons from: https://flaticon.com")
            print("   2. Resize to 16x16, 32x32, 48x48, and 128x128")
            print("   3. Save as PNG in the 'images/' directory")
            print()
            return 1

    return 0


if __name__ == "__main__":
    try:
        # Check if PIL is available
        import importlib.util

        if importlib.util.find_spec("PIL") is None:
            raise ImportError("PIL not found")

        exit(main())
    except ImportError:
        print("❌ PIL/Pillow is not installed!")
        print()
        print("Install with:")
        print("   pip install Pillow")
        print()
        print("Or use pip3:")
        print("   pip3 install Pillow")
        print()
        print("Alternative: Use the bash script (requires ImageMagick):")
        print("   ./setup-icons.sh")
        print()
        exit(1)
