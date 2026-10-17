// Rozet kazanma (yerel ilerlemeye yazar, toast + analitik) ve oyun sonu rozet listesi.
// NS4-03: main.ts'ten taşındı. meta.badges doğrulaması (NS4-01 #6) bilerek eklenmedi.
import { BADGES } from '../content/badges';
import { meta, saveMeta } from '../storage/progress';
import { track } from '../analytics/analytics';
import { toast } from './notifications';

/** Bu oyunda yeni kazanılan rozetler (oyun sonunda 'new' olarak vurgulanır). */
let newBadges: string[] = [];
export function resetNewBadges() { newBadges = []; }

export function award(id: string) {
  if (meta.badges.includes(id)) return;
  meta.badges.push(id); newBadges.push(id); saveMeta();
  toast(`Rozet kazandın: ${BADGES[id].name}`, 3000);
  track('badge', { id });
}

export function renderBadges(bx: HTMLElement) {
  bx.innerHTML = '';
  for (const id in BADGES) {
    const s = document.createElement('span');
    const has = meta.badges.includes(id);
    s.className = newBadges.includes(id) ? 'new' : has ? '' : 'locked';
    s.textContent = BADGES[id].name; s.title = BADGES[id].desc;
    bx.appendChild(s);
  }
}
