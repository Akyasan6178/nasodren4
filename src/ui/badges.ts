// Rozet kazanma (yerel ilerlemeye yazar, toast + analitik) ve oyun sonu rozet listesi.
// NS4-03: main.ts'ten taşındı. NS4-06: meta.badges yüklemede doğrulanır (storage/progress.ts).
import { BADGES, BADGE_IDS } from '../content/badges';
import { meta, saveMeta } from '../storage/progress';
import { track } from '../analytics/analytics';
import { toast } from './notifications';
import type { BadgeId } from '../types/content';

/** Bu oyunda yeni kazanılan rozetler (oyun sonunda 'new' olarak vurgulanır). */
let newBadges: BadgeId[] = [];
export function resetNewBadges(): void {
  newBadges = [];
}

export function award(id: BadgeId): void {
  if (meta.badges.includes(id)) return;
  meta.badges.push(id);
  newBadges.push(id);
  saveMeta();
  toast(`Rozet kazandın: ${BADGES[id].name}`, 3000);
  track('badge', { id });
}

/** NS4-16: rozet durumu (oyun sonu listesi): bu oyunda yeni / önceden kazanılmış / kilitli. */
export type BadgeState = 'new' | 'earned' | 'locked';
/** NS4-17: durumun ekran okuyucu metni (görünmez; .sr-only). Rozet adından sonra okunur. */
export const BADGE_STATE_LABEL: Readonly<Record<BadgeState, string>> = {
  new: ', bu oyunda kazanıldı',
  earned: ', kazanıldı',
  locked: ', kilitli',
};
export function badgeState(id: BadgeId, earned: readonly BadgeId[], fresh: readonly BadgeId[]): BadgeState {
  return fresh.includes(id) ? 'new' : earned.includes(id) ? 'earned' : 'locked';
}

/** `earned` / `fresh` yalnızca dev ekran gösterimi içindir (storage'a dokunmadan örnek durum); oyunda verilmez. */
export function renderBadges(
  bx: HTMLElement,
  earned: readonly BadgeId[] = meta.badges,
  fresh: readonly BadgeId[] = newBadges,
): void {
  bx.innerHTML = '';
  for (const id of BADGE_IDS) {
    const s = document.createElement('span');
    const st = badgeState(id, earned, fresh);
    s.className = st;
    s.dataset['state'] = st;
    // NS4-17: liste öğesi; içerik "ad + durum" olarak okunur (durum yalnızca ekran okuyucuya, .sr-only).
    // Açıklama ipucu (title) ad öğesindedir: liste öğesinde olsaydı erişilebilir ad yerine geçerdi.
    s.setAttribute('role', 'listitem');
    const name = document.createElement('span');
    name.textContent = BADGES[id].name;
    name.title = BADGES[id].desc;
    const sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = BADGE_STATE_LABEL[st];
    s.append(name, sr);
    bx.appendChild(s);
  }
}
