// İlk oyun öğreticisinin tamamlanma kaydı (fn_tutorial, NS4-12). Ayrı anahtar: fn_meta / fn_settings şemalarına
// alan eklenmez. Kayıt yoksa, okunamıyorsa veya biçimi bozuksa öğretici "tamamlanmamış" sayılır (oyun çökmez).
import { store } from './store';
import type { TutorialStore } from '../tutorial/Tutorial';

export const TUTORIAL_KEY = 'tutorial';

/** Yalnızca `{ "done": true }` tamamlanmış sayılır. */
export function isTutorialRecordDone(raw: unknown): boolean {
  return typeof raw === 'object' && raw !== null && !Array.isArray(raw) && 'done' in raw && raw.done === true;
}

export const tutorialStore: TutorialStore = {
  isDone: () => isTutorialRecordDone(store.get(TUTORIAL_KEY, null)),
  markDone: () => store.set(TUTORIAL_KEY, { done: true }),
};
