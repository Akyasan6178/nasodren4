"""NS4-44 ek · Kollu bacaklı virüs kareleri (yalnızca soldaki lenste kullanılır).

Boyanmış virüs görseline (256×256) küçük kollar, bacaklar ve ayakkabılar ekler; 6 karelik yatay şerit üretir:
  0–3 dans (kollar yukarı/yatay/aşağı, adım), 4 göz kırpma, 5 irkilme (sıkışma, gözler kapalı, kollar havada),
  6 ağlama (yere yatmış, gözyaşı ve gölcük), 7 dalga geçme (gözler gülerek kısılı, eller başın yanında).
Bacaklar gövdenin arkasında, kollar önünde çizilir. Renkler gövdenin kendi tonundan.
Yüz düzenlemesi yalnızca göz kapağıdır (göz akı bileşenleri üzerine).
"""

from __future__ import annotations

import math

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

FRAME = 192  # kare boyu (px)
BODY = 128  # gövde görselinin karedeki boyu (px); geri kalan uzuvlar için pay
SS = 4  # kenar yumuşatma için üst örnekleme
FRAMES = 8
TEAR = (120, 200, 255)
TEAR_DARK = (40, 110, 190)

# kare → (sol kol açısı, sağ kol açısı [derece, 0 = yatay, eksi = yukarı], sol bacak, sağ bacak adımı, gövde kayması)
POSES = [
    (-42, -42, -1, 1, 0),
    (6, 6, 0, 0, 3),
    (34, 34, 1, -1, 0),
    (6, 6, 0, 0, 3),
    (6, 6, 0, 0, 3),  # göz kırpma (kare 1 + kapak)
    (-70, -70, 0, 0, 6),  # irkilme
]


def body_colors(img: Image.Image) -> tuple[tuple[int, int, int], tuple[int, int, int], tuple[int, int, int]]:
    a = np.asarray(img).astype(float)
    vis = a[..., 3] > 200
    rgb = a[..., :3]
    mx, mn = rgb.max(-1), rgb.min(-1)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1), 0)
    body = vis & (sat > 0.35) & (mx > 90)
    med = np.median(rgb[body], axis=0)
    base = tuple(int(c) for c in med)
    dark = tuple(int(c * 0.42) for c in med)
    light = tuple(int(min(255, c + (255 - c) * 0.45)) for c in med)
    return base, dark, light  # type: ignore[return-value]


def eye_boxes(img: Image.Image) -> list[tuple[int, int, int, int]]:
    a = np.asarray(img).astype(float)
    vis = a[..., 3] > 200
    rgb = a[..., :3]
    mx, mn = rgb.max(-1), rgb.min(-1)
    white = vis & (mn > 200) & ((mx - mn) < 40)
    lab, n = ndimage.label(white)
    boxes = []
    total = vis.sum()
    for k in range(1, n + 1):
        m = lab == k
        if m.sum() > total * 0.012:
            ys, xs = np.nonzero(m)
            boxes.append((xs.min(), ys.min(), xs.max(), ys.max()))
    return boxes


def _limb(d: ImageDraw.ImageDraw, p0, p1, w: float, fill, outline) -> None:
    d.line([p0, p1], fill=outline, width=int(w + 6 * SS))
    d.line([p0, p1], fill=fill, width=int(w))
    for p in (p0, p1):
        r = (w + 6 * SS) / 2
        d.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=outline)
        r = w / 2
        d.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=fill)


def make_frame(body: Image.Image, k: int, base, dark, light, eyes) -> Image.Image:
    la, ra, ll, rl, bob = POSES[k]
    S = FRAME * SS
    canvas = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(canvas)
    bsz = BODY * SS
    bx = (S - bsz) // 2
    by = int(S * 0.03) + bob * SS
    cx, cy = S / 2, by + bsz * 0.5
    r = bsz * 0.3  # gövde yarıçapı (dikenler hariç)
    arm_w, leg_w = r * 0.2, r * 0.22
    arm_len, leg_len = r * 1.15, r * 1.0
    # bacaklar ve ayakkabılar (gövdenin arkasında)
    for side, step in ((-1, ll), (1, rl)):
        sx, sy = cx + side * r * 0.4, cy + r * 0.85
        ex, ey = sx + side * r * 0.12 + step * r * 0.22, sy + leg_len - abs(step) * r * 0.1
        _limb(d, (sx, sy), (ex, ey), leg_w, base, dark)
        fw, fh = r * 0.36, r * 0.2
        fx = ex + side * fw * 0.35
        d.ellipse([fx - fw - 3 * SS, ey - fh - 3 * SS, fx + fw + 3 * SS, ey + fh + 3 * SS], fill=dark)
        d.ellipse([fx - fw, ey - fh, fx + fw, ey + fh], fill=(48, 40, 58))
        d.ellipse([fx - fw * 0.5, ey - fh * 0.7, fx, ey - fh * 0.2], fill=(110, 100, 128))
    # gövde (irkilmede yatay genişler, dikey sıkışır)
    b = body.resize((bsz, bsz), Image.LANCZOS)
    if k == 5:
        b = b.resize((int(bsz * 1.08), int(bsz * 0.9)), Image.LANCZOS)
    ox, oy = cx - b.size[0] / 2, by + (bsz - b.size[1])
    canvas.alpha_composite(b, (int(ox), int(oy)))
    d = ImageDraw.Draw(canvas)
    # göz kapakları (kırpma ve irkilme): gövde renginde kapak + kapalı göz çizgisi
    if k in (4, 5):
        sx_ = b.size[0] / body.size[0]
        sy_ = b.size[1] / body.size[1]
        for x0, y0, x1, y1 in eyes:
            X0, Y0, X1, Y1 = ox + x0 * sx_, oy + y0 * sy_, ox + x1 * sx_, oy + y1 * sy_
            pad = 2 * SS
            d.ellipse([X0 - pad, Y0 - pad, X1 + pad, Y1 + pad], fill=dark)
            d.ellipse([X0, Y0, X1, Y1], fill=base)
            my = (Y0 + Y1) / 2
            d.arc([X0 + 2 * SS, my - (Y1 - Y0) * 0.3, X1 - 2 * SS, my + (Y1 - Y0) * 0.3], 15, 165, fill=dark, width=int(5 * SS))
    # kollar (gövdenin önünde, kenarından dışa) ve beyaz eldivenler
    for side, ang in ((-1, la), (1, ra)):
        sx, sy = cx + side * r * 0.95, cy + r * 0.15
        t = math.radians(ang)
        ex, ey = sx + side * math.cos(t) * arm_len, sy + math.sin(t) * arm_len
        _limb(d, (sx, sy), (ex, ey), arm_w, base, dark)
        hr = arm_w * 1.05
        d.ellipse([ex - hr - 3 * SS, ey - hr - 3 * SS, ex + hr + 3 * SS, ey + hr + 3 * SS], fill=dark)
        d.ellipse([ex - hr, ey - hr, ex + hr, ey + hr], fill=(250, 250, 250))
    return canvas.resize((FRAME, FRAME), Image.LANCZOS)


def _lids(img: Image.Image, eyes, scale: float, base, dark, style: str) -> Image.Image:
    """Gövde görselinin kopyasına göz kapağı: 'sad' (aşağı kıvrık, ağlama), 'laugh' (^^ gülme)."""
    out = img.copy()
    d = ImageDraw.Draw(out)
    for x0, y0, x1, y1 in eyes:
        X0, Y0, X1, Y1 = x0 * scale, y0 * scale, x1 * scale, y1 * scale
        pad = 2 * SS
        d.ellipse([X0 - pad, Y0 - pad, X1 + pad, Y1 + pad], fill=dark)
        d.ellipse([X0, Y0, X1, Y1], fill=base)
        my, hh = (Y0 + Y1) / 2, (Y1 - Y0)
        box = [X0 + 2 * SS, my - hh * 0.3, X1 - 2 * SS, my + hh * 0.3]
        if style == "laugh":
            d.arc(box, 195, 345, fill=dark, width=int(6 * SS))
        else:
            d.arc(box, 15, 165, fill=dark, width=int(6 * SS))
    return out


def _feet(d, ex, ey, r, side, dark) -> None:
    fw, fh = r * 0.36, r * 0.2
    fx = ex + side * fw * 0.35
    d.ellipse([fx - fw - 3 * SS, ey - fh - 3 * SS, fx + fw + 3 * SS, ey + fh + 3 * SS], fill=dark)
    d.ellipse([fx - fw, ey - fh, fx + fw, ey + fh], fill=(48, 40, 58))


def _glove(d, ex, ey, hr, dark) -> None:
    d.ellipse([ex - hr - 3 * SS, ey - hr - 3 * SS, ex + hr + 3 * SS, ey + hr + 3 * SS], fill=dark)
    d.ellipse([ex - hr, ey - hr, ex + hr, ey + hr], fill=(250, 250, 250))


def make_cry(body: Image.Image, base, dark, eyes) -> Image.Image:
    """Kare 6: yere yığılmış ağlıyor: hafif yan yatık ve basık gövde, kapalı üzgün gözler, iki yanaktan akan
    gözyaşları, yerde gölcük; bacaklar öne açılmış, kollar yere sarkmış."""
    S = FRAME * SS
    canvas = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(canvas)
    bsz = BODY * SS
    r = bsz * 0.3
    ground = S * 0.9
    sc = bsz / body.size[0]
    b = _lids(body.resize((bsz, bsz), Image.LANCZOS), eyes, sc, base, dark, "sad")
    db = ImageDraw.Draw(b)
    for x0, y0, x1, y1 in eyes:  # gözyaşı akıntısı (gövde üzerinde, gözün altından aşağı)
        ex_, ey_ = (x0 + x1) / 2 * sc, y1 * sc
        for j in range(4):
            ty = ey_ + r * (0.12 + j * 0.24)
            w = r * (0.13 - j * 0.015)
            db.ellipse([ex_ - w - 2 * SS, ty - w * 1.35 - 2 * SS, ex_ + w + 2 * SS, ty + w * 1.35 + 2 * SS], fill=TEAR_DARK)
            db.ellipse([ex_ - w, ty - w * 1.35, ex_ + w, ty + w * 1.35], fill=TEAR)
    b = b.resize((int(bsz * 1.06), int(bsz * 0.86)), Image.LANCZOS).rotate(14, resample=Image.BICUBIC, expand=True)
    cx, cy = S / 2, ground - r * 1.35
    # gölcük ve öne açılmış bacaklar (gövdenin arkasında)
    d.ellipse([cx - r * 2.1, ground - r * 0.22, cx + r * 2.1, ground + r * 0.2], fill=TEAR + (170,))
    for side in (-1, 1):
        sx, sy = cx + side * r * 0.35, cy + r * 0.6
        ex, ey = cx + side * r * 1.45, ground - r * 0.18
        _limb(d, (sx, sy), (ex, ey), r * 0.22, base, dark)
        _feet(d, ex, ey, r, side, dark)
    canvas.alpha_composite(b, (int(cx - b.size[0] / 2), int(cy - b.size[1] / 2)))
    d = ImageDraw.Draw(canvas)
    for side in (-1, 1):  # kollar yere sarkmış
        sx, sy = cx + side * r * 0.95, cy + r * 0.2
        ex, ey = cx + side * r * 1.25, ground - r * 0.35
        _limb(d, (sx, sy), (ex, ey), r * 0.2, base, dark)
        _glove(d, ex, ey, r * 0.21, dark)
    return canvas.resize((FRAME, FRAME), Image.LANCZOS)


def make_taunt(body: Image.Image, base, dark, eyes) -> Image.Image:
    """Kare 7: dalga geçme: gözler gülerek kısılı, gövde geriye yatık, eller başın iki yanında; bir ayak havada."""
    S = FRAME * SS
    canvas = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(canvas)
    bsz = BODY * SS
    r = bsz * 0.3
    by = int(S * 0.05)
    cx, cy = S / 2, by + bsz * 0.5
    for side, step in ((-1, 0), (1, 1)):
        sx, sy = cx + side * r * 0.4, cy + r * 0.85
        ex, ey = sx + side * r * 0.12 + step * r * 0.3, sy + r * 1.0 - step * r * 0.35
        _limb(d, (sx, sy), (ex, ey), r * 0.22, base, dark)
        _feet(d, ex, ey, r, side, dark)
    b = _lids(body.resize((bsz, bsz), Image.LANCZOS), eyes, bsz / body.size[0], base, dark, "laugh")
    b = b.rotate(-10, resample=Image.BICUBIC, expand=False)
    canvas.alpha_composite(b, (int(cx - bsz / 2), int(by)))
    d = ImageDraw.Draw(canvas)
    for side in (-1, 1):
        sx, sy = cx + side * r * 0.95, cy + r * 0.15
        ex, ey = cx + side * r * 1.32, cy - r * 0.75
        _limb(d, (sx, sy), (ex, ey), r * 0.2, base, dark)
        hr = r * 0.21
        _glove(d, ex, ey, hr, dark)
        for j in (-1, 0, 1):  # oynayan parmak çizgileri
            fx, fy = ex + side * hr * 1.9, ey + j * hr * 0.9
            d.line([(ex + side * hr * 1.1, ey + j * hr * 0.5), (fx, fy)], fill=dark, width=int(4 * SS))
    return canvas.resize((FRAME, FRAME), Image.LANCZOS)


def make_sheet(body: Image.Image) -> Image.Image:
    base, dark, light = body_colors(body)
    eyes = eye_boxes(body)
    sheet = Image.new("RGBA", (FRAME * FRAMES, FRAME), (0, 0, 0, 0))
    for k in range(6):
        sheet.alpha_composite(make_frame(body, k, base, dark, light, eyes), (k * FRAME, 0))
    sheet.alpha_composite(make_cry(body, base, dark, eyes), (6 * FRAME, 0))
    sheet.alpha_composite(make_taunt(body, base, dark, eyes), (7 * FRAME, 0))
    return sheet
