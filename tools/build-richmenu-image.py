#!/usr/bin/env python3
"""Build the LINE rich menu image.

LINE requires 2500x1686 (large) or 2500x843 (compact), PNG/JPEG, under 1MB.
We use the large layout: 2 rows x 3 columns of 833x843 tiles, matching the
tap areas declared in tools/setup-richmenu.js — keep the two in sync.

    python3 tools/build-richmenu-image.py

Writes tools/richmenu.png.
"""
import os
from PIL import Image, ImageDraw, ImageFont

W, H = 2500, 1686
COLS, ROWS = 3, 2
TILE_W, TILE_H = W // COLS, H // ROWS          # 833 x 843

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
MASCOT = os.path.join(REPO, 'assets', 'characters', 'mascot-face.png')
OUT = os.path.join(HERE, 'richmenu.png')

FONT_CANDIDATES = [
    '/usr/share/fonts/truetype/fonts-japanese-gothic.ttf',
    '/usr/share/fonts/opentype/ipafont-gothic/ipagp.ttf',
    '/usr/share/fonts/opentype/ipafont-gothic/ipag.ttf',
]

# App palette (css/style.css :root)
INK = (43, 36, 53)
PAPER = (255, 250, 242)
CREAM = (255, 244, 224)
CORAL = (244, 122, 90)
OCEAN = (90, 167, 209)
GOLD = (246, 185, 59)
MINT = (111, 209, 164)
CHERRY = (255, 135, 169)

TILES = [
    # (label, sublabel, accent, glyph)  — order is left-to-right, top-to-bottom
    ('ホーム',   'HOME',    CORAL,  'mascot'),
    ('クイズ',   'QUIZ',    OCEAN,  '？'),
    ('QR読み取り', 'SCAN',  MINT,   'qr'),
    ('ショップ', 'SHOP',    CHERRY, '★'),
    ('ライセンス', 'LICENSE', GOLD, '証'),
    ('ランキング', 'RANKING', CORAL, '1'),
]


def font(size):
    for p in FONT_CANDIDATES:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    raise SystemExit('No Japanese font found. Install fonts-ipafont-gothic.')


def tint(color, amount):
    """Mix `color` toward white by `amount` (0..1)."""
    return tuple(round(c + (255 - c) * amount) for c in color)


def rounded_tile(size, color, radius):
    tile = Image.new('RGBA', size, (0, 0, 0, 0))
    d = ImageDraw.Draw(tile)
    d.rounded_rectangle([0, 0, size[0] - 1, size[1] - 1], radius=radius, fill=color)
    return tile


def draw_qr_motif(draw, size, fill=(255, 255, 255)):
    """A QR-like mark. Drawn rather than typed — IPAGothic has no ▣ glyph
    and typing one renders as tofu."""
    u = size / 13.0                      # module size on a 13x13 grid
    o = (size - u * 9) / 2               # centre a 9x9 pattern in the disc

    def cell(cx, cy, w=1, h=1):
        draw.rectangle([o + cx * u, o + cy * u,
                        o + (cx + w) * u - 1, o + (cy + h) * u - 1], fill=fill)

    # three finder squares (ring + solid core)
    for fx, fy in ((0, 0), (6, 0), (0, 6)):
        draw.rectangle([o + fx * u, o + fy * u, o + (fx + 3) * u - 1, o + (fy + 3) * u - 1],
                       outline=fill, width=max(2, round(u * 0.32)))
        cell(fx + 1, fy + 1)
    # a few data modules so it reads as a code, not a frame
    for cx, cy in ((4, 1), (5, 3), (4, 4), (6, 5), (8, 4), (1, 4),
                   (3, 6), (5, 7), (7, 7), (4, 8), (8, 8), (6, 8)):
        cell(cx, cy)


def centered(draw, box, text, fnt, fill):
    x0, y0, x1, y1 = box
    l, t, r, b = draw.textbbox((0, 0), text, font=fnt)
    draw.text((x0 + (x1 - x0 - (r - l)) / 2 - l,
               y0 + (y1 - y0 - (b - t)) / 2 - t), text, font=fnt, fill=fill)


def main():
    img = Image.new('RGB', (W, H), PAPER)
    d = ImageDraw.Draw(img)

    # soft warm background wash so the menu does not read as flat white
    for y in range(H):
        k = y / H
        d.line([(0, y), (W, y)],
               fill=tuple(round(PAPER[i] + (CREAM[i] - PAPER[i]) * k) for i in range(3)))

    f_label = font(86)
    f_sub = font(38)
    f_glyph = font(150)

    mascot = None
    if os.path.exists(MASCOT):
        mascot = Image.open(MASCOT).convert('RGBA')

    pad = 22
    for i, (label, sub, accent, glyph) in enumerate(TILES):
        cx, cy = i % COLS, i // COLS
        x0, y0 = cx * TILE_W + pad, cy * TILE_H + pad
        x1, y1 = (cx + 1) * TILE_W - pad, (cy + 1) * TILE_H - pad

        tile = rounded_tile((x1 - x0, y1 - y0), tint(accent, 0.86), 46)
        td = ImageDraw.Draw(tile)
        td.rounded_rectangle([0, 0, x1 - x0 - 1, y1 - y0 - 1], radius=46,
                             outline=tint(accent, 0.45), width=5)
        img.paste(tile, (x0, y0), tile)

        art_h = 300
        if glyph == 'mascot' and mascot is not None:
            m = mascot.copy()
            scale = art_h / m.height
            m = m.resize((round(m.width * scale), art_h), Image.LANCZOS)
            img.paste(m, (x0 + ((x1 - x0) - m.width) // 2, y0 + 92), m)
        else:
            # accent disc with a single large glyph
            disc = Image.new('RGBA', (art_h, art_h), (0, 0, 0, 0))
            ImageDraw.Draw(disc).ellipse([0, 0, art_h - 1, art_h - 1], fill=accent)
            dd = ImageDraw.Draw(disc)
            if glyph == 'qr':
                draw_qr_motif(dd, art_h)
            else:
                centered(dd, (0, 0, art_h, art_h), glyph, f_glyph, (255, 255, 255))
            img.paste(disc, (x0 + ((x1 - x0) - art_h) // 2, y0 + 92), disc)

        centered(d, (x0, y0 + 430, x1, y0 + 540), label, f_label, INK)
        centered(d, (x0, y0 + 556, x1, y0 + 616), sub, f_sub, tint(INK, 0.45))

    img.save(OUT, optimize=True)
    size = os.path.getsize(OUT)
    print(f'{OUT}  {img.size}  {size/1024:.0f} KB')
    if size > 1024 * 1024:
        raise SystemExit('Image exceeds the 1MB limit LINE allows.')


if __name__ == '__main__':
    main()
