/* =====================================================================
   LAYOUT (portre / yatay uyarlamalı)
   NS4-03: main.ts'ten taşındı; eşikler ve ölçü hesapları değişmedi.
   NS4-04: kademeli doldurulan nesne + `as Layout` yerine her yön için tam
   nesne döndüren iki saf fonksiyon (ifadeler ve işlem sırası aynı).
   Sonuç hem Pixi görünümüne (View.layout) hem DOM HUD yerleşimine verilir.
   NS4-09: btnCyc artık Sıklamen karakteridir: portrede alt çubuğun ortasında
   kare, yatayda sol sütunda istatistiklerle butonlar arasındaki büyük alanda.
   ===================================================================== */
import { COLS, VIS } from '../config/gameConfig';
import type { LandscapeLayout, Layout, PortraitLayout, Rect } from '../types/layout';

export function computeLayout(W: number, H: number): Layout {
  const pad = 12;
  const portrait = W / H < 0.95 || W < 600;
  return portrait ? portraitLayout(W, H, pad) : landscapeLayout(W, H, pad);
}

function portraitLayout(W: number, H: number, pad: number): PortraitLayout {
  const topH = Math.round(Math.max(64, Math.min(96, H * 0.11)));
  const botH = 96;
  const meterW = 10;
  let cell = Math.floor(Math.min((W - pad * 2 - (meterW + 8) * 2) / COLS, (H - topH - botH - pad * 3) / VIS));
  cell = Math.max(12, Math.min(44, cell));
  const bw = cell * COLS,
    bh = cell * VIS;
  const bx = Math.round((W - bw) / 2);
  const freeV = H - topH - botH - bh - pad * 2;
  const by = Math.round(pad + topH + Math.max(0, freeV / 2));
  const hb = topH - 6,
    hw = hb;
  const hold: Rect = { x: pad, y: pad, w: hw, h: hb };
  const mini = Math.max(8, Math.floor(hb * 0.18));
  const nw = Math.round(hb * 1.6);
  const next: Rect = { x: W - pad - nw, y: pad, w: nw, h: hb };
  const by2 = H - pad - 56;
  const gap = 8,
    pw = 48,
    heroW = 88;
  const bw2 = Math.floor((W - pad * 2 - pw - heroW - gap * 3) / 2);
  return {
    W,
    H,
    portrait: true,
    cell,
    board: { x: bx, y: by, w: bw, h: bh },
    meter: { x: bx - meterW - 8, y: by, w: meterW, h: bh },
    hold,
    mini,
    miniBig: mini,
    holdSlot: { x: hold.x + hw / 2, y: hold.y + hb / 2 + 7 },
    next,
    nextSlots: [0, 1].map((k) => ({ x: next.x + (nw * (k + 0.5)) / 2, y: next.y + hb / 2 + 7 })),
    stats: { x: hold.x + hw + 6, y: pad, w: next.x - (hold.x + hw) - 12, h: hb },
    btnHold: { x: pad, y: by2, w: bw2, h: 56 },
    btnCyc: { x: pad + bw2 + gap, y: H - pad - heroW, w: heroW, h: heroW },
    btnSyn: { x: pad + bw2 + gap + heroW + gap, y: by2, w: bw2, h: 56 },
    btnPause: { x: W - pad - 46, y: by2 + 5, w: 46, h: 46 },
    compactBtns: bw2 < 150,
    compactStats: true,
  };
}

function landscapeLayout(W: number, H: number, pad: number): LandscapeLayout {
  const side = 6;
  let cell = Math.floor(Math.min((H - pad * 2) / VIS, (W - pad * 2 - 56) / (COLS + side * 2)));
  cell = Math.max(12, Math.min(40, cell));
  const bw = cell * COLS,
    bh = cell * VIS,
    sw = cell * side;
  const bx = Math.round((W - bw) / 2),
    by = Math.round((H - bh) / 2);
  const lx = bx - 40 - sw,
    rx = bx + bw + 16;
  const bh2 = Math.max(52, cell * 1.6);
  const holdY = by + bh - bh2 * 2 - 8;
  // karakter: istatistiklerin altı ile butonların üstü arasındaki kare alan
  const heroTop = by + cell * 7.9,
    heroSize = Math.max(64, Math.min(sw, holdY - 10 - heroTop));
  return {
    W,
    H,
    portrait: false,
    cell,
    board: { x: bx, y: by, w: bw, h: bh },
    meter: { x: bx - 16, y: by, w: 8, h: bh },
    hold: { x: lx, y: by, w: sw, h: cell * 4 },
    mini: Math.round(cell * 0.62),
    miniBig: Math.round(cell * 0.8),
    holdSlot: { x: lx + sw / 2, y: by + cell * 2.2 },
    stats: { x: lx + 4, y: by + cell * 4.6, w: sw - 4, h: cell * 3 },
    btnHold: { x: lx, y: holdY, w: sw, h: bh2 },
    btnCyc: { x: lx + (sw - heroSize) / 2, y: holdY - 10 - heroSize, w: heroSize, h: heroSize },
    btnSyn: { x: lx, y: by + bh - bh2, w: sw, h: bh2 },
    next: { x: rx, y: by, w: sw, h: cell * 13 },
    nextSlots: [0, 1, 2, 3, 4].map((k) => ({ x: rx + sw / 2, y: by + cell * (k === 0 ? 2.6 : 2.6 + 0.4 + k * 2.4) })),
    btnPause: { x: rx, y: by + bh - 46, w: 46, h: 46 },
    compactBtns: sw < 150,
    compactStats: sw < 150,
  };
}
