#!/usr/bin/env python3
"""Generate Gistmas Advent A5 flyer for CDL conference."""

from __future__ import annotations

import io
from pathlib import Path

import qrcode
from PIL import Image as PILImage
from reportlab.lib.colors import Color, HexColor, white, black
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = Path(__file__).resolve().parent
PDF_PATH = OUT_DIR / "gistmas-cdl-flyer-a5.pdf"
PNG_PATH = OUT_DIR / "gistmas-cdl-flyer-a5.png"
QR_PATH = OUT_DIR / "gistmas-cdl-qr.png"
SITE_URL = "https://graphcentric.github.io/gist-tutor/"

# A5 portrait
PAGE_W = 148 * mm
PAGE_H = 210 * mm

# Palette — forest green, crimson, gold
FOREST = HexColor("#0F3D2E")
FOREST_DEEP = HexColor("#082820")
FOREST_MID = HexColor("#1A5C45")
CRIMSON = HexColor("#A11C2B")
CRIMSON_DEEP = HexColor("#7A1420")
GOLD = HexColor("#C9A227")
GOLD_LIGHT = HexColor("#E8D48A")
CREAM = HexColor("#F7F1E3")
CREAM_DARK = HexColor("#EDE4D0")
INK = HexColor("#1A221C")
MUTED = HexColor("#3D4A42")

FONT_DIR = Path("/usr/share/fonts/truetype/sand-box/custom")
pdfmetrics.registerFont(TTFont("Serif", str(FONT_DIR / "Source Serif Pro/SourceSerifPro-Regular.ttf")))
pdfmetrics.registerFont(TTFont("SerifBold", str(FONT_DIR / "Source Serif Pro/SourceSerifPro-Bold.ttf")))
pdfmetrics.registerFont(TTFont("SerifSemi", str(FONT_DIR / "Source Serif Pro/SourceSerifPro-Semibold.ttf")))
pdfmetrics.registerFont(TTFont("SerifBlack", str(FONT_DIR / "Source Serif Pro/SourceSerifPro-Black.ttf")))
pdfmetrics.registerFont(TTFont("Sans", str(FONT_DIR / "Source Sans Pro/SourceSansPro-Regular.ttf")))
pdfmetrics.registerFont(TTFont("SansBold", str(FONT_DIR / "Source Sans Pro/SourceSansPro-Bold.ttf")))
pdfmetrics.registerFont(TTFont("SansSemi", str(FONT_DIR / "Source Sans Pro/SourceSansPro-Semibold.ttf")))
pdfmetrics.registerFont(TTFont("SansLight", str(FONT_DIR / "Source Sans Pro/SourceSansPro-Light.ttf")))
pdfmetrics.registerFont(TTFont("SansIt", str(FONT_DIR / "Source Sans Pro/SourceSansPro-It.ttf")))


def make_qr(path: Path) -> Path:
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=12,
        border=2,
    )
    qr.add_data(SITE_URL)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#0A0A0A", back_color="#FFFFFF").convert("RGB")
    # Ensure high contrast solid black/white
    img = img.point(lambda p: 0 if p < 128 else 255)
    img.save(path, "PNG")
    return path


def round_rect(c: canvas.Canvas, x, y, w, h, r, fill=None, stroke=None, sw=0.5):
    c.saveState()
    if fill:
        c.setFillColor(fill)
    if stroke:
        c.setStrokeColor(stroke)
        c.setLineWidth(sw)
    p = c.beginPath()
    p.moveTo(x + r, y)
    p.lineTo(x + w - r, y)
    p.arcTo(x + w - 2 * r, y, x + w, y + 2 * r, -90, 90)
    p.lineTo(x + w, y + h - r)
    p.arcTo(x + w - 2 * r, y + h - 2 * r, x + w, y + h, 0, 90)
    p.lineTo(x + r, y + h)
    p.arcTo(x, y + h - 2 * r, x + 2 * r, y + h, 90, 90)
    p.lineTo(x, y + r)
    p.arcTo(x, y, x + 2 * r, y + 2 * r, 180, 90)
    p.close()
    c.drawPath(p, fill=1 if fill else 0, stroke=1 if stroke else 0)
    c.restoreState()


def draw_holly(c: canvas.Canvas, cx, cy, scale=1.0):
    """Simple holly/berry accent."""
    c.saveState()
    c.translate(cx, cy)
    c.scale(scale, scale)
    # leaves
    c.setFillColor(FOREST_MID)
    for angle, ox in ((25, -3), (-25, 3), (0, 0)):
        c.saveState()
        c.rotate(angle)
        c.translate(ox, 0)
        p = c.beginPath()
        p.moveTo(0, 0)
        p.curveTo(4, 6, 6, 12, 0, 18)
        p.curveTo(-6, 12, -4, 6, 0, 0)
        c.drawPath(p, fill=1, stroke=0)
        c.restoreState()
    # berries
    c.setFillColor(CRIMSON)
    for bx, by in ((-2.5, -1), (2.5, -1), (0, 2)):
        c.circle(bx, by, 2.2, fill=1, stroke=0)
    c.restoreState()


def draw_star(c: canvas.Canvas, cx, cy, r, color=GOLD):
    import math
    c.saveState()
    c.setFillColor(color)
    pts = []
    for i in range(10):
        ang = math.pi / 2 + i * math.pi / 5
        rad = r if i % 2 == 0 else r * 0.42
        pts.append((cx + rad * math.cos(ang), cy + rad * math.sin(ang)))
    p = c.beginPath()
    p.moveTo(pts[0][0], pts[0][1])
    for x, y in pts[1:]:
        p.lineTo(x, y)
    p.close()
    c.drawPath(p, fill=1, stroke=0)
    c.restoreState()


def draw_door_row(c: canvas.Canvas, x, y, w, h, n=6):
    """Tiny decorative advent doors."""
    gap = 2.2 * mm
    dw = (w - gap * (n - 1)) / n
    for i in range(n):
        dx = x + i * (dw + gap)
        fill = CRIMSON if i % 2 == 0 else FOREST
        round_rect(c, dx, y, dw, h, 1.2 * mm, fill=fill)
        c.setFillColor(GOLD_LIGHT)
        c.setFont("SansBold", 6)
        num = str(i + 1)
        c.drawCentredString(dx + dw / 2, y + h / 2 - 2, num)
        # tiny gold hinge/dot
        c.setFillColor(GOLD)
        c.circle(dx + dw - 1.8 * mm, y + h / 2, 0.7 * mm, fill=1, stroke=0)


def wrap_text(c, text, font, size, max_w):
    words = text.split()
    lines, cur = [], ""
    for w in words:
        trial = (cur + " " + w).strip()
        if c.stringWidth(trial, font, size) <= max_w:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def build():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    make_qr(QR_PATH)

    c = canvas.Canvas(str(PDF_PATH), pagesize=(PAGE_W, PAGE_H))
    c.setTitle("Gistmas Advent — Gist Tutor | CDL Conference")
    c.setAuthor("GraphCentric")
    c.setSubject("Printable A5 flyer for Gistmas Advent gist tutor")

    # Background cream
    c.setFillColor(CREAM)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)

    # Outer forest frame
    margin = 6 * mm
    c.setStrokeColor(FOREST)
    c.setLineWidth(2.2)
    c.rect(margin, margin, PAGE_W - 2 * margin, PAGE_H - 2 * margin, fill=0, stroke=1)
    c.setStrokeColor(GOLD)
    c.setLineWidth(0.7)
    c.rect(margin + 1.8 * mm, margin + 1.8 * mm, PAGE_W - 2 * margin - 3.6 * mm, PAGE_H - 2 * margin - 3.6 * mm, fill=0, stroke=1)

    inner_l = margin + 5 * mm
    inner_r = PAGE_W - margin - 5 * mm
    content_w = inner_r - inner_l

    # Top banner
    banner_y = PAGE_H - margin - 18 * mm
    banner_h = 12 * mm
    round_rect(c, inner_l, banner_y, content_w, banner_h, 2 * mm, fill=FOREST)
    # gold thin top strip on banner
    c.setFillColor(GOLD)
    c.rect(inner_l, banner_y + banner_h - 1.4 * mm, content_w, 1.4 * mm, fill=1, stroke=0)

    c.setFillColor(GOLD_LIGHT)
    c.setFont("SansSemi", 8)
    c.drawCentredString(PAGE_W / 2, banner_y + 7.2 * mm, "CDL CONFERENCE")
    c.setFillColor(white)
    c.setFont("SansBold", 9.5)
    c.drawCentredString(PAGE_W / 2, banner_y + 2.6 * mm, "GraphCentric  ·  Open Learning")

    # Holly accents flanking banner
    draw_holly(c, inner_l + 4 * mm, banner_y + banner_h / 2 + 0.5 * mm, scale=0.85)
    draw_holly(c, inner_r - 4 * mm, banner_y + banner_h / 2 + 0.5 * mm, scale=0.85)

    # Title
    title_y = banner_y - 14 * mm
    c.setFillColor(FOREST_DEEP)
    c.setFont("SerifBlack", 28)
    c.drawCentredString(PAGE_W / 2, title_y, "Gistmas Advent")

    # Gold underline with stars
    line_y = title_y - 3.5 * mm
    c.setStrokeColor(GOLD)
    c.setLineWidth(1.4)
    c.line(inner_l + 12 * mm, line_y, inner_r - 12 * mm, line_y)
    draw_star(c, PAGE_W / 2, line_y, 2.8 * mm)
    draw_star(c, PAGE_W / 2 - 28 * mm, line_y, 1.6 * mm, GOLD_LIGHT)
    draw_star(c, PAGE_W / 2 + 28 * mm, line_y, 1.6 * mm, GOLD_LIGHT)

    # Subtitle
    sub_y = line_y - 8 * mm
    c.setFillColor(CRIMSON)
    c.setFont("SerifSemi", 11)
    subtitle = "Learn Semantic Arts gist in 24 doors"
    c.drawCentredString(PAGE_W / 2, sub_y, subtitle)
    c.setFillColor(MUTED)
    c.setFont("SansIt", 9.5)
    c.drawCentredString(PAGE_W / 2, sub_y - 5 * mm, "Advent calendar  +  virtual chocolates")

    # Decorative door row
    doors_y = sub_y - 14 * mm
    draw_door_row(c, inner_l + 8 * mm, doors_y, content_w - 16 * mm, 7 * mm, n=8)

    # Feature card
    card_y = doors_y - 38 * mm
    card_h = 34 * mm
    round_rect(c, inner_l, card_y, content_w, card_h, 2.5 * mm, fill=CREAM_DARK, stroke=FOREST_MID, sw=0.6)

    # Left: optional Santa vibe portrait (circular crop feel via mask)
    santa_path = ROOT / "assets" / "dave-santa.jpg"
    portrait_size = 26 * mm
    px = inner_l + 5 * mm
    py = card_y + (card_h - portrait_size) / 2

    if santa_path.exists():
        # Crop center square of santa image
        simg = PILImage.open(santa_path).convert("RGB")
        w, h = simg.size
        side = min(w, h)
        left = (w - side) // 2
        top = max(0, (h - side) // 2 - side // 8)  # bias up for face
        simg = simg.crop((left, top, left + side, top + side)).resize((320, 320), PILImage.Resampling.LANCZOS)
        # Circular mask
        mask = PILImage.new("L", (320, 320), 0)
        from PIL import ImageDraw
        ImageDraw.Draw(mask).ellipse((0, 0, 319, 319), fill=255)
        out = PILImage.new("RGBA", (320, 320), (0, 0, 0, 0))
        out.paste(simg, (0, 0))
        out.putalpha(mask)
        # Gold ring behind
        c.setFillColor(GOLD)
        c.circle(px + portrait_size / 2, py + portrait_size / 2, portrait_size / 2 + 1.2 * mm, fill=1, stroke=0)
        c.setFillColor(FOREST)
        c.circle(px + portrait_size / 2, py + portrait_size / 2, portrait_size / 2 + 0.4 * mm, fill=1, stroke=0)
        buf = io.BytesIO()
        out.save(buf, format="PNG")
        buf.seek(0)
        c.drawImage(ImageReader(buf), px, py, portrait_size, portrait_size, mask="auto")

    # Feature bullets
    bx = px + portrait_size + 5 * mm
    by = card_y + card_h - 7 * mm
    bullets = [
        ("Open & free", "No login. Progress stays in your browser."),
        ("24 doors of gist", "Real Semantic Arts terms, day by day."),
        ("Festive & serious", "Dave McComb as Santa — lightly."),
    ]
    for title, body in bullets:
        c.setFillColor(CRIMSON)
        c.circle(bx, by + 1.2 * mm, 1.3 * mm, fill=1, stroke=0)
        c.setFillColor(FOREST_DEEP)
        c.setFont("SansBold", 9)
        c.drawString(bx + 4 * mm, by, title)
        c.setFillColor(MUTED)
        c.setFont("Sans", 8)
        c.drawString(bx + 4 * mm, by - 3.6 * mm, body)
        by -= 9.5 * mm

    # QR section
    qr_section_top = card_y - 4 * mm
    qr_size = 42 * mm
    qr_x = (PAGE_W - qr_size) / 2
    qr_y = qr_section_top - qr_size - 8 * mm

    # Label above QR
    c.setFillColor(FOREST)
    c.setFont("SansBold", 9)
    c.drawCentredString(PAGE_W / 2, qr_section_top - 3 * mm, "SCAN TO OPEN THE CALENDAR")

    # White pad + gold frame for QR (high contrast)
    pad = 3 * mm
    round_rect(
        c,
        qr_x - pad,
        qr_y - pad,
        qr_size + 2 * pad,
        qr_size + 2 * pad,
        2 * mm,
        fill=white,
        stroke=GOLD,
        sw=1.5,
    )
    c.drawImage(str(QR_PATH), qr_x, qr_y, qr_size, qr_size, mask="auto")

    # URL under QR
    c.setFillColor(MUTED)
    c.setFont("Sans", 7)
    c.drawCentredString(PAGE_W / 2, qr_y - pad - 4.5 * mm, SITE_URL)

    # CTA ribbon
    cta_y = qr_y - pad - 14 * mm
    cta_h = 7.5 * mm
    cta_w = content_w - 10 * mm
    cta_x = (PAGE_W - cta_w) / 2
    round_rect(c, cta_x, cta_y, cta_w, cta_h, 1.8 * mm, fill=CRIMSON)
    c.setFillColor(GOLD_LIGHT)
    c.setFont("SansBold", 10)
    c.drawCentredString(PAGE_W / 2, cta_y + 2.4 * mm, "Start at door 1  ·  Collect the chocolates")

    # Footer
    foot_y = margin + 8 * mm
    c.setStrokeColor(GOLD)
    c.setLineWidth(0.6)
    c.line(inner_l + 4 * mm, foot_y + 6.5 * mm, inner_r - 4 * mm, foot_y + 6.5 * mm)

    c.setFillColor(FOREST)
    c.setFont("SansSemi", 7.5)
    c.drawCentredString(PAGE_W / 2, foot_y + 3.2 * mm, "A GraphCentric promo for CDL")

    c.setFillColor(MUTED)
    c.setFont("Sans", 6.5)
    attr = "gist ontology © Semantic Arts — CC BY 4.0  ·  semanticarts.com/gist"
    c.drawCentredString(PAGE_W / 2, foot_y, attr)

    # Corner stars
    for cx, cy in (
        (margin + 3.5 * mm, PAGE_H - margin - 3.5 * mm),
        (PAGE_W - margin - 3.5 * mm, PAGE_H - margin - 3.5 * mm),
        (margin + 3.5 * mm, margin + 3.5 * mm),
        (PAGE_W - margin - 3.5 * mm, margin + 3.5 * mm),
    ):
        draw_star(c, cx, cy, 1.8 * mm)

    c.showPage()
    c.save()
    print(f"Wrote {PDF_PATH}")

    # PNG preview via poppler
    import subprocess
    tmp = OUT_DIR / "gistmas-cdl-flyer-a5-tmp"
    subprocess.run(
        ["pdftoppm", "-png", "-r", "200", str(PDF_PATH), str(tmp)],
        check=True,
    )
    generated = OUT_DIR / "gistmas-cdl-flyer-a5-tmp-1.png"
    generated.replace(PNG_PATH)
    print(f"Wrote {PNG_PATH}")
    return PDF_PATH


if __name__ == "__main__":
    build()
