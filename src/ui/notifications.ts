// Toast (tekil, zamanlı) ve popup (en fazla 3, CSS animasyonu bitince kaldırılır) bildirimleri.
import { $ } from './dom';

let toastTimer: ReturnType<typeof window.setTimeout> | undefined;
export function toast(msg: string, ms?: number): void {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), ms || 2600);
}

/** NS4-07: görünen toast'u ve bekleyen popup'ları hemen kaldırır (ana menüye dönüş / yeni oyun). */
export function clearNotifications(): void {
  clearTimeout(toastTimer);
  toastTimer = undefined;
  $('toast').classList.remove('show');
  $('popups').replaceChildren();
}

/** <span class="cls">text</span> */
function span(cls: string, text: string): HTMLSpanElement {
  const s = document.createElement('span');
  s.className = cls;
  s.textContent = text;
  return s;
}

export function popup(big: string, sub?: string, cls?: string): void {
  const box = $('popups');
  // en fazla 3 popup: en eskileri kaldır (kutu yalnızca popup div'leri içerir)
  for (let first = box.firstElementChild; first && box.childElementCount > 2; first = box.firstElementChild)
    first.remove();
  const d = document.createElement('div');
  d.className = 'pop ' + (cls || '');
  // NS4-04: innerHTML şablonu + querySelector! yerine aynı DOM doğrudan kurulur (<span class="big">, isteğe bağlı <span class="sub">)
  d.appendChild(span('big', big));
  if (sub) d.appendChild(span('sub', sub));
  box.appendChild(d);
  d.addEventListener('animationend', () => d.remove());
}
