"""NS4-44 · Virüs Avı görselleri.

Kullanıcının kaynak görsellerini (public/images/virüsler/) oyunun leylak / pembe / bordo tonlarına boyar,
dişleri ağız rengine çevirir, ıslak parlaklığı ve kabarcık kontrastını azaltır, kızgın kaşları yumuşatır.
Siluet, gövde ve dikenler korunur (yeniden çizim yok).

Çıktı: public/images/virus/virus-{1,2,3}.webp (256×256, saydam).
Kullanım: python tools/viruses/prepare_viruses.py [--preview ÇIKTI.png]
"""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage
from scipy.spatial import Delaunay

from sheet import make_sheet

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "art" / "virusler"  # kullanıcının kaynak görselleri (build'e girmez)
OUT = ROOT / "public" / "images" / "virus"
SIZE = 256

# kaynak → hedef ton (derece), doygunluk sınırı, parlaklık çarpanı, kaş yumuşatma
VIRUSES = [
    # tek gözlü virüs: kullanıcı isteğiyle (2026-11-10) yeşil kalır; limon/sarı-yeşil değil, temiz yaprak yeşili
    {"src": "bacteria.png", "hue": 128.0, "sat": 0.58, "val": 0.92, "brows": False, "green": True, "fill_mouth": True},
    # NS4-44 ek (2026-11-11): kırmızı ve sarı (kullanıcı isteği); sarı canlı güneş sarısı, yeşilimsi değil
    {"src": "bacteria2.png", "hue": 2.0, "sat": 0.74, "val": 1.0, "brows": True, "fill_mouth": True},  # kırmızı
    {"src": "bacteria3.png", "hue": 46.0, "sat": 0.8, "val": 1.08, "brows": False},  # sarı
]

GREEN = (50.0, 175.0)  # yeşil-sarı ton aralığı (boyanacak gövde)
SHINE_KEEP = 0.45  # parlak beneklerin korunan oranı
BUMP_SMOOTH = 0.35
MOUTH_HUE = 345.0  # ağız içi: koyu bordo (her virüste aynı; yeşil ya da kahverengi değil)  # kabarcık kontrastı: değer kanalının yumuşatılmış hâline karışım


def rgb_to_hsv(rgb: np.ndarray) -> np.ndarray:
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mx = rgb.max(-1)
    mn = rgb.min(-1)
    d = mx - mn
    h = np.zeros_like(mx)
    nz = d > 1e-6
    rm = nz & (mx == r)
    gm = nz & (mx == g) & ~rm
    bm = nz & ~rm & ~gm
    h[rm] = ((g - b)[rm] / d[rm]) % 6
    h[gm] = (b - r)[gm] / d[gm] + 2
    h[bm] = (r - g)[bm] / d[bm] + 4
    h = h * 60.0
    s = np.where(mx > 1e-6, d / np.maximum(mx, 1e-6), 0)
    return np.stack([h, s, mx], -1)


def hsv_to_rgb(hsv: np.ndarray) -> np.ndarray:
    h, s, v = hsv[..., 0] / 60.0, hsv[..., 1], hsv[..., 2]
    i = np.floor(h).astype(int) % 6
    f = h - np.floor(h)
    p = v * (1 - s)
    q = v * (1 - s * f)
    t = v * (1 - s * (1 - f))
    out = np.zeros(h.shape + (3,))
    for k, (a, b, c) in enumerate([(v, t, p), (q, v, p), (p, v, t), (p, q, v), (t, p, v), (v, p, q)]):
        m = i == k
        out[m] = np.stack([a[m], b[m], c[m]], -1)
    return out


def components(mask: np.ndarray) -> list[tuple[np.ndarray, int]]:
    lab, n = ndimage.label(mask)
    return [(lab == k, int((lab == k).sum())) for k in range(1, n + 1)]


def process(cfg: dict) -> Image.Image:
    im = Image.open(SRC / cfg["src"]).convert("RGBA")
    a = np.asarray(im).astype(float) / 255.0
    rgb, alpha = a[..., :3], a[..., 3]
    hsv = rgb_to_hsv(rgb)
    H, W = alpha.shape
    vis = alpha > 0.05
    hue, sat, val = hsv[..., 0], hsv[..., 1], hsv[..., 2]

    green = vis & (hue >= GREEN[0]) & (hue <= GREEN[1]) & (sat > 0.18)
    red = vis & ((hue < 25) | (hue > 330)) & (sat > 0.35) & (val > 0.25)
    white = vis & (sat < 0.22) & (val > 0.72)
    ys, xs = np.mgrid[0:H, 0:W]

    # ağız: alt yarıdaki en büyük kırmızı bileşen + hemen üstündeki/yanındaki kırmızı parçalar (dişlerle bölünmüş)
    mouth = np.zeros_like(vis)
    best = 0
    reds = components(red)
    for m, area in reds:
        if ys[m].mean() > H * 0.5 and area > best:
            mouth, best = m, area
    tongue = mouth.copy()
    if mouth.any():
        ay0, ay1, ax0, ax1 = ys[mouth].min(), ys[mouth].max(), xs[mouth].min(), xs[mouth].max()
        for m, _ in reds:
            cy, cx = ys[m].mean(), xs[m].mean()
            if ay0 - H * 0.06 <= cy <= ay1 + 5 and ax0 - 25 <= cx <= ax1 + 25:
                mouth |= m
    # gözler: büyük beyaz bileşenler (göz akı) korunur
    body_area = vis.sum()
    eyes = np.zeros_like(vis)
    for m, area in components(white):
        if area > body_area * 0.012 and not (mouth.any() and ys[m].mean() > ys[mouth].min()):
            eyes |= m

    out = hsv.copy()
    # gövde: yeşili hedef tona taşı, değer gölgelemesi korunur; kabarcık kontrastı biraz yumuşar
    smooth_v = ndimage.gaussian_filter(val, 2.2)
    body_v = np.where(green, (1 - BUMP_SMOOTH) * val + BUMP_SMOOTH * smooth_v, val)
    out[..., 0] = np.where(green, cfg["hue"], hue)
    out[..., 1] = np.where(green, np.minimum(sat * 0.85, cfg["sat"]), sat)
    out[..., 2] = np.where(green, np.clip(body_v * cfg["val"], 0, 1), val)
    # koyu, doygunluğu düşük kontur pikselleri (yeşilimsi siyah) gövde tonuna kayar
    outline = vis & ~green & (val < 0.32) & (hue >= GREEN[0] - 20) & (hue <= GREEN[1] + 20)
    out[..., 0] = np.where(outline, cfg["hue"], out[..., 0])
    out[..., 1] = np.where(outline, np.maximum(sat, 0.35), out[..., 1])

    # dişler: ağız kutusunun içindeki beyazlar ağız rengine boyanır
    if mouth.any():
        y0, y1 = ys[mouth].min() - H * 0.06, ys[mouth].max() + H * 0.03
        x0, x1 = xs[mouth].min() - 3, xs[mouth].max() + 3
        box = (ys >= y0) & (ys <= y1) & (xs >= x0) & (xs <= x1)
        teeth = vis & (sat < 0.38) & (val > 0.42) & box & ~eyes & ~green
        teeth = ndimage.binary_dilation(teeth, iterations=2) & vis & ~eyes & box & ~green & ~mouth
        if cfg.get("fill_mouth"):
            # sivri dişli ağız: kırmızı ağız bölgesinin dışbükey zarfı içinde dil dışındaki her şey koyulaşır
            # (diş konturları ve gölgeleri de kalmaz)
            pts = np.argwhere(ndimage.binary_dilation(mouth, iterations=2))
            hull = Delaunay(pts)
            inside = (hull.find_simplex(np.stack([ys.ravel(), xs.ravel()], -1)) >= 0).reshape(H, W)
            light = vis & (val > 0.55) & (sat < 0.5)
            teeth = (inside & vis & ~eyes & ~tongue) | (box & vis & ~eyes & ~tongue & ((~green & ~outline) | light))
        # ağız içi koyu mürdüm (kahverengi değil): dişler ağzın gölgesine karışır
        out[..., 0] = np.where(teeth, MOUTH_HUE, out[..., 0])
        out[..., 1] = np.where(teeth, 0.62, out[..., 1])
        out[..., 2] = np.where(teeth, 0.3, out[..., 2])
    else:
        teeth = np.zeros_like(vis)

    # parlak benekler (gözler ve dişler dışı): ıslak görünüm azalsın
    shine = white & ~eyes & ~teeth
    if shine.any():
        tone = np.stack([np.full_like(val, cfg["hue"]), np.full_like(val, cfg["sat"] * 0.55), np.clip(smooth_v * cfg["val"], 0, 1)], -1)
        k = SHINE_KEEP
        out[shine] = out[shine] * k + tone[shine] * (1 - k)

    # kızgın kaşlar: gözlerin üstündeki koyu bant gövde ortancasına açılır
    if cfg["brows"] and eyes.any():
        mid_v = float(np.median(out[..., 2][green]))
        for m, _ in components(eyes):
            ey0, ey1 = ys[m].min(), ys[m].max()
            ex0, ex1 = xs[m].min(), xs[m].max()
            eh, ew = ey1 - ey0, ex1 - ex0
            band = (ys >= ey0 - eh * 0.9) & (ys <= ey0 + eh * 0.2) & (xs >= ex0 - ew * 0.3) & (xs <= ex1 + ew * 0.3)
            dark = band & vis & ~m & (out[..., 2] < mid_v * 1.05)
            out[..., 0] = np.where(dark, cfg["hue"], out[..., 0])
            out[..., 1] = np.where(dark, cfg["sat"] * 0.9, out[..., 1])
            out[..., 2] = np.where(dark, mid_v, out[..., 2])

    rgb2 = hsv_to_rgb(out)
    alpha = alpha.copy()
    if cfg["brows"] and eyes.any():
        round_eyes(rgb2, alpha, eyes, red, val, cfg, ys, xs)
    res = np.dstack([rgb2, alpha])
    img = Image.fromarray((np.clip(res, 0, 1) * 255).round().astype(np.uint8), "RGBA")
    # kare tuvale ortala ve 256'ya ölçekle
    s = max(img.size)
    sq = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    sq.paste(img, ((s - img.size[0]) // 2, (s - img.size[1]) // 2))
    return sq.resize((SIZE, SIZE), Image.LANCZOS)


def round_eyes(rgb: np.ndarray, alpha: np.ndarray, eyes: np.ndarray, red: np.ndarray, val: np.ndarray, cfg: dict, ys, xs) -> None:
    """Çapraz kesilmiş (kızgın) göz akını yuvarlak, şaşkın bir göze çevirir; iris ve göz bebeği yerinde kalır."""
    keep = rgb.copy()
    outline = hsv_to_rgb(np.array([[[cfg["hue"], 0.6, 0.24]]]))[0, 0]
    for m, _ in components(eyes):
        ex0, ex1, ey0, ey1 = xs[m].min(), xs[m].max(), ys[m].min(), ys[m].max()
        iris = np.zeros_like(m)
        for r, _ in components(red):
            if ex0 - 12 <= xs[r].mean() <= ex1 + 12 and ey0 - 12 <= ys[r].mean() <= ey1 + 12:
                iris |= r
        if iris.any():
            ib = (ys >= ys[iris].min()) & (ys <= ys[iris].max()) & (xs >= xs[iris].min()) & (xs <= xs[iris].max())
            iris |= ib & (val < 0.3)
            iris = ndimage.binary_fill_holes(iris)
        both = m | iris
        x0, x1, y0, y1 = xs[both].min(), xs[both].max(), ys[both].min(), ys[both].max()
        rx = (x1 - x0) / 2 + 1.5
        ry = max((y1 - y0) / 2 + 1.5, rx * 1.02)
        cx, cy = (x0 + x1) / 2, y1 + 1.5 - ry
        d = ((xs - cx) / rx) ** 2 + ((ys - cy) / ry) ** 2
        inner = d <= 1
        ring = (((xs - cx) / (rx + 2.5)) ** 2 + ((ys - cy) / (ry + 2.5)) ** 2 <= 1) & ~inner
        rgb[ring] = outline
        alpha[ring] = 1
        rgb[inner] = (0.98, 0.97, 0.98)
        # alt kenarda hafif gölge (düz beyaz durmasın)
        shade = inner & (d > 0.55) & (ys > cy)
        rgb[shade] = rgb[shade] * 0.92
        alpha[inner] = 1
        rgb[iris] = keep[iris]


def mean_hue_is_green(img: Image.Image) -> bool:
    a = np.asarray(img).astype(float) / 255.0
    vis = a[..., 3] > 0.5
    hsv = rgb_to_hsv(a[..., :3])
    colored = vis & (hsv[..., 1] > 0.25)
    g = colored & (hsv[..., 0] >= GREEN[0]) & (hsv[..., 0] <= GREEN[1])
    return g.sum() > colored.sum() * 0.05


def preview(outs: list[Image.Image], path: Path) -> None:
    cell = 200
    bgs = [(15, 61, 71), (244, 251, 250)]
    sheet = Image.new("RGB", (cell * 6, cell * 2), (255, 255, 255))
    for row, bg in enumerate(bgs):
        for i, cfg in enumerate(VIRUSES):
            src = Image.open(SRC / cfg["src"]).convert("RGBA")
            src.thumbnail((cell - 20, cell - 20))
            for j, im in enumerate([src, outs[i].resize((cell - 20, cell - 20), Image.LANCZOS)]):
                tile = Image.new("RGBA", (cell, cell), bg + (255,))
                tile.alpha_composite(im, ((cell - im.size[0]) // 2, (cell - im.size[1]) // 2))
                sheet.paste(tile.convert("RGB"), ((i * 2 + j) * cell, row * cell))
    sheet.save(path)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--preview", type=Path)
    args = ap.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    outs = []
    for i, cfg in enumerate(VIRUSES, start=1):
        img = process(cfg)
        assert cfg.get("green") or not mean_hue_is_green(img), f"virus-{i} hâlâ yeşil"
        img.save(OUT / f"virus-{i}.webp", "WEBP", quality=82, method=6)
        outs.append(img)
        print(f"virus-{i}.webp", (OUT / f"virus-{i}.webp").stat().st_size, "bayt")
        # NS4-44 ek: kollu bacaklı 6 karelik animasyon şeridi
        sheet = make_sheet(img)
        sheet.save(OUT / f"virus-{i}-sheet.webp", "WEBP", quality=80, method=6)
        print(f"virus-{i}-sheet.webp", (OUT / f"virus-{i}-sheet.webp").stat().st_size, "bayt")
    if args.preview:
        preview(outs, args.preview)
        print("önizleme:", args.preview)


if __name__ == "__main__":
    main()
