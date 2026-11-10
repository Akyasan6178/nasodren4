/* =====================================================================
   NS4-44 · VİRÜS AVI HUD: mod görünürlüğü (#app[data-mode]), lens paneli
   (üç virüs türü, kalan sayıları ve tepkileri), süre / kalan virüs kartı,
   skor ve bölüm. Klasik HUD (hud.ts) bu modda CSS ile gizlenir.
   ===================================================================== */
import { $, place } from '../ui/dom';
import type { Layout, Rect } from '../types/layout';
import { VIRUS_CFG } from './config';
import { VIRUS_TEXT } from './copy';
import type { VirusGame } from './VirusGame';

export type GameMode = 'classic' | 'virus';

/** Lens: portrede Beklet paneli yeri (üst şerit, sol); yatayda sol sütunun üstü, skor kartına kadar. */
export function lensRect(L: Layout): Rect {
  if (L.portrait) return L.hold;
  return { x: L.hold.x, y: L.hold.y, w: L.hold.w, h: L.stats.y - L.hold.y - 8 };
}

export function setMode(mode: GameMode): void {
  $('app').dataset['mode'] = mode;
}

/** Süre metni m:ss (yukarı yuvarlanmış saniye). */
export function formatTime(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Lensin "tahta doluyor" eşiği (dolu hücre oranı). */
const GIGGLE_FILL = 0.6;
const FLINCH_MS = 300;

export interface VirusHud {
  layout(L: Layout): void;
  sync(g: VirusGame, playing: boolean): void;
  react(e: 'flinch' | 'gone' | 'back', type: number): void;
  reset(): void;
}

export function createVirusHud(): VirusHud {
  const timers: (ReturnType<typeof setTimeout> | undefined)[] = [undefined, undefined, undefined];
  const lensV = (t: number) => $(`lens-${t}`);
  let last = '';
  return {
    layout(L) {
      place($('virus-lens'), lensRect(L));
      $('virus-lens').classList.toggle('compact', L.portrait);
      place($('virus-card'), L.cong);
      $('virus-card').classList.toggle('wide', !L.portrait);
    },
    sync(g, playing) {
      const rem = g.remaining();
      const warn = !g.tutorial && g.timeLeftMs < VIRUS_CFG.warnMs;
      const key = [g.score, g.level, g.tutorial, Math.ceil(g.timeLeftMs / 1000), ...rem, warn, playing].join('|');
      const giggle = playing && (warn || g.fill() > GIGGLE_FILL);
      $('virus-lens').classList.toggle('is-giggle', giggle);
      if (key === last) return;
      last = key;
      $('virus-time').textContent = g.tutorial ? '–' : formatTime(g.timeLeftMs);
      const card = $('virus-card');
      if (warn) card.dataset['warn'] = '1';
      else delete card.dataset['warn'];
      $('virus-left').textContent = String(rem[0] + rem[1] + rem[2]);
      $('virus-level').textContent = g.tutorial ? VIRUS_TEXT.tutorialLevel : String(g.level);
      $('hud-score').textContent = g.score.toLocaleString('tr-TR');
      rem.forEach((n, t) => {
        $(`lens-n-${t}`).textContent = String(n);
        lensV(t).classList.toggle('is-gone', n === 0);
      });
    },
    react(e, type) {
      if (e === 'back') {
        for (let t = 0; t < 3; t++) lensV(t).classList.remove('is-gone', 'is-flinch');
        return;
      }
      const el = lensV(type);
      if (e === 'gone') {
        el.classList.add('is-gone');
        return;
      }
      el.classList.add('is-flinch');
      clearTimeout(timers[type]);
      timers[type] = setTimeout(() => el.classList.remove('is-flinch'), FLINCH_MS);
    },
    reset() {
      last = '';
      for (let t = 0; t < 3; t++) {
        clearTimeout(timers[t]);
        lensV(t).classList.remove('is-gone', 'is-flinch');
      }
      $('virus-lens').classList.remove('is-giggle');
    },
  };
}
