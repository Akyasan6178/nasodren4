/* =====================================================================
   TEXTURES: blok renkleri ve canvas 2D ile çizilen dokular
   NS4-03: View.buildTextures() içindeki çizim kodu saf fonksiyonlara
   ayrıldı (çizim komutları değişmedi). PIXI texture oluşturma ve eski
   texture'ları yok etme sırası View.buildTextures() içinde kalır.
   ===================================================================== */
import type { BlockId } from '../types/game';

/** Atlas sütun sırası (Object.keys(COLORS) ile aynı: 1..10 artan). */
export const BLOCK_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const satisfies readonly BlockId[];

export const COLORS: Readonly<Record<BlockId, string>> = {
  1: '#3fd2de',
  2: '#ffcf5a',
  3: '#e44d97',
  4: '#55d08a',
  5: '#ff7868',
  6: '#5d8bff',
  7: '#ffa14a',
  8: '#b58a96',
  // NS4-09: yapışkan mukus tıkacı ve mikrop gövdesi
  9: '#cbd35a',
  10: '#6fc24c',
};

function hexToRgb(h: string) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function shade(h: string, amt: number) {
  const [r, g, b] = hexToRgb(h);
  const f = (c: number) => Math.round(amt >= 0 ? c + (255 - c) * amt : c * (1 + amt));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}
function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Yeni canvas için 2D bağlam. Tarayıcı vermezse açık hata (orijinalde ilk kullanımda TypeError oluşurdu). */
function context2d(cv: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = cv.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D bağlamı oluşturulamadı');
  return ctx;
}

/** Her BlockId için bir değer üretir; `i` atlas sütunudur (BLOCK_IDS sırası). */
export function blockRecord<V>(make: (id: BlockId, i: number) => V): Record<BlockId, V> {
  return {
    1: make(1, 0),
    2: make(2, 1),
    3: make(3, 2),
    4: make(4, 3),
    5: make(5, 4),
    6: make(6, 5),
    7: make(7, 6),
    8: make(8, 7),
    9: make(9, 8),
    10: make(10, 9),
  };
}

/**
 * NS4-09: yapışkan mukus tıkacı. Komşu hücrelere taşan, düzensiz kenarlı, kabarcıklı bir doku; satır boyunca
 * tek parça bir tabaka gibi görünür (bloklardan ayrışsın diye parlak "şeker" görünümü yoktur).
 */
function drawMucus(x: CanvasRenderingContext2D, px: number) {
  const c = COLORS[9];
  const g = x.createLinearGradient(0, 0, 0, px);
  g.addColorStop(0, shade(c, 0.18));
  g.addColorStop(1, shade(c, -0.2));
  x.fillStyle = g;
  x.beginPath();
  // hafif dalgalı kenar: hücre sınırına kadar uzanır
  x.moveTo(0, px * 0.06);
  x.quadraticCurveTo(px * 0.5, -px * 0.04, px, px * 0.06);
  x.lineTo(px, px * 0.94);
  x.quadraticCurveTo(px * 0.5, px * 1.04, 0, px * 0.94);
  x.closePath();
  x.fill();
  // koyu lekeler
  x.fillStyle = shade(c, -0.28);
  x.globalAlpha = 0.35;
  for (const [cx, cy, r] of [
    [0.25, 0.7, 0.12],
    [0.72, 0.35, 0.09],
    [0.62, 0.78, 0.07],
  ] as const) {
    x.beginPath();
    x.arc(px * cx, px * cy, px * r, 0, Math.PI * 2);
    x.fill();
  }
  // kabarcıklar
  x.globalAlpha = 0.8;
  x.strokeStyle = 'rgba(255,255,255,.75)';
  x.lineWidth = Math.max(1, px * 0.03);
  for (const [cx, cy, r] of [
    [0.3, 0.3, 0.08],
    [0.78, 0.66, 0.06],
    [0.45, 0.6, 0.04],
  ] as const) {
    x.beginPath();
    x.arc(px * cx, px * cy, px * r, 0, Math.PI * 2);
    x.stroke();
  }
  x.globalAlpha = 1;
}

/** NS4-09: mikrop: mukusun içinde dikenli, sevimli-yaramaz yeşil yaratık. */
function drawGerm(x: CanvasRenderingContext2D, px: number) {
  drawMucus(x, px);
  const c = COLORS[10],
    cx = px / 2,
    cy = px * 0.52,
    r = px * 0.27;
  x.fillStyle = shade(c, -0.25);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    x.beginPath();
    x.arc(cx + Math.cos(a) * r * 1.15, cy + Math.sin(a) * r * 1.15, px * 0.06, 0, Math.PI * 2);
    x.fill();
  }
  const g = x.createRadialGradient(cx - r * 0.3, cy - r * 0.4, 0, cx, cy, r);
  g.addColorStop(0, shade(c, 0.35));
  g.addColorStop(1, c);
  x.fillStyle = g;
  x.beginPath();
  x.arc(cx, cy, r, 0, Math.PI * 2);
  x.fill();
  x.strokeStyle = shade(c, -0.35);
  x.lineWidth = Math.max(1, px * 0.03);
  x.stroke();
  // gözler (yukarı bakar) ve yaramaz kaşlar
  for (const sx of [-1, 1]) {
    x.fillStyle = '#fff';
    x.beginPath();
    x.ellipse(cx + sx * r * 0.38, cy - r * 0.12, r * 0.24, r * 0.28, 0, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = '#1d2b16';
    x.beginPath();
    x.arc(cx + sx * r * 0.38, cy - r * 0.2, r * 0.12, 0, Math.PI * 2);
    x.fill();
    x.strokeStyle = '#1d2b16';
    x.lineWidth = Math.max(1, px * 0.035);
    x.beginPath();
    x.moveTo(cx + sx * r * 0.62, cy - r * 0.5);
    x.lineTo(cx + sx * r * 0.18, cy - r * 0.38);
    x.stroke();
  }
  // sırıtış
  x.beginPath();
  x.arc(cx, cy + r * 0.25, r * 0.32, 0.15 * Math.PI, 0.85 * Math.PI);
  x.stroke();
}

/** Tek atlas: blok + hayalet karoları -> tahtanın tamamı tek draw call. `P` karo adımıdır. */
export function createBlockAtlas(px: number): { atlas: HTMLCanvasElement; P: number } {
  const P = px + 4,
    keys = BLOCK_IDS;
  const atlas = document.createElement('canvas');
  atlas.width = P * keys.length;
  atlas.height = P * 2;
  const x = context2d(atlas);
  keys.forEach((k, i) => {
    const c = COLORS[k],
      ox = i * P + 2;
    x.save();
    x.translate(ox, 2);
    if (k === 9 || k === 10) {
      if (k === 9) drawMucus(x, px);
      else drawGerm(x, px);
      x.restore();
      return;
    }
    const ins = px * 0.045,
      r = px * 0.26,
      w = px - ins * 2;
    let g = x.createLinearGradient(0, 0, 0, px);
    g.addColorStop(0, shade(c, 0.28));
    g.addColorStop(0.55, c);
    g.addColorStop(1, shade(c, -0.22));
    rr(x, ins, ins, w, w, r);
    x.fillStyle = g;
    x.fill();
    x.lineWidth = Math.max(1, px * 0.035);
    x.strokeStyle = shade(c, -0.32);
    x.globalAlpha = 0.55;
    x.stroke();
    x.globalAlpha = 1;
    g = x.createRadialGradient(px * 0.34, px * 0.3, 0, px * 0.34, px * 0.3, px * 0.5);
    g.addColorStop(0, 'rgba(255,255,255,.55)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    rr(x, ins, ins, w, w, r);
    x.fillStyle = g;
    x.fill();
    x.fillStyle = 'rgba(255,255,255,.75)';
    x.beginPath();
    x.ellipse(px * 0.3, px * 0.24, px * 0.11, px * 0.06, -0.5, 0, Math.PI * 2);
    x.fill();
    x.restore();
    x.save();
    x.translate(ox, P + 2);
    rr(x, px * 0.09, px * 0.09, px * 0.82, px * 0.82, px * 0.24);
    x.fillStyle = c;
    x.globalAlpha = 0.14;
    x.fill();
    x.globalAlpha = 0.7;
    x.lineWidth = Math.max(1.5, px * 0.06);
    x.strokeStyle = c;
    x.stroke();
    x.restore();
  });
  return { atlas, P };
}

/** damlacık */
export function createDropCanvas(cell: number, res: number): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  const ds = Math.max(8, Math.round(cell * 0.5 * res));
  cv.width = cv.height = ds;
  const y = context2d(cv);
  const g = y.createRadialGradient(ds * 0.42, ds * 0.4, 0, ds / 2, ds / 2, ds / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.55, 'rgba(255,255,255,.8)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  y.fillStyle = g;
  y.fillRect(0, 0, ds, ds);
  return cv;
}

/** sıvı dalga dokusu (yatay döşenir) */
export function createWaveCanvas(): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = 256;
  cv.height = 128;
  const x = context2d(cv);
  const g = x.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, 'rgba(255,170,210,.95)');
  g.addColorStop(0.25, 'rgba(230,77,151,.75)');
  g.addColorStop(1, 'rgba(53,216,200,.55)');
  x.fillStyle = g;
  x.beginPath();
  x.moveTo(0, 128);
  for (let i = 0; i <= 256; i += 4) x.lineTo(i, 6 + Math.sin((i / 256) * Math.PI * 4) * 3);
  x.lineTo(256, 128);
  x.closePath();
  x.fill();
  x.strokeStyle = 'rgba(255,255,255,.8)';
  x.lineWidth = 1.5;
  x.beginPath();
  for (let i = 0; i <= 256; i += 4) {
    const yy = 6 + Math.sin((i / 256) * Math.PI * 4) * 3;
    if (i) x.lineTo(i, yy);
    else x.moveTo(i, yy);
  }
  x.stroke();
  return cv;
}
