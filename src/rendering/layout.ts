/* =====================================================================
   LAYOUT (portre / yatay uyarlamalı)
   NS4-03: main.ts'ten taşındı; eşikler ve ölçü hesapları değişmedi.
   Sonuç hem Pixi görünümüne (View.layout) hem DOM HUD yerleşimine verilir.
   ===================================================================== */
import { COLS, VIS } from '../config/gameConfig';
import type { Layout } from '../types/layout';

export function computeLayout(W: number, H: number): Layout {
  const pad = 12;
  const portrait = W / H < 0.95 || W < 600;
  const L = { W, H, portrait } as Layout;   // NS4-02: alanlar aşağıda kademeli dolduruluyor
  if (portrait) {
    const topH = Math.round(Math.max(64, Math.min(96, H * 0.11)));
    const botH = 70;
    const meterW = 10;
    let cell = Math.floor(Math.min((W - pad * 2 - (meterW + 8) * 2) / COLS, (H - topH - botH - pad * 3) / VIS));
    cell = Math.max(12, Math.min(44, cell));
    const bw = cell * COLS, bh = cell * VIS;
    const bx = Math.round((W - bw) / 2);
    const freeV = H - topH - botH - bh - pad * 2;
    const by = Math.round(pad + topH + Math.max(0, freeV / 2));
    L.cell = cell; L.board = { x: bx, y: by, w: bw, h: bh };
    L.meter = { x: bx - meterW - 8, y: by, w: meterW, h: bh };
    const hb = topH - 6, hw = hb;
    L.hold = { x: pad, y: pad, w: hw, h: hb };
    L.mini = Math.max(8, Math.floor(hb * 0.18)); L.miniBig = L.mini;
    L.holdSlot = { x: L.hold.x + hw / 2, y: L.hold.y + hb / 2 + 7 };
    const nw = Math.round(hb * 1.6);
    L.next = { x: W - pad - nw, y: pad, w: nw, h: hb };
    L.nextSlots = [0, 1].map((k) => ({ x: L.next.x + nw * (k + 0.5) / 2, y: L.next.y + hb / 2 + 7 }));
    L.stats = { x: L.hold.x + hw + 6, y: pad, w: L.next.x - (L.hold.x + hw) - 12, h: hb };
    const by2 = H - pad - 56;
    const gap = 8, pw = 48;
    const bw3 = Math.floor((W - pad * 2 - pw - gap * 3) / 3);
    L.btnHold = { x: pad, y: by2, w: bw3, h: 56 };
    L.btnCyc = { x: pad + bw3 + gap, y: by2, w: bw3, h: 56 };
    L.btnSyn = { x: pad + (bw3 + gap) * 2, y: by2, w: bw3, h: 56 };
    L.btnPause = { x: W - pad - 46, y: by2 + 5, w: 46, h: 46 };
    L.compactBtns = bw3 < 150; L.compactStats = true;
  } else {
    const side = 6;
    let cell = Math.floor(Math.min((H - pad * 2) / VIS, (W - pad * 2 - 56) / (COLS + side * 2)));
    cell = Math.max(12, Math.min(40, cell));
    const bw = cell * COLS, bh = cell * VIS, sw = cell * side;
    const bx = Math.round((W - bw) / 2), by = Math.round((H - bh) / 2);
    L.cell = cell; L.board = { x: bx, y: by, w: bw, h: bh };
    L.meter = { x: bx - 16, y: by, w: 8, h: bh };
    const lx = bx - 40 - sw, rx = bx + bw + 16;
    L.hold = { x: lx, y: by, w: sw, h: cell * 4 };
    L.mini = Math.round(cell * 0.62); L.miniBig = Math.round(cell * 0.8);
    L.holdSlot = { x: lx + sw / 2, y: by + cell * 2.2 };
    L.stats = { x: lx + 4, y: by + cell * 4.6, w: sw - 4, h: cell * 3 };
    const bh2 = Math.max(52, cell * 1.6);
    L.btnHold = { x: lx, y: by + bh - bh2 * 3 - 16, w: sw, h: bh2 };
    L.btnCyc = { x: lx, y: by + bh - bh2 * 2 - 8, w: sw, h: bh2 };
    L.btnSyn = { x: lx, y: by + bh - bh2, w: sw, h: bh2 };
    L.next = { x: rx, y: by, w: sw, h: cell * 13 };
    L.nextSlots = [0, 1, 2, 3, 4].map((k) => ({ x: rx + sw / 2, y: by + cell * (k === 0 ? 2.6 : 2.6 + 0.4 + k * 2.4) }));
    L.btnPause = { x: rx, y: by + bh - 46, w: 46, h: 46 };
    L.compactBtns = sw < 150; L.compactStats = sw < 150;
  }
  return L;
}
