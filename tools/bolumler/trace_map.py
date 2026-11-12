"""NS4-46: yüz haritası (bölüm geçiş kartı ve final) şekilleri, kullanıcının şemasından (art/bolumler/etmoid sinus.png).

Renklere göre ayırır: alın (yeşil), gözler arası (mavi-leylak), yanak (mor), burun boşluğu (beyaz kontur). Sağ burun
boşluğu ve sağ yanak, sol tarafın burun bölmesine (orta çizgi) göre aynasıdır. Her bölgenin sol/sağ konturu çıkar, sadeleştirilir ve SVG yolu olarak
yazdırılır (viewBox = şemanın kırpılmış alanı). Kontrol görüntüsü: --preview <png>.

Çalıştır: python tools/bolumler/trace_map.py [--preview out.png]
"""
import sys
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'art' / 'bolumler' / 'etmoid sinus.png'
# Kırpma (şema pikseli): etiket çizgileri ve sağdaki saç hariç; yüzün orta bölümü
CROP = (20, 40, 400, 344)  # x0, y0, x1, y1

img = cv2.imread(str(SRC), cv2.IMREAD_COLOR)
assert img is not None, SRC
b, g, r = [img[:, :, i].astype(int) for i in range(3)]


def clean(mask, k=3, close=5):
    m = (mask * 255).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((k, k), np.uint8))
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((close, close), np.uint8))
    return m


masks = {
    # alın: yeşil (g en büyük)
    'alin': clean((g > r + 4) & (g > b + 20)),
    # gözler arası: mavi-leylak (b en büyük, r'ye yakın değil)
    'etmoid': clean((b > r + 12) & (b > g + 6)),
    # yanak: mor (r ve b, g'den belirgin büyük; b r'ye yakın)
    'yanak': clean((r - g > 30) & (b - g > 22) & (abs(r - b) < 30) & (b > 150), k=3, close=9),
}
# burun: beyaz kontur → içi doldurulur
white = clean((r > 228) & (g > 228) & (b > 228), k=1, close=3)
# yalnızca burun bölgesindeki büyük kontur (göz akları ve etiket noktası hariç)
cnts, _ = cv2.findContours(white, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
line = np.zeros_like(white)
big = [c for c in cnts if cv2.arcLength(c, True) > 300]
cv2.drawContours(line, big, -1, 255, thickness=3)
# şemada sağ kenar burun deliği hizasında kesik (çiçek ve çizgi üstüne biniyor): iki ucu birleştir
cv2.line(line, (202, 268), (204, 300), 255, 3)
# kalan küçük açıklıkları kapat, sonra dışarıdan doldurup içini bul (iç = kapalı alan)
line = cv2.morphologyEx(line, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
flood = line.copy()
cv2.floodFill(flood, np.zeros((flood.shape[0] + 2, flood.shape[1] + 2), np.uint8), (0, 0), 255)
masks['burun'] = cv2.bitwise_or(line, cv2.bitwise_not(flood))

# orta çizgi (burun bölmesi): sol burun boşluğunun gövdesinin sağ kenarı (ince üst tüp hariç, alt yarı)
ys, xs = np.nonzero(masks['burun'])
body = xs[ys > np.percentile(ys, 50)]
mid = float(np.percentile(body, 99))

x0, y0, x1, y1 = CROP


def paths(mask):
    out = {}
    cs, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    cs = [c for c in cs if cv2.contourArea(c) > 80]
    for side in ('sol', 'sag'):
        sel = [c for c in cs if (c[:, 0, 0].mean() < mid) == (side == 'sol')]
        if not sel:
            continue
        c = max(sel, key=cv2.contourArea)
        c = cv2.approxPolyDP(c, 1.2, True)
        out[side] = c[:, 0, :]
    return out


shapes = {k: paths(m) for k, m in masks.items()}
# sağ burun boşluğu ve sağ yanak: sol tarafın aynası (şemada sağ burun ayrı çizilmemiş; sağ yanağın üstüne etiket
# kutusu ve çizgisi biniyor). Şemadaki iki yanak zaten birbirinin aynasına çok yakın.
for kind in ('burun', 'yanak'):
    sol = shapes[kind]['sol']
    shapes[kind]['sag'] = np.stack([2 * mid - sol[:, 0], sol[:, 1]], axis=1)[::-1]


def svg_path(pts):
    p = [(float(x) - x0, float(y) - y0) for x, y in pts]
    # yumuşak kapalı eğri (Catmull-Rom → kübik Bezier)
    n = len(p)
    d = f'M{p[0][0]:.1f} {p[0][1]:.1f}'
    for i in range(n):
        a, b_, c, e = p[i - 1], p[i], p[(i + 1) % n], p[(i + 2) % n]
        c1 = (b_[0] + (c[0] - a[0]) / 6, b_[1] + (c[1] - a[1]) / 6)
        c2 = (c[0] - (e[0] - b_[0]) / 6, c[1] - (e[1] - b_[1]) / 6)
        d += f'C{c1[0]:.1f} {c1[1]:.1f} {c2[0]:.1f} {c2[1]:.1f} {c[0]:.1f} {c[1]:.1f}'
    return d + 'Z'


print(f'viewBox="0 0 {x1 - x0} {y1 - y0}"  orta={mid - x0:.1f}')
for kind in ('alin', 'etmoid', 'yanak', 'burun'):
    for side in ('sol', 'sag'):
        pts = shapes[kind].get(side)
        print(f'{kind}-{side}', 'YOK' if pts is None else f'{len(pts)} nokta')
        if pts is not None:
            print('  ' + svg_path(pts))

if '--preview' in sys.argv:
    out = sys.argv[sys.argv.index('--preview') + 1]
    vis = img.copy()
    col = {'alin': (0, 160, 0), 'etmoid': (200, 80, 0), 'yanak': (160, 0, 160), 'burun': (0, 0, 255)}
    for kind, sides in shapes.items():
        for pts in sides.values():
            cv2.polylines(vis, [pts.astype(np.int32).reshape(-1, 1, 2)], True, col[kind], 2)
    cv2.line(vis, (int(mid), 0), (int(mid), vis.shape[0]), (255, 255, 255), 1)
    cv2.rectangle(vis, (x0, y0), (x1, y1), (0, 255, 255), 1)
    cv2.imwrite(out, cv2.resize(vis, None, fx=2, fy=2, interpolation=cv2.INTER_NEAREST))


# ---------------------------------------------------------------------------------------------------------------
# NS4-46: yüz haritası SVG'si (index.html #rmap ve #fmap). --svg: işaretler arasındaki SVG'yi yeniden yazar.
# Yüz öğeleri şemanın renklerinden: kaşlar ve göz kapakları (koyu kahve), göz akı, iris ve göz bebeği, burun delikleri.
# Renkler styles.css :root tokenlarında (--map-*); burada yalnızca sınıflar.
def comp_paths(mask, minarea, keep):
    m = (mask * 255).astype(np.uint8)
    n, lab, st, cen = cv2.connectedComponentsWithStats(m)
    out = []
    for i in range(1, n):
        if st[i][4] < minarea or not keep(st[i], cen[i]):
            continue
        cs, _ = cv2.findContours((lab == i).astype(np.uint8) * 255, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
        c = cv2.approxPolyDP(max(cs, key=cv2.contourArea), 0.8, True)[:, 0, :]
        out.append(c)
    return out


dark = (r < 120) & (g < 90) & (b < 90)
# kaşlar: yüzün üst bölümünde geniş koyu şeritler; göz kapakları: göz hizasındaki ince koyu yaylar
brows = comp_paths(dark, 60, lambda s, c: c[1] < 125 and s[2] > 40)
lids = comp_paths(dark, 200, lambda s, c: 128 < c[1] < 160 and s[2] > 80)
# göz akı: kapak bandının hemen altındaki beyaz alanlar (burun konturu hariç)
eyes = []
for lid in lids:
    xs_, ys_ = lid[:, 0], lid[:, 1]
    eyes.append((xs_.min(), xs_.max(), ys_.min()))
IRIS_R, PUPIL_R = 11.5, 5.2
irises = [(95.8, 148.6), (323.3, 148.4)]  # şemadaki iris ve göz bebeği merkezleri (koyu/mavi bileşenlerden)
nostrils = [(188.0, 312.0), (236.0, 311.0)]


def tr(x, y):
    return f'{x - x0:.1f} {y - y0:.1f}'


def poly_path(pts):
    return svg_path(pts)


def eye_path(xl, xr, ytop):
    cx, h = (xl + xr) / 2, 13.0
    yc = ytop + 13
    return (f'M{tr(xl, yc)}Q{tr(cx, ytop - 2)} {tr(xr, yc)}Q{tr(cx, yc + h)} {tr(xl, yc)}Z')


def build_svg(ind, uid):
    L = []
    w, h = x1 - x0, y1 - y0
    L.append(f'<svg class="sinus-svg" viewBox="0 0 {w} {h}" aria-hidden="true">')
    L.append(f'  <defs><clipPath id="{uid}-clip"><rect width="{w}" height="{h}" rx="34" /></clipPath>')
    for i, (xl, xr, yt) in enumerate(sorted(eyes)):
        L.append(f'    <clipPath id="{uid}-eye{i}"><path d="{eye_path(xl, xr, yt)}" /></clipPath>')
    L.append('  </defs>')
    L.append(f'  <g clip-path="url(#{uid}-clip)">')
    L.append(f'    <rect class="skin" width="{w}" height="{h}" />')
    for i, (xl, xr, yt) in enumerate(sorted(eyes)):
        ix, iy = sorted(irises)[i]
        L.append(f'    <path class="sclera" d="{eye_path(xl, xr, yt)}" />')
        L.append(f'    <g clip-path="url(#{uid}-eye{i})"><circle class="iris" cx="{ix - x0:.1f}" cy="{iy - y0:.1f}" r="{IRIS_R}" />'
                 f'<circle class="pupil" cx="{ix - x0:.1f}" cy="{iy - y0:.1f}" r="{PUPIL_R}" /></g>')
    for lid in lids:
        L.append(f'    <path class="lid" d="{poly_path(lid)}" />')
    for br in brows:
        L.append(f'    <path class="brow" d="{poly_path(br)}" />')
    for nx, ny in nostrils:
        L.append(f'    <ellipse class="nostril" cx="{nx - x0:.1f}" cy="{ny - y0:.1f}" rx="11" ry="5" />')
    # şemadaki çizim sırası: yanak, alın, gözler arası, burun (burun konturu en üstte)
    for kind in ('yanak', 'alin', 'etmoid', 'burun'):
        for side in ('sol', 'sag'):
            pts = shapes[kind][side]
            L.append(f'    <path class="sinus k-{kind} s-{kind}-{side}" d="{svg_path(pts)}" />')
    fx, fy = 197 - x0, 283 - y0  # şemadaki sıklamen çiçeği (burun ucu)
    L.append(f'    <image class="flower" href="images/bitki/cicek-fusya.webp" x="{fx - 13:.0f}" y="{fy - 15:.0f}" width="26" height="30" />')
    L.append('  </g>')
    L.append('</svg>')
    return '\n'.join(ind + l for l in L) + '\n'


if '--svg' in sys.argv:
    html_p = ROOT / 'index.html'
    html = html_p.read_text(encoding='utf-8')
    for uid in ('rmap', 'fmap'):
        start = html.index(f'id="{uid}"')
        a = html.index('<svg class="sinus-svg"', start)
        bnd = html.index('</svg>', a) + len('</svg>')
        line_start = html.rindex('\n', 0, a) + 1
        ind = html[line_start:a]
        html = html[:line_start] + build_svg(ind, uid).rstrip('\n') + html[bnd:]
    html_p.write_text(html, encoding='utf-8', newline='\n')
    print('index.html güncellendi:', len(brows), 'kaş,', len(lids), 'kapak,', len(eyes), 'göz')
