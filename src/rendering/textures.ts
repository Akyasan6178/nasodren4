/* =====================================================================
   TEXTURES: blok renkleri ve canvas 2D ile çizilen dokular
   NS4-03: View.buildTextures() içindeki çizim kodu saf fonksiyonlara ayrıldı.
   NS4-14: aktif parça satırı, türe özgü renk dışı işaretler, kesik kenarlı
   hayalet ve taramalı garbage. PIXI texture oluşturma ve eski texture'ları
   yok etme sırası View.buildTextures() içinde kalır.
   ===================================================================== */
import type { BlockId, TetrominoType } from '../types/game';

/** Garbage / inflamasyon blok kimliği (game/pieces.ts PIECE.GARBAGE ile aynı; rendering oyun modülüne bağlanmaz). */
const PIECE_GARBAGE = 8;

/** Atlas sütun sırası (Object.keys(COLORS) ile aynı: 1..8 artan). */
export const BLOCK_IDS = [1, 2, 3, 4, 5, 6, 7, 8] as const satisfies readonly BlockId[];

export const COLORS: Readonly<Record<BlockId, string>> = {
  1: '#3fd2de',
  2: '#ffcf5a',
  3: '#e44d97',
  4: '#55d08a',
  5: '#ff7868',
  6: '#5d8bff',
  7: '#ffa14a',
  8: '#8e93a6',
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
  };
}

/** NS4-14: tetromino türüne özgü yüzey işareti (renk dışı ayırt edici). Harf kullanılmaz; sprite döndürülmediği için
 * işaret parçanın yönünden bağımsızdır. Garbage (8) işaret yerine hafif çapraz tarama dokusu taşır. */
export type MarkKind = 'dash' | 'dot' | 'arc' | 'ring' | 'cross' | 'pair' | 'triangle';
export const TYPE_MARK: Readonly<Record<TetrominoType, MarkKind>> = {
  1: 'dash', // I
  2: 'dot', // O
  3: 'arc', // T
  4: 'ring', // S
  5: 'cross', // Z
  6: 'pair', // J
  7: 'triangle', // L
};

/** Atlas satırları: sabit blok, hayalet (iniş önizlemesi), aktif (düşen) parça. */
export const ATLAS_ROWS = { block: 0, ghost: 1, active: 2 } as const;
export const ATLAS_ROW_COUNT = 3;

/** Yüzey işaretini (cx, cy) merkezli, `s` ölçekli (yaklaşık yarıçap) çizer. Doldurma/çizgi rengi çağırandan gelir. */
export function drawMark(x: CanvasRenderingContext2D, kind: MarkKind, cx: number, cy: number, s: number): void {
  const lw = Math.max(1, s * 0.34);
  x.lineWidth = lw;
  x.lineCap = 'round';
  x.lineJoin = 'round';
  x.beginPath();
  switch (kind) {
    case 'dash':
      x.moveTo(cx - s * 0.8, cy);
      x.lineTo(cx + s * 0.8, cy);
      x.stroke();
      break;
    case 'dot':
      x.arc(cx, cy, s * 0.42, 0, Math.PI * 2);
      x.fill();
      break;
    case 'arc':
      // dikey yay ")": yatay yay parlama lekesiyle birlikte yüz izlenimi veriyordu
      x.arc(cx - s * 0.45, cy, s * 0.8, -Math.PI * 0.32, Math.PI * 0.32);
      x.stroke();
      break;
    case 'ring':
      x.arc(cx, cy, s * 0.62, 0, Math.PI * 2);
      x.stroke();
      break;
    case 'cross':
      x.moveTo(cx - s * 0.6, cy - s * 0.6);
      x.lineTo(cx + s * 0.6, cy + s * 0.6);
      x.moveTo(cx + s * 0.6, cy - s * 0.6);
      x.lineTo(cx - s * 0.6, cy + s * 0.6);
      x.stroke();
      break;
    case 'pair':
      x.arc(cx - s * 0.6, cy, s * 0.34, 0, Math.PI * 2);
      x.moveTo(cx + s * 0.6 + s * 0.34, cy);
      x.arc(cx + s * 0.6, cy, s * 0.34, 0, Math.PI * 2);
      x.fill();
      break;
    case 'triangle':
      x.moveTo(cx, cy - s * 0.72);
      x.lineTo(cx + s * 0.76, cy + s * 0.56);
      x.lineTo(cx - s * 0.76, cy + s * 0.56);
      x.closePath();
      x.fill();
      break;
  }
}

/** Garbage dokusu: iki ince çapraz tarama çizgisi (kırpma bloğun şekliyle). */
function drawHatch(x: CanvasRenderingContext2D, px: number): void {
  x.lineWidth = Math.max(1, px * 0.05);
  x.lineCap = 'round';
  x.beginPath();
  for (const k of [0.36, 0.64]) {
    x.moveTo(px * (k - 0.3), px * (k + 0.3));
    x.lineTo(px * (k + 0.3), px * (k - 0.3));
  }
  x.stroke();
}

/** İşaret mürekkebi: blok renginin koyu tonu, %90 opak (gri tonlamada da her türde ≥ 3,4:1). */
const MARK_SHADE = -0.68;
const MARK_ALPHA = 0.9;

/** Blok gövdesi (sabit veya aktif). Aktif parça ek bir açık iç kenarla düşen parça olarak ayrılır. */
function drawBlock(x: CanvasRenderingContext2D, id: BlockId, px: number, active: boolean): void {
  const c = COLORS[id],
    garbage = id === PIECE_GARBAGE;
  const ins = px * 0.045,
    r = px * 0.26,
    w = px - ins * 2;
  // gövde: yumuşak dikey degrade (garbage daha düz)
  let g = x.createLinearGradient(0, 0, 0, px);
  g.addColorStop(0, shade(c, garbage ? 0.12 : 0.26));
  g.addColorStop(0.55, c);
  g.addColorStop(1, shade(c, garbage ? -0.12 : -0.24));
  rr(x, ins, ins, w, w, r);
  x.fillStyle = g;
  x.fill();
  // kontrollü derinlik: alt kenarda hafif iç gölge
  x.save();
  rr(x, ins, ins, w, w, r);
  x.clip();
  g = x.createLinearGradient(0, px * 0.62, 0, px);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,.12)');
  x.fillStyle = g;
  x.fillRect(0, 0, px, px);
  if (garbage) {
    // inflamasyon: parlaklık yok, hafif çapraz tarama
    x.strokeStyle = 'rgba(255,255,255,.3)';
    drawHatch(x, px);
  }
  x.restore();
  // kenar ayrımı
  x.lineWidth = Math.max(1, px * 0.035);
  x.strokeStyle = shade(c, -0.34);
  x.globalAlpha = 0.6;
  rr(x, ins, ins, w, w, r);
  x.stroke();
  x.globalAlpha = 1;
  if (!garbage) {
    // yüzey parlaklığı (önceki .55 / .75'ten bir kademe yumuşak: daha az "jel")
    g = x.createRadialGradient(px * 0.34, px * 0.3, 0, px * 0.34, px * 0.3, px * 0.5);
    g.addColorStop(0, `rgba(255,255,255,${active ? 0.55 : 0.45})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    rr(x, ins, ins, w, w, r);
    x.fillStyle = g;
    x.fill();
    x.fillStyle = 'rgba(255,255,255,.62)';
    x.beginPath();
    x.ellipse(px * 0.3, px * 0.24, px * 0.1, px * 0.055, -0.5, 0, Math.PI * 2);
    x.fill();
    // renk dışı işaret
    const ink = shade(c, MARK_SHADE);
    x.fillStyle = x.strokeStyle = ink;
    x.globalAlpha = MARK_ALPHA;
    drawMark(x, TYPE_MARK[id], px * 0.5, px * 0.58, px * 0.17);
    x.globalAlpha = 1;
  }
  if (active) {
    // düşen parça: açık iç kenar
    const lw = Math.max(1, px * 0.05);
    rr(x, ins + lw, ins + lw, w - lw * 2, w - lw * 2, Math.max(1, r - lw));
    x.lineWidth = lw;
    x.strokeStyle = 'rgba(255,255,255,.85)';
    x.stroke();
  }
}

/** Hayalet karo: yarı saydam dolgu + kesik kenar (aktif parçanın düz kenarından ayrılır) + soluk işaret. */
function drawGhost(x: CanvasRenderingContext2D, id: BlockId, px: number): void {
  const c = COLORS[id];
  rr(x, px * 0.09, px * 0.09, px * 0.82, px * 0.82, px * 0.24);
  x.fillStyle = c;
  x.globalAlpha = 0.12;
  x.fill();
  x.globalAlpha = 0.75;
  x.lineWidth = Math.max(1.5, px * 0.06);
  x.strokeStyle = c;
  x.setLineDash([Math.max(2, px * 0.16), Math.max(1.5, px * 0.1)]);
  x.stroke();
  x.setLineDash([]);
  if (id !== PIECE_GARBAGE) {
    x.globalAlpha = 0.5;
    x.fillStyle = c;
    drawMark(x, TYPE_MARK[id], px * 0.5, px * 0.55, px * 0.15);
  }
  x.globalAlpha = 1;
}

/**
 * Tek atlas: 8 sütun (BLOCK_IDS) × 3 satır (sabit blok, hayalet, aktif) → tahtanın tamamı tek taban doku, tek
 * batch. `P` karo adımıdır (px + 4 px boşluk; karo kenarları birbirine taşmaz).
 */
export function createBlockAtlas(px: number): { atlas: HTMLCanvasElement; P: number } {
  const P = px + 4;
  const atlas = document.createElement('canvas');
  atlas.width = P * BLOCK_IDS.length;
  atlas.height = P * ATLAS_ROW_COUNT;
  const x = context2d(atlas);
  BLOCK_IDS.forEach((id, i) => {
    const ox = i * P + 2;
    for (const [row, draw] of [
      [ATLAS_ROWS.block, () => drawBlock(x, id, px, false)],
      [ATLAS_ROWS.ghost, () => drawGhost(x, id, px)],
      [ATLAS_ROWS.active, () => drawBlock(x, id, px, true)],
    ] as const) {
      x.save();
      x.translate(ox, row * P + 2);
      draw();
      x.restore();
    }
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
