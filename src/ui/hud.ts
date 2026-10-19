/* =====================================================================
   HUD: skor/seviye/drenaj, tıkanıklık metresi, güç butonları, sayaç rozetleri
   ve layout sonrası DOM yerleşimi. Oyun kuralı hesaplamaz; Game'den okur.
   NS4-03: main.ts'ten taşındı. NS4-07: güçlendirici durum metinleri ui/powerups.ts'te.
   NS4-09: bölüm modunda sinüs adı, açıklık çubuğu ve kalan mikrop gösterilir;
   sıklamen gücü karakterin kendisidir (ruh hali + güç halkası, ui/hero.ts).
   ===================================================================== */
import { $, place } from './dom';
import { clearNotifications } from './notifications';
import { SYN_TEXT, chargePct, cycState, cycText, synState, type CycState, type SynState } from './powerups';
import { hideSay, resetHero, setBaseMood, setCharge, type Mood } from './hero';
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
  charge: number;
  /** Bölüm açıklığı (%) ve kalan mikrop. */
  prog: number;
  germs: number;
  mood: Mood | null;
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
    charge: -1,
    prog: -1,
    germs: -1,
    mood: null,
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
  if (g.stage) {
    const prog = Math.round(g.progress() * 100);
    if (prog !== hud.prog) {
      hud.prog = prog;
      $('hud-prog').style.transform = `scaleX(${prog / 100})`;
      $('hud-prog-txt').textContent = `%${prog} açık`;
    }
    const germs = g.germsLeft();
    if (germs !== hud.germs) {
      hud.germs = germs;
      $('hud-germs').textContent = String(germs);
    }
  }
  const cg = Math.round(g.congestion() * 100) / 100;
  if (cg !== hud.cong) {
    hud.cong = cg;
    $('meter-cover').style.transform = `scaleY(${1 - cg})`;
  }
  // NS4-06: vinyet her karede değerlendirilir. pause() önbelleği sıfırladığı için resume sonrası
  // ilk karede mevcut tıkanıklığa göre yeniden açılır (NS4-01 Not A).
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
  }
  if (syn !== hud.syn) {
    hud.syn = syn;
    $('btn-syn', HTMLButtonElement).disabled = !syn;
  }
  // NS4-07 / NS4-09: buton durumları, alt metinler, güç halkası
  const cs = cycState(g, playing),
    pct = chargePct(g);
  if (cs !== hud.cycState || pct !== hud.charge) {
    hud.cycState = cs;
    hud.charge = pct;
    $('btn-cyc').dataset['state'] = cs;
    $('btn-cyc').classList.toggle('ready', cs === 'ready');
    $('cyc-sub').textContent = cycText(cs, pct);
    setCharge(cs === 'off' ? 0 : pct / 100);
  }
  const ss = synState(g, playing);
  if (ss !== hud.synState) {
    hud.synState = ss;
    $('btn-syn').dataset['state'] = ss;
    // nabız yalnızca ilk kullanım öncesi hazır durumda
    $('btn-syn').classList.toggle('ready', ss === 'ready');
    $('syn-sub').textContent = SYN_TEXT[ss];
  }
  // Sıklamen'in sürekli ruh hali: güç hazırsa heyecanlı, tıkanıklık yüksekse endişeli
  const mood: Mood = !playing ? 'idle' : cs === 'ready' ? 'ready' : cg >= 0.6 ? 'worried' : 'idle';
  if (mood !== hud.mood) {
    hud.mood = mood;
    setBaseMood(mood);
  }
  // NS4-06: oyun bitince (playing=false) ×2 ve Rebound sayaçları gösterilmez (NS4-01 Not C).
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

/** Önbelleği sıfırlar (yeni oyun): sonraki updateHud her şeyi yeniden yazar. */
export function resetHud(): void {
  Object.assign(hud, initialHud());
}

/** NS4-09: üst paneli moda göre ayarlar (bölüm: sinüs adı + açıklık çubuğu; serbest: seviye + drenaj). */
export function setHudMode(stageLabel: string | null): void {
  $('stats').classList.toggle('adv', stageLabel !== null);
  $('hud-stage').textContent = stageLabel ?? '';
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
 * NS4-07: oturumun geçici HUD durumlarını temizler (×2 / Rebound rozetleri, tehlike vinyeti, toast, popup,
 * NS4-09: konuşma balonu ve karakter tepkisi) ve önbelleği sıfırlar. Ana menüye dönüşte ve yeni oyunda çağrılır.
 */
export function clearSessionHud(): void {
  $('badge-mult').style.display = 'none';
  $('badge-rebound').style.display = 'none';
  // güçlendirici butonları menünün arkasında eski oyunun durumunu göstermez (yeni oyun başlangıç durumu)
  for (const [id, sub, state, text] of [
    ['btn-cyc', 'cyc-sub', 'charging', cycText('charging', 0)],
    ['btn-syn', 'syn-sub', 'locked', SYN_TEXT.locked],
  ] as const) {
    const b = $(id, HTMLButtonElement);
    b.disabled = true;
    b.classList.remove('ready');
    b.dataset['state'] = state;
    $(sub).textContent = text;
  }
  hideDanger();
  clearNotifications();
  hideSay();
  resetHero();
  resetHud();
}

/** computeLayout() sonucuna göre DOM HUD elemanlarını yerleştirir (Pixi tarafı View.layout'tadır). */
export function applyHudLayout(L: Layout): void {
  place($('board-bg'), L.board);
  // NS4-09: ilk katman (boşluk parıltısı) tahtayı kaplar, sonraki iki katman hücre ızgarasıdır
  $('board-bg').style.backgroundSize = `100% 100%, ${L.cell}px ${L.cell}px, ${L.cell}px ${L.cell}px`;
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
  ['btn-hold', 'btn-syn'].forEach((id) => $(id).classList.toggle('compact-btn', L.compactBtns));
  $('btn-cyc').classList.toggle('big', !L.portrait);
  const pop = $('popups');
  place(pop, { x: L.board.x, y: L.board.y + L.board.h * 0.22, w: L.board.w, h: L.board.h * 0.4 });
  // NS4-09: konuşma balonu portrede üst panelin üstünde (oyun alanını kapatmaz), yatayda karakterin üstünde
  const say = $('say');
  if (L.portrait) {
    say.style.left = L.hold.x + 'px';
    say.style.top = L.hold.y + 'px';
    say.style.width = L.next.x + L.next.w - L.hold.x + 'px';
    say.style.bottom = '';
  } else {
    say.style.left = L.btnCyc.x + 'px';
    say.style.top = '';
    say.style.bottom = L.H - L.btnCyc.y + 4 + 'px';
    say.style.width = L.btnCyc.w + 'px';
  }
  say.classList.toggle('tail', !L.portrait);
  $('toast').style.top = L.board.y + 8 + 'px';
  $('toast').style.left = L.board.x + L.board.w / 2 + 'px';
  $('toast').style.maxWidth = Math.max(180, L.board.w - 16) + 'px';
  const br = $('badge-rebound'),
    bm = $('badge-mult');
  br.style.left = bm.style.left = L.board.x + L.board.w / 2 + 'px';
  br.style.top = L.board.y + L.board.h - 40 + 'px';
  bm.style.top = L.board.y + L.board.h - 74 + 'px';
}
