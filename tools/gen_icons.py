"""Generate PWA PNG icons from a programmatic design.
Run: python tools/gen_icons.py
"""
from PIL import Image, ImageDraw
from pathlib import Path
import math

OUT = Path(__file__).resolve().parent.parent

BG = (15, 23, 42, 255)        # #0f172a
ACCENT = (56, 189, 248, 255)  # #38bdf8
ACCENT_SOFT = (56, 189, 248, 140)
DART = (248, 113, 113, 255)   # #f87171
WHITE = (255, 255, 255, 255)


def lerp(a, b, t):
    return a + (b - a) * t


def draw_icon(size: int, *, rounded: bool, safe_inset_ratio: float = 0.0, dart: bool = True) -> Image.Image:
    """rounded: round corners (for non-maskable). safe_inset_ratio: shrink artwork into safe area for maskable."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # background
    if rounded:
        radius = int(size * 0.22)
        d.rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=BG)
    else:
        d.rectangle((0, 0, size - 1, size - 1), fill=BG)

    # safe area: artwork drawn within this box
    inset = int(size * safe_inset_ratio)
    box = (inset, inset, size - inset, size - inset)
    cx = (box[0] + box[2]) // 2
    cy = (box[1] + box[3]) // 2
    art = box[2] - box[0]
    radius = int(art * 0.30)

    # globe outer ring
    ring = max(3, int(art * 0.025))
    d.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), outline=ACCENT, width=ring)

    # equator (horizontal ellipse)
    eq_h = int(radius * 0.35)
    d.ellipse((cx - radius, cy - eq_h, cx + radius, cy + eq_h), outline=ACCENT_SOFT, width=max(2, ring // 2))

    # meridian (vertical ellipse)
    me_w = int(radius * 0.35)
    d.ellipse((cx - me_w, cy - radius, cx + me_w, cy + radius), outline=ACCENT_SOFT, width=max(2, ring // 2))

    # tilted meridian for richness
    diag = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    dd = ImageDraw.Draw(diag)
    dd.ellipse((cx - int(radius * 0.6), cy - radius, cx + int(radius * 0.6), cy + radius),
               outline=ACCENT_SOFT, width=max(2, ring // 2))
    diag = diag.rotate(28, resample=Image.BICUBIC, center=(cx, cy))
    img.alpha_composite(diag)

    if dart:
        # dart pin: red circle near top-right of globe
        pin_offset_x = int(radius * 0.55)
        pin_offset_y = -int(radius * 0.55)
        px, py = cx + pin_offset_x, cy + pin_offset_y
        pin_r = max(8, int(art * 0.07))
        d.ellipse((px - pin_r, py - pin_r, px + pin_r, py + pin_r), fill=DART)
        d.ellipse((px - pin_r // 2, py - pin_r // 2, px + pin_r // 2, py + pin_r // 2), fill=WHITE)
        # dart shaft (line going up-right)
        shaft_len = int(art * 0.18)
        sx, sy = px + int(shaft_len * 0.85), py - int(shaft_len * 0.85)
        d.line((px, py, sx, sy), fill=DART, width=max(4, int(art * 0.018)))
        # fletching as small triangle
        ftip_x, ftip_y = sx, sy
        fb1 = (ftip_x - int(art * 0.015), ftip_y - int(art * 0.05))
        fb2 = (ftip_x + int(art * 0.05), ftip_y + int(art * 0.015))
        d.polygon([(ftip_x, ftip_y), fb1, fb2], fill=DART)

    return img


def main():
    targets = [
        # (filename, size, rounded?, safe_inset_ratio, has_dart)
        ("apple-touch-icon.png", 180, True,  0.10, True),
        ("icon-192.png",         192, True,  0.10, True),
        ("icon-512.png",         512, True,  0.10, True),
        ("icon-maskable-512.png",512, False, 0.20, True),
        ("favicon-32.png",       32,  True,  0.06, False),
    ]
    for name, size, rounded, inset, dart in targets:
        img = draw_icon(size, rounded=rounded, safe_inset_ratio=inset, dart=dart)
        img.save(OUT / name, "PNG")
        print(f"  wrote {name} ({size}x{size})")


if __name__ == "__main__":
    main()
