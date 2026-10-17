// Overlay ekranları: göster/gizle, alt ekran yığını, ipucu kutuları, oyun sonu ekranı.
// NS4-03: main.ts'ten taşındı. NS4-01 Not B (Ayarlar'da Esc) ve Not D (844×390 kart) bilerek korunur.
import { TIPS } from '../content/tips';
import { $ } from './dom';
import { fmt } from './hud';
import { renderBadges } from './badges';

export type ScreenId = 'scr-start' | 'scr-how' | 'scr-pause' | 'scr-over' | 'scr-set';
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
export function bindBackButtons(): void {
  document.querySelectorAll('[data-back]').forEach((b) =>
    b.addEventListener('click', () => {
      show(screenStack.pop() || 'scr-start');
    }),
  );
}

export interface GameOverView {
  readonly score: number;
  readonly lines: number;
  readonly best: number;
  readonly isBest: boolean;
}

export function renderGameOver(r: GameOverView): void {
  $('o-score').textContent = fmt(r.score);
  $('o-lines').textContent = String(r.lines);
  $('o-best').textContent = fmt(r.best);
  $('newbest').style.display = r.isBest ? 'block' : 'none';
  renderBadges($('o-badges'));
  setTip('tip-over');
  show('scr-over');
}
