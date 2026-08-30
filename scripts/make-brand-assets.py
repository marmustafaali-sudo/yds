#!/usr/bin/env python3
# YDS365 Kelime Çalışması — marka görselleri üretir:
#   assets/icon.png              1024x1024  (@capacitor/assets kaynak — launcher ikonu)
#   assets/splash.png            2732x2732  (@capacitor/assets kaynak — splash)
#   play-store/listing/graphics/icon-512.png             512x512  (Play mağaza ikonu)
#   play-store/listing/graphics/feature-graphic-1024x500.png     (Play öne çıkan görsel)
#
# Zemin: ydbackground.jpg (İznik çini). Önünde krem "YDS" (Georgia Bold — Playfair muadili).
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "ydbackground.jpg")
FONT = "C:/Windows/Fonts/georgiab.ttf"
CREAM = (245, 230, 200)
NAVY = (15, 23, 42)

os.makedirs(os.path.join(ROOT, "assets"), exist_ok=True)
os.makedirs(os.path.join(ROOT, "play-store", "listing", "graphics"), exist_ok=True)


def cini_square(size, top_bias=0.45):
    """ydbackground.jpg -> ortadan kare kırpım, size x size."""
    im = Image.open(SRC).convert("RGB")
    w, h = im.size
    s = min(w, h)
    left = (w - s) // 2
    top = int((h - s) * top_bias)
    return im.crop((left, top, left + s, top + s)).resize((size, size), Image.LANCZOS)


def radial_scrim(size, inner=0.90, outer=0.34):
    """Ortada güçlü koyu, kenara doğru açılan radyal karartma (yazı okunsun diye)."""
    scrim = Image.new("L", (size, size), int(255 * outer))
    d = ImageDraw.Draw(scrim)
    cx = cy = size / 2
    maxr = size * 0.66
    for i in range(int(maxr), 0, -1):
        t = i / maxr
        a = int(255 * (outer + (inner - outer) * (1 - t) ** 1.7))
        d.ellipse([cx - i, cy - i, cx + i, cy + i], fill=a)
    scrim = scrim.filter(ImageFilter.GaussianBlur(size / 90))
    black = Image.new("RGB", (size, size), (9, 14, 24))
    return black, scrim


def shape_mask(size, shape="round", radius_ratio=0.22):
    m = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(m)
    if shape == "circle":
        d.ellipse([0, 0, size - 1, size - 1], fill=255)
    elif shape == "square":
        d.rectangle([0, 0, size - 1, size - 1], fill=255)
    else:
        d.rounded_rectangle([0, 0, size - 1, size - 1],
                            radius=int(size * radius_ratio), fill=255)
    return m


def draw_centered_text(img, text, font_px, fill, letter_spacing=0, dy=0, glow=True):
    font = ImageFont.truetype(FONT, font_px)
    dd = ImageDraw.Draw(img)
    widths = [dd.textbbox((0, 0), ch, font=font)[2] for ch in text]
    total = sum(widths) + letter_spacing * (len(text) - 1)
    bbox = dd.textbbox((0, 0), text, font=font)
    th = bbox[3] - bbox[1]
    x0 = (img.width - total) / 2
    y0 = (img.height - th) / 2 - bbox[1] + dy

    def run(draw, ox, oy, col):
        x = x0 + ox
        for ch, cw in zip(text, widths):
            draw.text((x, y0 + oy), ch, font=font, fill=col)
            x += cw + letter_spacing

    if glow:
        gl = Image.new("RGBA", img.size, (0, 0, 0, 0))
        gd = ImageDraw.Draw(gl)
        run(gd, 0, 0, (7, 12, 22, 230))
        gl = gl.filter(ImageFilter.GaussianBlur(font_px * 0.10))
        img.alpha_composite(gl)
        img.alpha_composite(gl)
    run(ImageDraw.Draw(img), 0, 0, fill)


def make_icon(size, shape="round", rim=True, text_scale=0.30):
    base = cini_square(size).convert("RGBA")
    base = base.filter(ImageFilter.GaussianBlur(size / 200))
    black, scrim = radial_scrim(size)
    base = Image.composite(black.convert("RGBA"), base, scrim)
    if rim:
        d = ImageDraw.Draw(base)
        inset = int(size * 0.085)
        rr = int(size * 0.16)
        d.rounded_rectangle([inset, inset, size - inset, size - inset],
                            radius=rr, outline=CREAM + (140,),
                            width=max(2, size // 340))
    draw_centered_text(base, "YDS", int(size * text_scale), CREAM + (255,),
                       letter_spacing=int(size * 0.015))
    if shape != "full":
        base.putalpha(shape_mask(size, shape))
    return base


def make_feature_graphic():
    W, H = 1024, 500
    img = Image.new("RGB", (W, H), NAVY)
    # radyal degrade zemin
    grad = Image.new("RGB", (W, H))
    gd = ImageDraw.Draw(grad)
    for y in range(H):
        for_t = y / H
        gd.line([(0, y), (W, y)], fill=(
            int(36 - 25 * for_t), int(50 - 34 * for_t), int(68 - 44 * for_t)))
    img.paste(grad, (0, 0))
    # sol tarafta çini ikon
    ic = make_icon(360, shape="round", rim=True)
    img.paste(ic, (70, (H - 360) // 2), ic)
    # sağ tarafta metin
    d = ImageDraw.Draw(img)
    title_font = ImageFont.truetype(FONT, 74)
    sub_font = ImageFont.truetype(FONT, 30)
    tx = 500
    d.text((tx, 175), "YDS365", font=title_font, fill=CREAM)
    d.text((tx, 258), "Kelime Çalışması", font=ImageFont.truetype(FONT, 46), fill=CREAM)
    d.text((tx, 325), "Çıkmış kelimeler · flashcard · test", font=sub_font,
           fill=(245, 230, 200, 180))
    return img


def make_splash(w, h):
    img = Image.new("RGB", (w, h), NAVY)
    s = int(min(w, h) * 0.42)
    mark = make_icon(s, shape="round", rim=True)
    img.paste(mark, ((w - s) // 2, (h - s) // 2), mark)
    return img


# --- kaynak görseller (@capacitor/assets için yedek) ---
make_icon(1024, shape="full", rim=True).convert("RGB").save(
    os.path.join(ROOT, "assets", "icon.png"))
make_splash(2732, 2732).save(os.path.join(ROOT, "assets", "splash.png"))

# --- Play mağaza grafikleri ---
GFX = os.path.join(ROOT, "play-store", "listing", "graphics")
make_icon(512, shape="full", rim=True).convert("RGB").save(
    os.path.join(GFX, "icon-512.png"))
make_feature_graphic().save(os.path.join(GFX, "feature-graphic-1024x500.png"))

# --- Android res: launcher ikonları + splash ---
RES = os.path.join(ROOT, "android", "app", "src", "main", "res")
LEGACY = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
FG = {"mdpi": 108, "hdpi": 162, "xhdpi": 216, "xxhdpi": 324, "xxxhdpi": 432}

if os.path.isdir(RES):
    # yüksek çözünürlükte bir kez üret, sonra küçült (kenar yumuşaklığı için)
    hi_round = make_icon(768, shape="round", rim=True)
    hi_circle = make_icon(768, shape="circle", rim=True)
    hi_fg = make_icon(768, shape="full", rim=True)          # adaptive foreground: tam kare
    for dens, px in LEGACY.items():
        d = os.path.join(RES, "mipmap-" + dens)
        hi_round.resize((px, px), Image.LANCZOS).save(os.path.join(d, "ic_launcher.png"))
        hi_circle.resize((px, px), Image.LANCZOS).save(os.path.join(d, "ic_launcher_round.png"))
    for dens, px in FG.items():
        d = os.path.join(RES, "mipmap-" + dens)
        hi_fg.resize((px, px), Image.LANCZOS).convert("RGBA").save(
            os.path.join(d, "ic_launcher_foreground.png"))

    # adaptive icon arka plan rengi: beyaz -> lacivert
    with open(os.path.join(RES, "values", "ic_launcher_background.xml"), "w",
              encoding="utf-8") as f:
        f.write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n'
                '    <color name="ic_launcher_background">#0F172A</color>\n</resources>\n')

    # splash (port / land / base) — mevcut boyutları koru
    splash_dims = {
        "drawable-port-mdpi": (320, 480), "drawable-port-hdpi": (480, 800),
        "drawable-port-xhdpi": (720, 1280), "drawable-port-xxhdpi": (960, 1600),
        "drawable-port-xxxhdpi": (1280, 1920),
        "drawable-land-mdpi": (480, 320), "drawable-land-hdpi": (800, 480),
        "drawable-land-xhdpi": (1280, 720), "drawable-land-xxhdpi": (1600, 960),
        "drawable-land-xxxhdpi": (1920, 1280),
        "drawable": (480, 320),
    }
    for d, (w, h) in splash_dims.items():
        make_splash(w, h).save(os.path.join(RES, d, "splash.png"))

    print("OK — Android res güncellendi (launcher + splash)")

print("OK — assets/*, play-store/listing/graphics/*")
