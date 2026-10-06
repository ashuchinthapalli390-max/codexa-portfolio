import os
import math
from PIL import Image, ImageDraw, ImageFont

output_dir = os.path.join(os.getcwd(), "public", "email-assets")
os.makedirs(output_dir, exist_ok=True)

# 1. Process Logo
logo_src = os.path.join(os.getcwd(), "public", "logo.jpeg")
logo_dest = os.path.join(output_dir, "codexa-logo.png")

if os.path.exists(logo_src):
    try:
        with Image.open(logo_src) as img:
            img.convert("RGBA").save(logo_dest, "PNG")
            print("Saved codexa-logo.png from logo.jpeg")
    except Exception as e:
        print(f"Error converting logo: {e}")

# If logo didn't exist or we want a standalone clean transparent logo as well:
if not os.path.exists(logo_dest):
    img = Image.new("RGBA", (400, 100), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # Draw simple fallback CodeXa text
    d.text((20, 30), "CODEXA", fill=(255, 255, 255, 255))
    img.save(logo_dest, "PNG")

# 2. Generate animated GIF: payment-reminder.gif
# Master resolution: 1000 x 520
W, H = 1000, 520
num_frames = 24
fps = 7  # ~3.4 seconds total loop

# Try to load Windows system fonts
def get_font(size, bold=False):
    font_paths = [
        "C:\\Windows\\Fonts\\arialbd.ttf" if bold else "C:\\Windows\\Fonts\\arial.ttf",
        "C:\\Windows\\Fonts\\segoeuib.ttf" if bold else "C:\\Windows\\Fonts\\segoeui.ttf",
        "C:\\Windows\\Fonts\\tahomabd.ttf" if bold else "C:\\Windows\\Fonts\\tahoma.ttf",
    ]
    for p in font_paths:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    return ImageFont.load_default()

font_title = get_font(28, bold=True)
font_amount = get_font(84, bold=True)
font_badge = get_font(22, bold=True)
font_desc = get_font(24, bold=False)
font_sub = get_font(20, bold=False)
font_logo = get_font(32, bold=True)

frames = []

for i in range(num_frames):
    t = i / num_frames  # 0.0 to 1.0
    frame = Image.new("RGB", (W, H), (12, 12, 14))
    draw = ImageDraw.Draw(frame)

    # Background subtle radial/gradient glow
    # Subtle dark crimson ambient glow in center
    pulse = (math.sin(t * 2 * math.pi) + 1) / 2 # 0 to 1
    glow_radius = int(280 + 40 * pulse)
    glow_alpha = int(25 + 15 * pulse)
    
    # Outer Card border
    draw.rounded_rectangle([(16, 16), (W - 16, H - 16)], radius=24, outline=(42, 42, 48), width=2)
    # Subtle inner accent line
    draw.rounded_rectangle([(24, 24), (W - 24, H - 24)], radius=18, outline=(24, 24, 28), width=1)

    # Top Brand / Header
    # CodeXa Emblem
    cx = W // 2
    draw.text((cx - 85, 48), "CODE", fill=(255, 255, 255), font=font_logo)
    draw.text((cx + 15, 48), "XA", fill=(225, 29, 46), font=font_logo)
    
    # Thin divider
    draw.line([(cx - 140, 96), (cx + 140, 96)], fill=(45, 45, 52), width=1)

    # Category / Title
    draw.text((cx - 240, 116), "MANDATORY INTERNSHIP SERVICE FEE", fill=(170, 170, 180), font=font_title)

    # Amount ₹450 with subtle crimson glow
    amount_str = "₹450"
    # Draw glow around amount
    glow_col = (int(180 + 60 * pulse), int(20 + 15 * pulse), int(30 + 15 * pulse))
    draw.text((cx - 110, 165), amount_str, fill=glow_col, font=font_amount)

    # "PAYMENT PENDING" badge with pill background
    badge_w, badge_h = 260, 44
    bx0, by0 = cx - badge_w // 2, 285
    bx1, by1 = bx0 + badge_w, by0 + badge_h
    draw.rounded_rectangle([(bx0, by0), (bx1, by1)], radius=22, fill=(43, 11, 11), outline=(130, 29, 29), width=2)
    
    # Dot inside badge
    dot_color = (255, 60, 60) if (i % 6 < 4) else (150, 30, 30)
    draw.ellipse([(bx0 + 20, by0 + 16), (bx0 + 32, by0 + 28)], fill=dot_color)
    draw.text((bx0 + 44, by0 + 10), "PAYMENT PENDING", fill=(255, 95, 95), font=font_badge)

    # Service breakdown info at bottom
    draw.text((cx - 290, 355), "Mandatory Student ID Card (₹150) + AI Tools Pack (₹300)", fill=(190, 190, 200), font=font_desc)
    draw.text((cx - 210, 395), "Daily Automated Reminder • Official CodeXa Agency Billing", fill=(110, 110, 120), font=font_sub)

    # Red scanning laser line effect moving downwards or across
    scan_y = int(60 + t * 400)
    # Draw scan line with fading edges
    for sx in range(100, W - 100, 4):
        dist_from_center = abs(sx - cx) / (W / 2)
        alpha_factor = max(0, 1 - dist_from_center ** 2)
        if alpha_factor > 0:
            c_val = int(220 * alpha_factor * (0.6 + 0.4 * pulse))
            draw.line([(sx, scan_y), (sx + 3, scan_y)], fill=(c_val, int(c_val * 0.15), int(c_val * 0.2)), width=2)

    frames.append(frame)

# Save as optimized animated GIF
gif_path = os.path.join(output_dir, "payment-reminder.gif")
# Optimize palette to reduce size well below 1MB
frames[0].save(
    gif_path,
    save_all=True,
    append_images=frames[1:],
    duration=int(1000 / fps),
    loop=0,
    optimize=True
)

file_size_kb = os.path.getsize(gif_path) / 1024
print(f"Generated {gif_path} ({file_size_kb:.2f} KB)")

# Also generate payment-success.png
success_img = Image.new("RGB", (W, 400), (12, 12, 14))
sd = ImageDraw.Draw(success_img)
sd.rounded_rectangle([(16, 16), (W - 16, 400 - 16)], radius=24, outline=(42, 42, 48), width=2)
sd.text((W // 2 - 85, 48), "CODE", fill=(255, 255, 255), font=font_logo)
sd.text((W // 2 + 15, 48), "XA", fill=(225, 29, 46), font=font_logo)
sd.line([(W // 2 - 140, 96), (W // 2 + 140, 96)], fill=(45, 45, 52), width=1)
sd.text((W // 2 - 220, 125), "PAYMENT RECEIVED & CONFIRMED", fill=(34, 197, 94), font=font_title)
sd.text((W // 2 - 110, 180), "₹450", fill=(255, 255, 255), font=font_amount)
sd.text((W // 2 - 270, 290), "Your Mandatory Internship Service Fee has been verified.", fill=(200, 200, 210), font=font_desc)
sd.text((W // 2 - 210, 335), "Automated payment reminders have been stopped permanently.", fill=(130, 130, 140), font=font_sub)

success_path = os.path.join(output_dir, "payment-success.png")
success_img.save(success_path, "PNG")
print(f"Generated {success_path}")
