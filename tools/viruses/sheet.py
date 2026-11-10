"""NS4-44 ek · Kollu bacaklı virüs kareleri (yalnızca soldaki lenste kullanılır).

Boyanmış virüs görseline (256×256) gövdeyle uyumlu kollar ve bacaklar ekler; 8 karelik yatay şerit üretir:
  0–3 dans (kollar yukarı/yatay/aşağı, adım), 4 göz kırpma, 5 irkilme (sıkışma, gözler kapalı, kollar havada),
  6 ağlama (yere yığılmış, gözyaşı ve gölcük), 7 dalga geçme (gözler kısılı, dil dışarıda, eller başın yanında).
Uzuvlar gövdenin dilinden: gövde renginde, kıvrımlı ve uca doğru incelen parlak tüpler; eller dikenlerin topuzu gibi
yuvarlak avuç + üç topuz parmak, ayaklar gövde renginde yuvarlak taban. Bacaklar gövdenin arkasında, kollar önünde.
Yüz düzenlemesi: göz kapakları ve dalga karesinde dil (ağız bölgesinden).
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
TONGUE = (238, 96, 128)
TONGUE_DARK = (150, 30, 70)
TONGUE_LINE = (190, 55, 95)

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


def mouth_box(img: Image.Image) -> tuple[int, int, int, int] | None:
    """Ağız: alt yarıdaki koyu bordo ağız içi (+ dil) bileşeninin sınırları (kaynak görsel koordinatı)."""
    a = np.asarray(img).astype(float) / 255.0
    vis = a[..., 3] > 0.8
    rgb = a[..., :3]
    mx, mn = rgb.max(-1), rgb.min(-1)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    reddish = (rgb[..., 0] >= rgb[..., 1]) & (rgb[..., 0] >= rgb[..., 2] * 0.9)
    H = a.shape[0]
    ys = np.arange(H)[:, None] * np.ones((1, a.shape[1]))
    m = vis & (mx < 0.5) & (sat > 0.35) & reddish & (ys > H * 0.5)
    lab, n = ndimage.label(m)
    if n == 0:
        return None
    sizes = ndimage.sum(m, lab, range(1, n + 1))
    k = int(np.argmax(sizes)) + 1
    yy, xx = np.nonzero(lab == k)
    return int(xx.min()), int(yy.min()), int(xx.max()), int(yy.max())


# ---- gövdeyle uyumlu uzuvlar -------------------------------------------------------------------------------------


def _curve(p0, p1, bend: float, n: int = 28) -> list[tuple[float, float]]:
    """p0 → p1 ikinci derece eğri; bend: dik yönde sapma (uzunluğa oran, işaretli)."""
    (x0, y0), (x1, y1) = p0, p1
    dx, dy = x1 - x0, y1 - y0
    ln = math.hypot(dx, dy) or 1.0
    cx = (x0 + x1) / 2 - dy / ln * bend * ln
    cy = (y0 + y1) / 2 + dx / ln * bend * ln
    pts = []
    for i in range(n):
        t = i / (n - 1)
        pts.append(
            (
                (1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t * t * x1,
                (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t * t * y1,
            )
        )
    return pts


def _tube(d: ImageDraw.ImageDraw, pts, w0: float, w1: float, base, dark, light) -> None:
    """Uca doğru incelen, koyu konturlu, üstü parlak gövde renginde tüp (daire damgalarıyla pürüzsüz)."""
    n = len(pts)
    ws = [w0 + (w1 - w0) * i / (n - 1) for i in range(n)]
    for (x, y), w in zip(pts, ws):
        r = w / 2 + 3 * SS
        d.ellipse([x - r, y - r, x + r, y + r], fill=dark)
    for (x, y), w in zip(pts, ws):
        r = w / 2
        d.ellipse([x - r, y - r, x + r, y + r], fill=base)
    for i in range(int(n * 0.15), int(n * 0.8)):
        (x, y), w = pts[i], ws[i]
        r = w * 0.14
        ox, oy = -w * 0.17, -w * 0.2
        d.ellipse([x + ox - r, y + oy - r, x + ox + r, y + oy + r], fill=light)


def _hand(d: ImageDraw.ImageDraw, ex: float, ey: float, ang: float, r: float, base, dark, light) -> None:
    """Dikenlerin topuzu gibi yuvarlak avuç ve yöne doğru üç topuz parmak (gövde renginde)."""
    pr, fr = r * 0.2, r * 0.095
    fingers = []
    for da in (-0.62, 0.0, 0.62):
        a = ang + da
        fingers.append((ex + math.cos(a) * pr * 1.05, ey + math.sin(a) * pr * 1.05))
    o = 3 * SS
    for fx, fy in fingers:
        d.ellipse([fx - fr - o, fy - fr - o, fx + fr + o, fy + fr + o], fill=dark)
    d.ellipse([ex - pr - o, ey - pr - o, ex + pr + o, ey + pr + o], fill=dark)
    for fx, fy in fingers:
        d.ellipse([fx - fr, fy - fr, fx + fr, fy + fr], fill=base)
    d.ellipse([ex - pr, ey - pr, ex + pr, ey + pr], fill=base)
    hr = pr * 0.35
    d.ellipse([ex - pr * 0.45 - hr, ey - pr * 0.45 - hr, ex - pr * 0.45 + hr, ey - pr * 0.45 + hr], fill=light)


def _arm(d, sx, sy, ex, ey, side: int, r: float, base, dark, light, bend: float = 0.2) -> None:
    _tube(d, _curve((sx, sy), (ex, ey), bend * side), r * 0.27, r * 0.2, base, dark, light)
    _hand(d, ex, ey, math.atan2(ey - sy, ex - sx), r, base, dark, light)


def _foot(d, ex: float, ey: float, side: int, r: float, base, dark, light) -> None:
    """Gövde renginde yuvarlak taban (ayakkabı değil), önde iki parmak topuzu."""
    fw, fh = r * 0.38, r * 0.21
    fx = ex + side * fw * 0.3
    o = 3 * SS
    d.ellipse([fx - fw - o, ey - fh - o, fx + fw + o, ey + fh + o], fill=dark)
    toes = [fx + side * fw * k for k in (0.55, 0.95)]
    tr = fh * 0.62
    for tx in toes:
        d.ellipse([tx - tr - o, ey - tr * 0.6 - o, tx + tr + o, ey + tr * 1.1 + o], fill=dark)
    d.ellipse([fx - fw, ey - fh, fx + fw, ey + fh], fill=base)
    for tx in toes:
        d.ellipse([tx - tr, ey - tr * 0.6, tx + tr, ey + tr * 1.1], fill=base)
    d.ellipse([fx - fw * 0.55, ey - fh * 0.75, fx - fw * 0.05, ey - fh * 0.2], fill=light)


def _leg(d, sx, sy, ex, ey, side: int, r: float, base, dark, light, bend: float = 0.12) -> None:
    _tube(d, _curve((sx, sy), (ex, ey), -bend * side), r * 0.3, r * 0.25, base, dark, light)
    _foot(d, ex, ey, side, r, base, dark, light)


# ---- yüz ---------------------------------------------------------------------------------------------------------


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


def _tongue(img: Image.Image, mouth, scale: float) -> Image.Image:
    """Dalga karesi: ağzın ortasından aşağı sarkan, ağız genişliğine oranlı yuvarlak dil (kontur, orta çizgi, parlama)."""
    out = img.copy()
    if not mouth:
        return out
    d = ImageDraw.Draw(out)
    x0, y0, x1, y1 = (v * scale for v in mouth)
    mw = x1 - x0
    cx = (x0 + x1) / 2
    w = mw * 0.42
    top = y0 + (y1 - y0) * 0.4
    bot = y1 + mw * 0.38
    o = 3 * SS
    d.rounded_rectangle([cx - w / 2 - o, top - o, cx + w / 2 + o, bot + o], radius=w / 2 + o, fill=TONGUE_DARK)
    d.rounded_rectangle([cx - w / 2, top, cx + w / 2, bot], radius=w / 2, fill=TONGUE)
    d.line([(cx, top + w * 0.3), (cx, bot - w * 0.5)], fill=TONGUE_LINE, width=int(4 * SS))
    d.ellipse([cx - w * 0.36, bot - w * 0.72, cx - w * 0.08, bot - w * 0.42], fill=(255, 190, 205))
    return out


# ---- kareler -----------------------------------------------------------------------------------------------------


def make_frame(body: Image.Image, k: int, base, dark, light, eyes) -> Image.Image:
    la, ra, ll, rl, bob = POSES[k]
    S = FRAME * SS
    canvas = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(canvas)
    bsz = BODY * SS
    by = int(S * 0.03) + bob * SS
    cx, cy = S / 2, by + bsz * 0.5
    r = bsz * 0.3  # gövde yarıçapı (dikenler hariç)
    arm_len, leg_len = r * 1.15, r * 1.0
    for side, step in ((-1, ll), (1, rl)):  # bacaklar (gövdenin arkasında)
        sx, sy = cx + side * r * 0.4, cy + r * 0.85
        ex, ey = sx + side * r * 0.12 + step * r * 0.22, sy + leg_len - abs(step) * r * 0.1
        _leg(d, sx, sy, ex, ey, side, r, base, dark, light)
    b = body.resize((bsz, bsz), Image.LANCZOS)  # gövde (irkilmede yatay genişler, dikey sıkışır)
    if k == 5:
        b = b.resize((int(bsz * 1.08), int(bsz * 0.9)), Image.LANCZOS)
    ox, oy = cx - b.size[0] / 2, by + (bsz - b.size[1])
    canvas.alpha_composite(b, (int(ox), int(oy)))
    d = ImageDraw.Draw(canvas)
    if k in (4, 5):  # göz kapakları (kırpma ve irkilme)
        sx_ = b.size[0] / body.size[0]
        sy_ = b.size[1] / body.size[1]
        for x0, y0, x1, y1 in eyes:
            X0, Y0, X1, Y1 = ox + x0 * sx_, oy + y0 * sy_, ox + x1 * sx_, oy + y1 * sy_
            pad = 2 * SS
            d.ellipse([X0 - pad, Y0 - pad, X1 + pad, Y1 + pad], fill=dark)
            d.ellipse([X0, Y0, X1, Y1], fill=base)
            my = (Y0 + Y1) / 2
            d.arc(
                [X0 + 2 * SS, my - (Y1 - Y0) * 0.3, X1 - 2 * SS, my + (Y1 - Y0) * 0.3],
                15,
                165,
                fill=dark,
                width=int(5 * SS),
            )
    for side, ang in ((-1, la), (1, ra)):  # kollar (gövdenin önünde, kenarından dışa)
        sx, sy = cx + side * r * 0.95, cy + r * 0.15
        t = math.radians(ang)
        ex, ey = sx + side * math.cos(t) * arm_len, sy + math.sin(t) * arm_len
        _arm(d, sx, sy, ex, ey, side, r, base, dark, light, bend=0.2 if ang > -20 else -0.15)
    return canvas.resize((FRAME, FRAME), Image.LANCZOS)


def make_cry(body: Image.Image, base, dark, light, eyes) -> Image.Image:
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
            db.ellipse(
                [ex_ - w - 2 * SS, ty - w * 1.35 - 2 * SS, ex_ + w + 2 * SS, ty + w * 1.35 + 2 * SS], fill=TEAR_DARK
            )
            db.ellipse([ex_ - w, ty - w * 1.35, ex_ + w, ty + w * 1.35], fill=TEAR)
    b = b.resize((int(bsz * 1.06), int(bsz * 0.86)), Image.LANCZOS).rotate(14, resample=Image.BICUBIC, expand=True)
    cx, cy = S / 2, ground - r * 1.35
    d.ellipse([cx - r * 2.1, ground - r * 0.22, cx + r * 2.1, ground + r * 0.2], fill=TEAR + (170,))
    for side in (-1, 1):  # öne açılmış bacaklar (gövdenin arkasında)
        _leg(d, cx + side * r * 0.35, cy + r * 0.6, cx + side * r * 1.45, ground - r * 0.18, side, r, base, dark, light, 0.25)
    canvas.alpha_composite(b, (int(cx - b.size[0] / 2), int(cy - b.size[1] / 2)))
    d = ImageDraw.Draw(canvas)
    for side in (-1, 1):  # yere sarkmış kollar
        _arm(d, cx + side * r * 0.95, cy + r * 0.2, cx + side * r * 1.3, ground - r * 0.32, side, r, base, dark, light, -0.25)
    return canvas.resize((FRAME, FRAME), Image.LANCZOS)


def make_taunt(body: Image.Image, base, dark, light, eyes, mouth) -> Image.Image:
    """Kare 7: dalga geçme: gözler gülerek kısılı, dil dışarıda, gövde hafif yatık, eller başın iki yanında
    (parmaklar oynuyor); bir ayak havada."""
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
        _leg(d, sx, sy, ex, ey, side, r, base, dark, light)
    sc = bsz / body.size[0]
    b = _lids(body.resize((bsz, bsz), Image.LANCZOS), eyes, sc, base, dark, "laugh")
    b = _tongue(b, mouth, sc)
    b = b.rotate(-10, resample=Image.BICUBIC, expand=False)
    canvas.alpha_composite(b, (int(cx - bsz / 2), int(by)))
    d = ImageDraw.Draw(canvas)
    for side in (-1, 1):  # eller başın iki yanında, parmaklar yukarı-dışa
        sx, sy = cx + side * r * 0.95, cy + r * 0.15
        ex, ey = cx + side * r * 1.5, cy - r * 0.72
        _arm(d, sx, sy, ex, ey, side, r, base, dark, light, bend=0.32)  # dışa kavisli: yüzün üstünden geçmez
    return canvas.resize((FRAME, FRAME), Image.LANCZOS)


def make_sheet(body: Image.Image) -> Image.Image:
    base, dark, light = body_colors(body)
    eyes = eye_boxes(body)
    mouth = mouth_box(body)
    sheet = Image.new("RGBA", (FRAME * FRAMES, FRAME), (0, 0, 0, 0))
    for k in range(6):
        sheet.alpha_composite(make_frame(body, k, base, dark, light, eyes), (k * FRAME, 0))
    sheet.alpha_composite(make_cry(body, base, dark, light, eyes), (6 * FRAME, 0))
    sheet.alpha_composite(make_taunt(body, base, dark, light, eyes, mouth), (7 * FRAME, 0))
    return sheet
