// Overlay ekranları: göster/gizle, alt ekran yığını, ipucu kutuları, oyun sonu ekranı.
// NS4-03: main.ts'ten taşındı. NS4-06: Escape alt ekranı closeSub() ile kapatır (NS4-01 Not B düzeltildi).
// NS4-09: başlangıç menüsü (devam edilecek bölüm), sinüs haritası, bölüm sonu (yıldız + yeni kart),
// bilgi kartı albümü ve kart ayrıntısı.
import { TIPS } from '../content/tips';
import { SINUSES, SINUS_ORDER, STAGES } from '../content/stages';
import { CARD_ORDER } from '../content/cards';
import { meta } from '../storage/progress';
import { $ } from './dom';
import { fmt } from './hud';
import { renderBadges } from './badges';
import { renderAlbum, renderCard, unlockedCards } from './cards';
import type { CardId } from '../types/content';

export type ScreenId =
  'scr-start' | 'scr-how' | 'scr-pause' | 'scr-over' | 'scr-set' | 'scr-map' | 'scr-win' | 'scr-cards' | 'scr-card';
export type TipBoxId = 'tip-start' | 'tip-pause' | 'tip-over';

let tipIdx = 0;
/** Rastgele başlangıç ipucu. Orijinalde Game oluşturulduktan sonra çekiliyordu; bootstrap aynı noktada çağırır. */
export function initTips(): void {
  tipIdx = (Math.random() * TIPS.length) | 0;
}
export function setTip(id: TipBoxId): void {
  const [title, body] = TIPS[tipIdx++ % TIPS.length];
  // NS4-04: '<b></b><span></span>' + querySelector! yerine aynı yapı doğrudan kurulur
  const b = document.createElement('b');
  b.textContent = title;
  const s = document.createElement('span');
  s.textContent = body;
  const box = $(id);
  box.textContent = '';
  box.append(b, s);
}

/** Alt ekran yığını: [data-back] önceki ekrana döner (açık ekran yoksa undefined saklanır). */
const screenStack: (string | undefined)[] = [];
export function show(id: string | null | undefined): void {
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('on'));
  const ae = document.activeElement;
  if (ae instanceof HTMLElement || ae instanceof SVGElement) ae.blur();
  if (id) {
    const el = $(id);
    el.classList.add('on');
    const f = el.querySelector('[data-focus]') || el.querySelector('button,a');
    if (f instanceof HTMLElement) setTimeout(() => f.focus({ preventScroll: true }), 30);
  }
}
export function openSub(id: ScreenId): void {
  screenStack.push(document.querySelector('.screen.on')?.id);
  show(id);
}
/** Yığından önceki ekrana döner ([data-back] butonları ve Escape). */
function back(): void {
  show(screenStack.pop() || 'scr-start');
}
export function bindBackButtons(): void {
  document.querySelectorAll('[data-back]').forEach((b) => b.addEventListener('click', back));
}
/** Alt ekranlar: openSub() ile açılır, geri dönüşte açıldıkları ekrana döner. */
const SUB_SCREENS: readonly string[] = [
  'scr-how',
  'scr-set',
  'scr-map',
  'scr-cards',
  'scr-card',
] satisfies readonly ScreenId[];
/**
 * NS4-06: Açık bir alt ekran varsa geri butonu gibi kapatır ve true döner (Escape için).
 * Pause'dan açılan Ayarlar böylece önce pause ekranına döner (NS4-01 Not B).
 */
export function closeSub(): boolean {
  const id = document.querySelector('.screen.on')?.id;
  if (id === undefined || !SUB_SCREENS.includes(id)) return false;
  back();
  return true;
}
/** NS4-09: haritadan bölüm başlatılırken alt ekran yığını boşaltılır (oyun sonrası "geri" eski ekrana dönmez). */
export function clearScreenStack(): void {
  screenStack.length = 0;
}

/* ---------------- sinüs haritası ve ilerleme ---------------- */

/** Bölüm başına yıldız (kayıt yoksa 0). */
export function stageStars(): number[] {
  return STAGES.map((_, i) => meta.stages?.[i] ?? 0);
}
/** Oynanabilir mi: ilk bölüm her zaman, diğerleri bir öncekinden en az 1 yıldızla. */
export function stageUnlocked(i: number): boolean {
  return i === 0 || (stageStars()[i - 1] ?? 0) > 0;
}
/** Devam edilecek bölüm: geçilmemiş ilk bölüm; hepsi geçildiyse son bölüm. */
export function nextStage(): number {
  const i = stageStars().findIndex((s) => s === 0);
  return i < 0 ? STAGES.length - 1 : i;
}
export function stageLabel(i: number): string {
  const s = STAGES[i];
  return s ? `${SINUSES[s.sinus].name} · ${s.part}/2` : '';
}
function starText(n: number): string {
  return '★★★'.slice(0, n) + '☆☆☆'.slice(0, 3 - n);
}

/** Başlangıç menüsü: devam edilecek bölüm ve kart sayısı. */
export function renderStartMenu(): void {
  const allDone = stageStars().every((s) => s > 0);
  $('play-sub').textContent = allDone ? 'Bütün sinüsler açık · tekrar oyna' : stageLabel(nextStage());
  $('cards-badge').textContent = `${unlockedCards().length}/${CARD_ORDER.length}`;
}

/** Harita: yüz çiziminde açılan sinüsler boyanır, liste bölüm butonlarını ve yıldızları gösterir. */
export function renderMap(play: (stage: number) => void): void {
  const stars = stageStars();
  const next = nextStage();
  for (const id of SINUS_ORDER) {
    const idx = STAGES.map((s, i) => (s.sinus === id ? i : -1)).filter((i) => i >= 0);
    const done = idx.every((i) => (stars[i] ?? 0) > 0);
    document.querySelectorAll(`[data-sinus="${id}"]`).forEach((el) => {
      el.classList.toggle('done', done);
      el.classList.toggle('next', idx.includes(next) && !done);
    });
  }
  const list = $('map-list');
  list.textContent = '';
  for (const id of SINUS_ORDER) {
    const row = document.createElement('div');
    row.className = 'map-row';
    const name = document.createElement('div');
    name.className = 'map-name';
    const b = document.createElement('b');
    b.textContent = SINUSES[id].name;
    const w = document.createElement('span');
    w.textContent = SINUSES[id].where;
    name.append(b, w);
    row.append(name);
    STAGES.forEach((s, i) => {
      if (s.sinus !== id) return;
      const btn = document.createElement('button');
      const open = stageUnlocked(i);
      btn.className = 'map-stage' + (i === next ? ' next' : '');
      btn.disabled = !open;
      const t = document.createElement('small');
      t.textContent = `${s.part}. bölüm`;
      const v = document.createElement('span');
      v.textContent = open ? starText(stars[i] ?? 0) : 'kilitli';
      btn.append(t, v);
      btn.addEventListener('click', () => play(i));
      row.append(btn);
    });
    list.append(row);
  }
}

/* ---------------- bölüm sonu ---------------- */

export interface WinView {
  readonly stage: number;
  readonly stars: number;
  readonly score: number;
  readonly pieces: number;
  readonly germs: number;
  /** Bu bölümle açılan kart ve yeni mi. */
  readonly card: CardId;
  readonly newCard: boolean;
  readonly last: boolean;
}

export function renderWin(r: WinView): void {
  const s = STAGES[r.stage];
  const sinus = SINUSES[s.sinus].name;
  $('w-title').textContent = s.part === 2 ? `${sinus} açıldı!` : `${sinus}: yarısı açıldı!`;
  $('w-stars').textContent = starText(r.stars);
  $('w-score').textContent = fmt(r.score);
  $('w-pieces').textContent = String(r.pieces);
  $('w-germs').textContent = String(r.germs);
  $('w-card-lbl').textContent = r.newCard ? 'Yeni bilgi kartı!' : 'Bilgi kartı';
  renderCard($('w-card'), r.card);
  $('b-next').textContent = r.last ? 'Sinüs haritası' : 'Sonraki bölüm';
  show('scr-win');
}

/* ---------------- oyun sonu ---------------- */

export interface GameOverView {
  readonly score: number;
  readonly lines: number;
  readonly best: number;
  readonly isBest: boolean;
  /** NS4-09: bölüm modunda tıkanıklığın açılan oranı (serbest oyunda null). */
  readonly progress: number | null;
  /** Oturumda açılan ilk yeni kart. */
  readonly card: CardId | null;
}

export function renderGameOver(r: GameOverView): void {
  const adv = r.progress !== null;
  $('o-title').textContent = adv ? 'Sinüs yeniden tıkandı' : 'Sinüslerin tamamen tıkandı';
  $('o-score').textContent = fmt(r.score);
  $('o-lines').textContent = String(r.lines);
  $('o-best').textContent = adv ? `%${Math.round((r.progress ?? 0) * 100)}` : fmt(r.best);
  $('o-best-lbl').textContent = adv ? 'Açıldı' : 'Rekor';
  $('newbest').style.display = r.isBest && !adv ? 'block' : 'none';
  $('b-again').textContent = adv ? 'Tekrar dene' : 'Tekrar oyna';
  const cardBox = $('o-card');
  cardBox.style.display = r.card ? '' : 'none';
  $('o-card-lbl').style.display = r.card ? '' : 'none';
  if (r.card) renderCard(cardBox, r.card);
  renderBadges($('o-badges'));
  setTip('tip-over');
  show('scr-over');
}

/* ---------------- kart albümü ---------------- */

export function openAlbum(onView: (id: CardId) => void): void {
  renderAlbum($('album'), (id) => {
    renderCard($('card-detail'), id);
    onView(id);
    openSub('scr-card');
  });
  openSub('scr-cards');
}
