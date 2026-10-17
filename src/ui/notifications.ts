// Toast (tekil, zamanlı) ve popup (en fazla 3, CSS animasyonu bitince kaldırılır) bildirimleri.
import { $ } from './dom';

let toastTimer = 0;
export function toast(msg: string, ms?: number) {
  const t = $('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), ms || 2600);
}

export function popup(big: string, sub?: string, cls?: string) {
  const box = $('popups');
  while (box.childElementCount > 2) box.firstChild!.remove();
  const d = document.createElement('div'); d.className = 'pop ' + (cls || '');
  d.innerHTML = `<span class="big"></span>${sub ? '<span class="sub"></span>' : ''}`;
  d.querySelector('.big')!.textContent = big; if (sub) d.querySelector('.sub')!.textContent = sub;
  box.appendChild(d);
  d.addEventListener('animationend', () => d.remove());
}
