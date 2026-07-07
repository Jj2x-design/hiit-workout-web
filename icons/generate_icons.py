"""Generate the HIIT Workout app icon set (retro-future chrome/neon dumbbell)."""
from PIL import Image, ImageDraw, ImageFilter
import math
import os

OUT_DIR = os.path.dirname(os.path.abspath(__file__))

BG_TOP = (10, 14, 26)      # #0a0e1a
BG_BOTTOM = (18, 10, 36)   # deep purple-night
CYAN = (0, 229, 255)       # #00e5ff
MAGENTA = (199, 36, 255)   # #c724ff
ORANGE = (255, 107, 26)    # #ff6b1a
CHROME_LIGHT = (235, 240, 248)
CHROME_MID = (150, 165, 190)
CHROME_DARK = (70, 80, 100)


def make_base(size):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 255))
    draw = ImageDraw.Draw(img)
    # vertical night-sky gradient background
    for y in range(size):
        t = y / size
        r = int(BG_TOP[0] + (BG_BOTTOM[0] - BG_TOP[0]) * t)
        g = int(BG_TOP[1] + (BG_BOTTOM[1] - BG_TOP[1]) * t)
        b = int(BG_TOP[2] + (BG_BOTTOM[2] - BG_TOP[2]) * t)
        draw.line([(0, y), (size, y)], fill=(r, g, b, 255))
    return img, draw


def draw_horizon_grid(draw, size):
    horizon_y = int(size * 0.68)
    # horizontal glow line at horizon
    for i in range(6):
        alpha = max(0, 120 - i * 20)
        draw.line([(0, horizon_y + i), (size, horizon_y + i)],
                   fill=(MAGENTA[0], MAGENTA[1], MAGENTA[2], alpha))
    # perspective grid lines below horizon
    n_lines = 7
    for i in range(1, n_lines):
        x_top = size * i / n_lines
        x_bottom_offset = (x_top - size / 2) * 2.2
        x_bottom = size / 2 + x_bottom_offset
        draw.line([(x_top, horizon_y), (x_bottom, size)],
                   fill=(MAGENTA[0], MAGENTA[1], MAGENTA[2], 70), width=max(1, size // 300))
    n_horiz = 5
    for i in range(1, n_horiz + 1):
        t = (i / n_horiz) ** 1.6
        y = horizon_y + t * (size - horizon_y)
        draw.line([(0, y), (size, y)], fill=(MAGENTA[0], MAGENTA[1], MAGENTA[2], 55))


def draw_glow_layer(size, draw_fn, color, blur_radius, alpha=255):
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    draw_fn(d, color + (alpha,))
    return layer.filter(ImageFilter.GaussianBlur(blur_radius))


def dumbbell_path(draw, size, color, weight_scale=1.0, outline_only=False):
    cx, cy = size / 2, size * 0.46
    bar_len = size * 0.5 * weight_scale
    bar_thick = size * 0.055
    plate_w = size * 0.10
    plate_h = size * 0.32
    plate_h2 = size * 0.22

    x0 = cx - bar_len / 2
    x1 = cx + bar_len / 2

    # bar (angled slightly for dynamism, ~ -18deg)
    angle = math.radians(-16)
    def rot(px, py):
        dx, dy = px - cx, py - cy
        rx = dx * math.cos(angle) - dy * math.sin(angle)
        ry = dx * math.sin(angle) + dy * math.cos(angle)
        return (cx + rx, cy + ry)

    # bar rectangle corners
    bar_pts = [
        rot(x0, cy - bar_thick / 2), rot(x1, cy - bar_thick / 2),
        rot(x1, cy + bar_thick / 2), rot(x0, cy + bar_thick / 2),
    ]
    draw.polygon(bar_pts, fill=color)

    def plate(px, w, h):
        pts = [
            rot(px - w / 2, cy - h / 2), rot(px + w / 2, cy - h / 2),
            rot(px + w / 2, cy + h / 2), rot(px - w / 2, cy + h / 2),
        ]
        draw.polygon(pts, fill=color)

    plate(x0 + plate_w * 0.25, plate_w, plate_h)
    plate(x0 - plate_w * 0.55, plate_w * 0.75, plate_h2)
    plate(x1 - plate_w * 0.25, plate_w, plate_h)
    plate(x1 + plate_w * 0.55, plate_w * 0.75, plate_h2)


def build_icon(size, corner_radius_frac=0.22, padded=True):
    img, draw = make_base(size)
    draw_horizon_grid(draw, size)

    # neon glow behind dumbbell (cyan)
    glow = draw_glow_layer(size, lambda d, c: dumbbell_path(d, size, c[:3]), CYAN,
                            blur_radius=size * 0.045, alpha=230)
    img = Image.alpha_composite(img, glow)
    glow2 = draw_glow_layer(size, lambda d, c: dumbbell_path(d, size, c[:3]), MAGENTA,
                             blur_radius=size * 0.09, alpha=120)
    img = Image.alpha_composite(img, glow2)

    # chrome dumbbell body on top, crisp
    chrome_layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    cd = ImageDraw.Draw(chrome_layer)
    dumbbell_path(cd, size, CHROME_LIGHT)
    img = Image.alpha_composite(img, chrome_layer)

    # thin cyan rim highlight (slightly smaller, offset) for chrome sheen
    rim_layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    rd = ImageDraw.Draw(rim_layer)
    dumbbell_path(rd, size, CYAN, weight_scale=0.985)
    rim_layer = rim_layer.filter(ImageFilter.GaussianBlur(size * 0.004))
    rim_layer.putalpha(60)
    img = Image.alpha_composite(img, rim_layer)

    # lightning bolt accent (orange) crossing through, subtle
    bolt = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    bd = ImageDraw.Draw(bolt)
    bx, by = size * 0.5, size * 0.5
    s = size * 0.16
    pts = [
        (bx - s * 0.15, by - s * 1.3), (bx + s * 0.25, by - s * 0.15),
        (bx - s * 0.05, by - s * 0.15), (bx + s * 0.15, by + s * 1.3),
        (bx - s * 0.3, by + s * 0.05), (bx + s * 0.02, by + s * 0.05),
    ]
    bd.polygon(pts, fill=ORANGE + (235,))
    bolt_glow = bolt.filter(ImageFilter.GaussianBlur(size * 0.02))
    img = Image.alpha_composite(img, bolt_glow)
    img = Image.alpha_composite(img, bolt)

    if padded:
        # rounded-square mask (maskable-friendly: keep art within safe zone already)
        mask = Image.new("L", (size, size), 0)
        mdraw = ImageDraw.Draw(mask)
        r = int(size * corner_radius_frac)
        mdraw.rounded_rectangle([0, 0, size - 1, size - 1], radius=r, fill=255)
        out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        out.paste(img, (0, 0), mask)
        return out
    return img


def save(size, name, corner_radius_frac=0.22):
    icon = build_icon(size, corner_radius_frac=corner_radius_frac)
    icon.convert("RGBA").save(os.path.join(OUT_DIR, name))
    print("wrote", name, icon.size)


if __name__ == "__main__":
    save(512, "icon-512.png", corner_radius_frac=0.0)
    save(192, "icon-192.png", corner_radius_frac=0.0)
    save(180, "apple-touch-icon.png", corner_radius_frac=0.22)  # iOS applies its own mask but a slight radius helps flat display
    save(32, "favicon-32.png", corner_radius_frac=0.15)
    save(16, "favicon-16.png", corner_radius_frac=0.0)
    print("done")
