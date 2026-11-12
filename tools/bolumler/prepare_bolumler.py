"""NS4-46: bölüm geçiş kartı görselleri. Kaynak: art/bolumler/<ad>.png (kullanıcının boşluk görselleri, 960x540).
Boşluğun (kırmızı alan) çevresinden kırpar, kenar payı bırakır, en çok 480 px genişliğe indirir ve
public/images/bolumler/<ad>.webp yazar. Çalıştır: python tools/bolumler/prepare_bolumler.py"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC, OUT = ROOT / 'art' / 'bolumler', ROOT / 'public' / 'images' / 'bolumler'
NAMES = ['maxillary_sol', 'maxillary_sag', 'frontal_sol', 'frontal_sag']
MAX_W, PAD = 480, 0.08

OUT.mkdir(parents=True, exist_ok=True)
for name in NAMES:
    im = Image.open(SRC / f'{name}.png').convert('RGB')
    w, h = im.size
    px = im.load()
    xs, ys = [], []
    for y in range(0, h, 2):
        for x in range(0, w, 2):
            r, g, b = px[x, y]
            if r > 70 and r > g * 1.6 and r > b * 1.6:  # boşluğun kırmızı dokusu
                xs.append(x)
                ys.append(y)
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    side = max(x1 - x0, y1 - y0)
    pad = int(side * PAD)
    cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
    half = side // 2 + pad
    box = (max(0, cx - half), max(0, cy - half), min(w, cx + half), min(h, cy + half))
    crop = im.crop(box)
    if crop.width > MAX_W:
        crop = crop.resize((MAX_W, round(crop.height * MAX_W / crop.width)), Image.LANCZOS)
    crop.save(OUT / f'{name}.webp', 'WEBP', quality=80, method=6)
    print(name, box, crop.size, (OUT / f'{name}.webp').stat().st_size, 'bayt')
