// NS4-09: bilgi kartları. Kart açma (yerel ilerlemeye yazar + analitik), kart görünümü ve albüm ekranı.
// Kart metinleri content/cards.ts içindedir; burada yalnızca textContent ile yazılır.
import { CARDS, CARD_ORDER } from '../content/cards';
import { meta, saveMeta } from '../storage/progress';
import { track } from '../analytics/analytics';
import { $ } from './dom';
import type { CardId, InfoCard } from '../types/content';

/** Kart simgeleri (statik SVG). */
const ICONS: Readonly<Record<InfoCard['icon'], string>> = {
  sinus:
    '<path d="M32 10c-9 0-16 7-16 16 0 7 3 10 3 16 0 6 6 12 13 12s13-6 13-12c0-6 3-9 3-16 0-9-7-16-16-16z" fill="#ffd3e6"/><path d="M22 30c3-4 7-4 10 0M32 30c3-4 7-4 10 0" stroke="#d6337f" stroke-width="3" fill="none" stroke-linecap="round"/><ellipse cx="25" cy="40" rx="5" ry="4" fill="#cbd35a"/><ellipse cx="39" cy="40" rx="5" ry="4" fill="#cbd35a"/>',
  skull:
    '<circle cx="32" cy="28" r="18" fill="#ffd3e6"/><rect x="22" y="40" width="20" height="12" rx="4" fill="#ffd3e6"/><circle cx="25" cy="29" r="4" fill="#d6337f"/><circle cx="39" cy="29" r="4" fill="#d6337f"/><path d="M27 15h10" stroke="#cbd35a" stroke-width="5" stroke-linecap="round"/>',
  cilia:
    '<rect x="8" y="40" width="48" height="10" rx="5" fill="#ffd3e6"/><g stroke="#d6337f" stroke-width="3" stroke-linecap="round" fill="none"><path d="M14 40c0-8 4-12 2-18"/><path d="M24 40c0-8 4-12 2-18"/><path d="M34 40c0-8 4-12 2-18"/><path d="M44 40c0-8 4-12 2-18"/></g><circle cx="50" cy="20" r="6" fill="#cbd35a"/>',
  virus:
    '<g fill="#6fc24c"><circle cx="32" cy="32" r="14"/><circle cx="32" cy="12" r="4"/><circle cx="32" cy="52" r="4"/><circle cx="12" cy="32" r="4"/><circle cx="52" cy="32" r="4"/><circle cx="18" cy="18" r="4"/><circle cx="46" cy="46" r="4"/><circle cx="46" cy="18" r="4"/><circle cx="18" cy="46" r="4"/></g><circle cx="27" cy="30" r="3" fill="#fff"/><circle cx="37" cy="30" r="3" fill="#fff"/><path d="M26 38q6 5 12 0" stroke="#1d2b16" stroke-width="2.5" fill="none"/>',
  doctor:
    '<rect x="12" y="14" width="40" height="38" rx="10" fill="#d9f4f1"/><path d="M32 22v20M22 32h20" stroke="#0f9e93" stroke-width="7" stroke-linecap="round"/>',
  flower:
    '<g fill="#d6337f"><path d="M32 8c6 6 7 13 3 20-4-3-7-3-10 .3C21.6 21 24 14 32 8z"/><path d="M13 18c8.6.6 14.4 5.3 15.2 12.8-5 .6-7 2.7-7.8 7.5C13.6 34.4 11.3 27 13 18z" opacity=".85"/><path d="M51 18c1.7 9-.6 16.4-7.4 20.3-.7-4.8-2.8-6.9-7.8-7.5C36.6 23.3 42.4 18.6 51 18z" opacity=".85"/></g><path d="M32 33c0 9-1.8 15-6 21" stroke="#1d9a6c" stroke-width="4" fill="none" stroke-linecap="round"/>',
  spray:
    '<rect x="20" y="24" width="18" height="30" rx="6" fill="#ffb1b8"/><path d="M24 24v-8h10v8M34 16h7l3-3" stroke="#cf3f2b" stroke-width="3" fill="none" stroke-linecap="round"/><g fill="#cf3f2b"><circle cx="50" cy="10" r="2"/><circle cx="54" cy="16" r="2"/><circle cx="50" cy="20" r="2"/></g>',
  nose: '<path d="M30 10c-4 10-10 22-12 30-1 6 4 10 10 10h10c5 0 7-4 5-7" stroke="#d6337f" stroke-width="4" fill="#ffd3e6" stroke-linecap="round" stroke-linejoin="round"/><g fill="#3fd2de"><circle cx="48" cy="22" r="3"/><circle cx="54" cy="30" r="2.5"/><circle cx="50" cy="37" r="2"/></g>',
  water:
    '<path d="M32 8c10 13 16 22 16 30a16 16 0 0 1-32 0c0-8 6-17 16-30z" fill="#3fd2de"/><path d="M24 38a8 8 0 0 0 8 8" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>',
};

export function unlockedCards(): readonly CardId[] {
  return meta.cards ?? [];
}

/** Kartı açar; yeni açıldıysa true. */
export function unlockCard(id: CardId): boolean {
  const list = (meta.cards ??= []);
  if (list.includes(id)) return false;
  list.push(id);
  saveMeta();
  track('card_unlock', { id });
  return true;
}

/** Kart görünümünü `box` içine kurar. */
export function renderCard(box: HTMLElement, id: CardId): void {
  const c = CARDS[id];
  box.textContent = '';
  const ico = document.createElement('div');
  ico.className = 'card-ico';
  ico.innerHTML = `<svg viewBox="0 0 64 64" aria-hidden="true">${ICONS[c.icon]}</svg>`;
  const h = document.createElement('h3');
  h.textContent = c.title;
  const p = document.createElement('p');
  p.textContent = c.body;
  const src = document.createElement('small');
  src.className = 'src';
  src.textContent = 'Kaynak: ' + c.source;
  box.append(ico, h, p, src);
}

/** Albüm: açık kartlar dokunulabilir, kapalılar soru işareti. `open` detay ekranını açar. */
export function renderAlbum(grid: HTMLElement, open: (id: CardId) => void): void {
  grid.textContent = '';
  const have = unlockedCards();
  for (const id of CARD_ORDER) {
    const b = document.createElement('button');
    const on = have.includes(id);
    b.className = 'tile' + (on ? '' : ' locked');
    if (on) {
      b.innerHTML = `<svg viewBox="0 0 64 64" aria-hidden="true">${ICONS[CARDS[id].icon]}</svg>`;
      const t = document.createElement('span');
      t.textContent = CARDS[id].title;
      b.append(t);
      b.addEventListener('click', () => open(id));
    } else {
      b.textContent = '?';
      b.disabled = true;
      b.setAttribute('aria-label', 'Henüz açılmadı');
    }
    grid.append(b);
  }
  $('cards-count').textContent = `${have.length} / ${CARD_ORDER.length}`;
}
