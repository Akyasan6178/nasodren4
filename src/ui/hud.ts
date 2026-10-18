/* =====================================================================
   HUD: skor/seviye/drenaj, tıkanıklık metresi, güç butonları, sayaç rozetleri
   ve layout sonrası DOM yerleşimi. Oyun kuralı hesaplamaz; Game'den okur.
   NS4-03: main.ts'ten taşındı; eşikler değişmedi. NS4-07: güçlendirici durum metinleri ui/powerups.ts'te.
   ===================================================================== */
import { $, place } from './dom';
import { toast, clearNotifications } from './notifications';
import { track } from '../analytics/analytics';
import { HEALTH_TOASTS } from '../content/health';
import {
  CYC_NAME,
  CYC_SHORT,
  CYC_TEXT,
  SYN_NAME,
  SYN_SHORT,
  SYN_TEXT,
  cycState,
  synState,
  type CycState,
  type SynState,
} from './powerups';
import type { Game } from '../game/Game';
import type { Layout } from '../types/layout';

/** Son yazılan değerler: yalnızca değişen değerler DOM'a yazılır (-1 / null = henüz yazılmadı). */
interface HudCache {
  score: number;
  level: number;
  lines: number;
  cong: number;
  cyc: boolean | null;
  syn: boolean | null;
  mult: number;
  reb: number;
  danger: boolean | null;
  cycState: CycState | null;
  synState: SynState | null;
  /** "Sıklamen özütü hazır" toast'u bu oyunda gösterildi mi. */
  cycAnnounced: boolean;
  /** NS4-19: sentetik açıcı bu oyunda ilk kez kullanılabilir oldu mu (analitik bir kez). */
  synAnnounced: boolean;
}

function initialHud(): HudCache {
  return {
    score: -1,
    level: -1,
    lines: -1,
    cong: -1,
    cyc: null,
    syn: null,
    mult: -1,
    reb: -1,
    danger: null,
    cycState: null,
    synState: null,
    cycAnnounced: false,
    synAnnounced: false,
  };
}
const hud: HudCache = initialHud();

export function fmt(n: number): string {
  return n.toLocaleString('tr-TR');
}

/** `playing`: uygulama durumu 'playing' mi (tehlike vinyeti yalnızca oynarken açılır). */
export function updateHud(g: Game, playing: boolean): void {
  if (g.score !== hud.score) {
    hud.score = g.score;
    $('hud-score').textContent = fmt(g.score);
  }
  if (g.level !== hud.level) {
    hud.level = g.level;
    $('hud-level').textContent = String(g.level);
  }
  if (g.lines !== hud.lines) {
    hud.lines = g.lines;
    $('hud-lines').textContent = String(g.lines);
  }
  const cg = Math.round(g.congestion() * 100) / 100;
  if (cg !== hud.cong) {
    hud.cong = cg;
    $('meter-cover').style.transform = `scaleY(${1 - cg})`;
  }
  // NS4-06: vinyet her karede değerlendirilir (önceden yalnızca tıkanıklık değişince). pause() önbelleği
  // sıfırladığı için resume sonrası ilk karede mevcut tıkanıklığa göre yeniden açılır (NS4-01 Not A).
  const d = cg >= 0.7 && playing;
  if (d !== hud.danger) {
    hud.danger = d;
    $('danger').classList.toggle('on', d);
  }
  const cyc = g.canCyc(),
    syn = g.canSyn();
  if (cyc !== hud.cyc) {
    hud.cyc = cyc;
    $('btn-cyc', HTMLButtonElement).disabled = !cyc;
    $('btn-cyc').classList.toggle('ready', cyc);
    if (cyc && !hud.cycAnnounced) {
      hud.cycAnnounced = true;
      toast(HEALTH_TOASTS.cyclamenReady.text);
      track('cyclamen_available', { level: g.level, congestion: cg });
    }
  }
  if (syn !== hud.syn) {
    hud.syn = syn;
    $('btn-syn', HTMLButtonElement).disabled = !syn;
    $('btn-syn').classList.toggle('ready', syn && g.synUses === 0);
    if (syn && !hud.synAnnounced) {
      hud.synAnnounced = true;
      track('synthetic_available', { level: g.level, congestion: cg });
    }
  }
  // NS4-07: buton durumu (kilitli / hazır / kullanıldı / aktif etki / rebound riski) ve alt metni
  const cs = cycState(g, playing);
  if (cs !== hud.cycState) {
    hud.cycState = cs;
    renderPowerup('cyc', cs);
  }
  const ss = synState(g, playing);
  if (ss !== hud.synState) {
    hud.synState = ss;
    renderPowerup('syn', ss);
  }
  // NS4-06: oyun bitince (playing=false) ×2 ve Rebound sayaçları gösterilmez; game-over ekranının arkasında
  // donmuş süre kalmaz (NS4-01 Not C). Yeni oyunda resetHud() önbelleği sıfırlar.
  const m = playing ? Math.ceil(g.multT / 1000) : 0;
  if (m !== hud.mult) {
    hud.mult = m;
    const el = $('badge-mult');
    el.style.display = m > 0 ? 'block' : 'none';
    if (m > 0) el.textContent = `Ferah nefes ×2 · ${m} sn`;
  }
  const rb = playing ? Math.ceil(g.reboundT / 1000) : 0;
  if (rb !== hud.reb) {
    hud.reb = rb;
    const el = $('badge-rebound');
    el.style.display = rb > 0 ? 'block' : 'none';
    if (rb > 0) el.textContent = `Rebound: tıkanıklık geri tepiyor · ${rb} sn`;
  }
}
/**
 * Önbelleği sıfırlar (yeni oyun). NS4-04: eski for…in döngüsüyle aynı sonuç: sayılar -1, bayraklar null,
 * cycAnnounced false (eskiden ilk oyunda tanımsızdı; ikisi de "gösterilmedi" anlamına gelir).
 */
export function resetHud(): void {
  Object.assign(hud, initialHud());
}

/**
 * Güçlendirici butonunun durumunu yazar: data-state (stil), uzun alt metin (geniş düzen), kısa etiket (dar düzen)
 * ve erişilebilir ad. NS4-10: durum yalnızca renkle değil, her düzende metinle de okunur.
 */
function renderPowerup(kind: 'cyc', state: CycState): void;
function renderPowerup(kind: 'syn', state: SynState): void;
function renderPowerup(kind: 'cyc' | 'syn', state: CycState | SynState): void {
  const [text, short, name] =
    kind === 'cyc'
      ? [CYC_TEXT[state as CycState], CYC_SHORT[state as CycState], CYC_NAME]
      : [SYN_TEXT[state as SynState], SYN_SHORT[state as SynState], SYN_NAME];
  const b = $(kind === 'cyc' ? 'btn-cyc' : 'btn-syn');
  b.dataset['state'] = state;
  b.setAttribute('aria-label', `${name}: ${text}`);
  $(kind + '-sub').textContent = text;
  $(kind + '-chip').textContent = short;
}

/** Tehlike vinyetini gizler. */
export function hideDanger(): void {
  $('danger').classList.remove('on');
}
/** pause() tarafından çağrılır: vinyet önbelleğini sıfırlar; resume sonrası ilk updateHud vinyeti yeniden hesaplar. */
export function forgetDanger(): void {
  hud.danger = null;
}

/**
 * NS4-07: oturumun geçici HUD durumlarını temizler (×2 / Rebound rozetleri, tehlike vinyeti, toast, popup)
 * ve önbelleği sıfırlar; sonraki updateHud her şeyi yeniden yazar. Ana menüye dönüşte ve yeni oyunda çağrılır.
 */
export function clearSessionHud(): void {
  $('badge-mult').style.display = 'none';
  $('badge-rebound').style.display = 'none';
  // güçlendirici butonları menünün arkasında eski oyunun durumunu göstermez (yeni oyun başlangıç durumu)
  for (const id of ['btn-cyc', 'btn-syn'] as const) {
    const b = $(id, HTMLButtonElement);
    b.disabled = true;
    b.classList.remove('ready');
  }
  renderPowerup('cyc', 'locked');
  renderPowerup('syn', 'locked');
  hideDanger();
  clearNotifications();
  resetHud();
}

/**
 * NS4-16: HUD yazı ölçeği. Yatay düzende tahta hücresiyle orantılı büyür (40 px hücreye kadar 1, en çok 1,4);
 * portrede (telefon/tablet) her zaman 1 — mobil ölçüler değişmez. CSS --hud-scale ile çarpılır.
 * Örnek: 1366×768 → 1, 1600×900 → ~1,08, 1920×1080 → 1,3, 2560×1440 → 1,4.
 */
export const HUD_SCALE_BASE_CELL = 40;
export const HUD_SCALE_MAX = 1.4;
export function hudScale(L: Pick<Layout, 'portrait' | 'cell'>): number {
  if (L.portrait) return 1;
  return Math.min(HUD_SCALE_MAX, Math.max(1, L.cell / HUD_SCALE_BASE_CELL));
}

/** computeLayout() sonucuna göre DOM HUD elemanlarını yerleştirir (Pixi tarafı View.layout'tadır). */
export function applyHudLayout(L: Layout): void {
  $('stage').style.setProperty('--hud-scale', hudScale(L).toFixed(3));
  place($('board-bg'), L.board);
  $('board-bg').style.backgroundSize = L.cell + 'px ' + L.cell + 'px';
  place($('meter'), L.meter);
  const ml = $('meter-lbl');
  ml.style.left = L.meter.x - 18 + 'px';
  ml.style.top = L.meter.y + L.meter.h - 80 + 'px';
  ml.style.display = L.portrait ? 'none' : '';
  place($('hold-bg'), L.hold);
  place($('next-bg'), L.next);
  const lh = $('lbl-hold'),
    ln = $('lbl-next');
  lh.style.left = L.hold.x + 12 + 'px';
  lh.style.top = L.hold.y + 6 + 'px';
  ln.style.left = L.next.x + 12 + 'px';
  ln.style.top = L.next.y + 6 + 'px';
  place($('stats'), L.stats);
  $('stats').classList.toggle('compact', !!L.compactStats);
  place($('btn-hold'), L.btnHold);
  place($('btn-cyc'), L.btnCyc);
  place($('btn-syn'), L.btnSyn);
  place($('btn-pause'), L.btnPause);
  ['btn-hold', 'btn-cyc', 'btn-syn'].forEach((id) => $(id).classList.toggle('compact-btn', L.compactBtns));
  const pop = $('popups');
  place(pop, { x: L.board.x, y: L.board.y + L.board.h * 0.22, w: L.board.w, h: L.board.h * 0.4 });
  $('toast').style.top = L.board.y + 8 + 'px';
  $('toast').style.left = L.board.x + L.board.w / 2 + 'px';
  $('toast').style.maxWidth = Math.max(180, L.board.w - 16) + 'px';
  // NS4-10: ×2 / Rebound rozetleri tahta genişliğinde bir sütunda, tahtanın alt kenarına hizalı; dar tahtada
  // metin satır kırar ve tahtanın dışına taşmaz (önceki konum: alt kenardan 40 / 74 px yukarıda, ortalı).
  const fx = $('fx-badges');
  fx.style.left = L.board.x + 8 + 'px';
  fx.style.width = L.board.w - 16 + 'px';
  fx.style.top = 'auto';
  fx.style.bottom = L.H - (L.board.y + L.board.h) + 10 + 'px';
}
