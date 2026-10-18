// İlk oyun öğreticisi kartı (NS4-12). Oyun alanını kapatmayan küçük bir yönlendirme kartı: adım sayacı (metin),
// başlık, tek eylemlik anlatım, "Atla" ve son adımda "Tamam". Kart odak çalmaz; yalnızca butonları tıklanabilir,
// kartın geri kalanı işaretçi olaylarını oyuna bırakır. Metin değişimi aria-live ile duyurulur.
import { $ } from './dom';
import { STEP_COPY, type InputMode, type TutorialStep } from '../tutorial/steps';
import { tutorialRect } from '../rendering/layout';
import type { TutorialView } from '../tutorial/Tutorial';
import type { Layout } from '../types/layout';

export interface TutorialDomView extends TutorialView {
  /** computeLayout() sonucuna göre kartı yerleştirir. */
  layout(L: Layout): void;
}

export function createTutorialView(handlers: {
  readonly skip: () => void;
  readonly done: () => void;
}): TutorialDomView {
  $('tut-skip').addEventListener('click', handlers.skip);
  $('tut-done').addEventListener('click', handlers.done);
  return {
    show(step: TutorialStep, index: number, total: number, mode: InputMode, note?: string) {
      const card = $('tutorial');
      const copy = STEP_COPY[step];
      card.dataset['step'] = step;
      card.dataset['mode'] = mode;
      $('tut-step').textContent = `Öğretici · ${index + 1}/${total}`;
      $('tut-title').textContent = copy.title;
      const text = mode === 'touch' ? copy.touch : copy.keyboard;
      $('tut-text').textContent = note ? `${text} ${note}` : text;
      $('tut-done').hidden = step !== 'clear';
      card.hidden = false;
    },
    hide() {
      $('tutorial').hidden = true;
    },
    layout(L: Layout) {
      const r = tutorialRect(L);
      const card = $('tutorial');
      card.dataset['place'] = r.place;
      card.style.left = r.x + 'px';
      card.style.top = r.y + 'px';
      card.style.width = r.w + 'px';
      card.style.maxHeight = r.h + 'px';
    },
  };
}
