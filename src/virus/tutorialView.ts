// NS4-44: Virüs Avı öğretici kartı: Doktor Elif çizimi + konuşma balonu, adım sayacı, "Atla" ve "Devam".
// Oyun alanını kapatmaz (yerleşim klasik öğreticiyle aynı: tutorialRect); odak çalmaz, metin aria-live ile duyurulur.
import { $ } from '../ui/dom';
import { tutorialRect } from '../rendering/layout';
import type { Layout } from '../types/layout';
import { VIRUS_TUT_LABELS } from './copy';
import { NARRATOR } from './elif';
import type { VirusTutorialView, VirusTutShow } from './tutorial';

export interface VirusTutorialDomView extends VirusTutorialView {
  layout(L: Layout): void;
}

export function createVirusTutorialView(handlers: {
  readonly skip: () => void;
  readonly next: () => void;
}): VirusTutorialDomView {
  $('vt-skip').addEventListener('click', handlers.skip);
  $('vt-next').addEventListener('click', handlers.next);
  let pose = '';
  return {
    show(s: VirusTutShow) {
      const card = $('virus-tut');
      card.dataset['step'] = s.step;
      if (s.pose !== pose) {
        pose = s.pose;
        $('vt-elif').innerHTML = NARRATOR.svg(s.pose);
      }
      $('vt-step').textContent = `${VIRUS_TUT_LABELS.step} · ${s.index + 1}/${s.total}`;
      $('vt-text').textContent = s.text;
      $('vt-next').hidden = !s.next;
      card.hidden = false;
    },
    hide() {
      $('virus-tut').hidden = true;
    },
    layout(L: Layout) {
      const r = tutorialRect(L);
      const card = $('virus-tut');
      card.dataset['place'] = r.place;
      card.style.left = r.x + 'px';
      card.style.top = r.y + 'px';
      card.style.width = r.w + 'px';
      card.style.maxHeight = r.h + 'px';
    },
  };
}
