// Overlay ekranları: göster/gizle, alt ekran yığını, ipucu kutuları, oyun sonu ekranı.
// NS4-03: main.ts'ten taşındı. NS4-01 Not B (Ayarlar'da Esc) ve Not D (844×390 kart) bilerek korunur.
import { TIPS } from '../content/tips';
import { $ } from './dom';
import { fmt } from './hud';
import { renderBadges } from './badges';

let tipIdx = 0;
/** Rastgele başlangıç ipucu. Orijinalde Game oluşturulduktan sonra çekiliyordu; bootstrap aynı noktada çağırır. */
export function initTips() { tipIdx = (Math.random() * TIPS.length) | 0; }
export function setTip(id: string) { const t = TIPS[tipIdx++ % TIPS.length]; $(id).innerHTML = '<b></b><span></span>'; $(id).querySelector('b')!.textContent = t[0]; $(id).querySelector('span')!.textContent = t[1]; }

const screenStack: (string | undefined)[] = [];
export function show(id: string | null | undefined) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('on'));
  const ae = document.activeElement as HTMLElement | null;
  if (ae && ae.blur) ae.blur();
  if (id) { $(id).classList.add('on'); const f = $(id).querySelector<HTMLElement>('[data-focus]') || $(id).querySelector<HTMLElement>('button,a'); if (f) setTimeout(() => f.focus({ preventScroll: true }), 30); }
}
export function openSub(id: string) { screenStack.push(document.querySelector('.screen.on')?.id); show(id); }
export function bindBackButtons() {
  document.querySelectorAll('[data-back]').forEach((b) => b.addEventListener('click', () => { show(screenStack.pop() || 'scr-start'); }));
}

export function renderGameOver(r: { score: number; lines: number; best: number; isBest: boolean }) {
  $('o-score').textContent = fmt(r.score); $('o-lines').textContent = String(r.lines); $('o-best').textContent = fmt(r.best);
  $('newbest').style.display = r.isBest ? 'block' : 'none';
  renderBadges($('o-badges'));
  setTip('tip-over');
  show('scr-over');
}
