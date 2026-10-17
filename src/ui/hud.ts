/* =====================================================================
   HUD: skor/seviye/drenaj, tıkanıklık metresi, güç butonları, sayaç rozetleri
   ve layout sonrası DOM yerleşimi. Oyun kuralı hesaplamaz; Game'den okur.
   NS4-03: main.ts'ten taşındı; metinler ve eşikler değişmedi.
   ===================================================================== */
import type { Game } from '../game/Game';
import type { Layout } from '../types/layout';
import { $, place } from './dom';
import { toast } from './notifications';

// Önbellek: yalnızca değişen değerler DOM'a yazılır
const hud: { score: number; level: number; lines: number; cong: number; cyc: boolean | null; syn: boolean | null; mult: number; reb: number; danger: boolean | null; cycAnnounced?: boolean } = { score: -1, level: -1, lines: -1, cong: -1, cyc: null, syn: null, mult: -1, reb: -1, danger: null };

export function fmt(n: number) { return n.toLocaleString('tr-TR'); }

/** `playing`: uygulama durumu 'playing' mi (tehlike vinyeti yalnızca oynarken açılır). */
export function updateHud(g: Game, playing: boolean) {
  if (g.score !== hud.score) { hud.score = g.score; $('hud-score').textContent = fmt(g.score); }
  if (g.level !== hud.level) { hud.level = g.level; $('hud-level').textContent = String(g.level); }
  if (g.lines !== hud.lines) { hud.lines = g.lines; $('hud-lines').textContent = String(g.lines); }
  const cg = Math.round(g.congestion() * 100) / 100;
  if (cg !== hud.cong) {
    hud.cong = cg; $('meter-cover').style.transform = `scaleY(${1 - cg})`;
    const d = cg >= 0.7 && playing;
    if (d !== hud.danger) { hud.danger = d; $('danger').classList.toggle('on', d); }
  }
  const cyc = g.canCyc(), syn = g.canSyn();
  if (cyc !== hud.cyc) {
    hud.cyc = cyc; $<HTMLButtonElement>('btn-cyc').disabled = !cyc; $('btn-cyc').classList.toggle('ready', cyc);
    $('cyc-sub').textContent = g.cycUsed ? 'Bu oyunda kullanıldı' : cyc ? 'Hazır' : 'Tıkanıklık %35\u2019te açılır';
    if (cyc && !hud.cycAnnounced) { hud.cycAnnounced = true; toast('Sinüslerin dolmaya başladı. Sıklamen özütü hazır.'); }
  }
  if (syn !== hud.syn) { hud.syn = syn; $<HTMLButtonElement>('btn-syn').disabled = !syn; $('btn-syn').classList.toggle('ready', syn && g.synUses === 0); }
  const m = Math.ceil(g.multT / 1000);
  if (m !== hud.mult) { hud.mult = m; const el = $('badge-mult'); el.style.display = m > 0 ? 'block' : 'none'; if (m > 0) el.textContent = `Ferah nefes ×2 · ${m} sn`; }
  const rb = Math.ceil(g.reboundT / 1000);
  if (rb !== hud.reb) { hud.reb = rb; const el = $('badge-rebound'); el.style.display = rb > 0 ? 'block' : 'none'; if (rb > 0) el.textContent = `Rebound: tıkanıklık geri tepiyor · ${rb} sn`; }
}
export function resetHud() { for (const k in hud) (hud as Record<string, unknown>)[k] = k === 'cycAnnounced' ? false : null; hud.score = hud.level = hud.lines = hud.cong = hud.mult = hud.reb = -1; }

/** Tehlike vinyetini gizler. */
export function hideDanger() { $('danger').classList.remove('on'); }
/** pause() tarafından çağrılır (vinyet önbelleğini sıfırlar; NS4-01 Not A davranışı bilerek korunur). */
export function forgetDanger() { hud.danger = null; }

// Güç butonu alt etiketleri
export function resetSynLabel() { $('syn-sub').textContent = 'Hızlı ama geri tepebilir'; }
export function showSynUses(n: number) { $('syn-sub').textContent = `Kullanım: ${n}`; }
export function showCycUsed() { $('cyc-sub').textContent = 'Bu oyunda kullanıldı'; }

/** computeLayout() sonucuna göre DOM HUD elemanlarını yerleştirir (Pixi tarafı View.layout'tadır). */
export function applyHudLayout(L: Layout) {
  place($('board-bg'), L.board);
  $('board-bg').style.backgroundSize = L.cell + 'px ' + L.cell + 'px';
  place($('meter'), L.meter);
  const ml = $('meter-lbl');
  ml.style.left = (L.meter.x - 18) + 'px'; ml.style.top = (L.meter.y + L.meter.h - 80) + 'px';
  ml.style.display = L.portrait ? 'none' : '';
  place($('hold-bg'), L.hold); place($('next-bg'), L.next);
  const lh = $('lbl-hold'), ln = $('lbl-next');
  lh.style.left = (L.hold.x + 12) + 'px'; lh.style.top = (L.hold.y + 6) + 'px';
  ln.style.left = (L.next.x + 12) + 'px'; ln.style.top = (L.next.y + 6) + 'px';
  place($('stats'), L.stats);
  $('stats').classList.toggle('compact', !!L.compactStats);
  place($('btn-hold'), L.btnHold); place($('btn-cyc'), L.btnCyc); place($('btn-syn'), L.btnSyn); place($('btn-pause'), L.btnPause);
  ['btn-hold', 'btn-cyc', 'btn-syn'].forEach((id) => $(id).classList.toggle('compact-btn', L.compactBtns));
  const pop = $('popups'); place(pop, { x: L.board.x, y: L.board.y + L.board.h * 0.22, w: L.board.w, h: L.board.h * 0.4 });
  $('toast').style.top = (L.board.y + 8) + 'px';
  $('toast').style.left = (L.board.x + L.board.w / 2) + 'px';
  $('toast').style.maxWidth = Math.max(180, L.board.w - 16) + 'px';
  const br = $('badge-rebound'), bm = $('badge-mult');
  br.style.left = bm.style.left = (L.board.x + L.board.w / 2) + 'px';
  br.style.top = (L.board.y + L.board.h - 40) + 'px';
  bm.style.top = (L.board.y + L.board.h - 74) + 'px';
}
