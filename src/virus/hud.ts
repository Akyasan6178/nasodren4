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
  // NS4-44 ek: yatayda sol sütun: üstte skor kartı, altında lens
  const y = L.hold.y + L.stats.h + 12;
  return { x: L.stats.x, y, w: L.stats.w, h: Math.min(L.stats.w, L.board.y + L.board.h - y) };
}

/** NS4-44 ek: Virüs Avı'nda skor kartı yatayda sol sütunun en üstüne çıkar (Beklet paneli bu modda yok). */
export function statsRect(L: Layout): Rect {
  return L.portrait ? L.stats : { x: L.stats.x, y: L.hold.y, w: L.stats.w, h: L.stats.h };
}

export function setMode(mode: GameMode): void {
  $('app').dataset['mode'] = mode;
}

/** Süre metni m:ss (yukarı yuvarlanmış saniye). */
export function formatTime(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** NS4-44 ek: lens tepkileri: kendi türü patlayınca yere yatıp ağlama, arada dalga geçme (ms). */
export const CRY_MS = 1600;
export const TAUNT_MS = 1300;
/** Dalga geçme aralığı: sakin / son saniyeler (türe göre kaydırılır, hepsi aynı anda olmasın). */
const TAUNT_EVERY = { calm: 6500, hurry: 2400 } as const;
const TAUNT_STAGGER = { calm: 1100, hurry: 500 } as const;

export interface VirusHud {
  layout(L: Layout): void;
  sync(g: VirusGame, playing: boolean): void;
  react(e: 'cry' | 'back', type: number): void;
  reset(): void;
}

export function createVirusHud(): VirusHud {
  const timers: (ReturnType<typeof setTimeout> | undefined)[] = [undefined, undefined, undefined];
  const cryUntil = [0, 0, 0];
  const tauntUntil = [0, 0, 0];
  const nextTaunt = [0, 0, 0];
  const lensV = (t: number) => $(`lens-${t}`);
  let last = '';
  const schedule = (now: number) => {
    for (let t = 0; t < 3; t++) nextTaunt[t] = now + 2500 + t * 1700;
  };
  schedule(Date.now());
  return {
    layout(L) {
      // klasik yerleşimi (applyHudLayout) yalnızca Virüs Avı açıkken ezer; mod değişince yeniden yerleşim yapılır
      if ($('app').dataset['mode'] === 'virus') place($('stats'), statsRect(L));
      place($('virus-lens'), lensRect(L));
      $('virus-lens').classList.toggle('compact', L.portrait);
      place($('virus-card'), L.cong);
      $('virus-card').classList.toggle('wide', !L.portrait);
    },
    sync(g, playing) {
      const rem = g.remaining();
      const warn = !g.tutorial && g.timeLeftMs < VIRUS_CFG.warnMs;
      // lens: ağlama, dalga geçme ve (ağlama bitince) kaybolma
      const now = Date.now();
      const pace = warn ? 'hurry' : 'calm';
      for (let t = 0; t < 3; t++) {
        const crying = now < (cryUntil[t] ?? 0);
        if (playing && !crying && now >= (nextTaunt[t] ?? 0)) {
          tauntUntil[t] = now + TAUNT_MS;
          nextTaunt[t] = now + TAUNT_EVERY[pace] + t * TAUNT_STAGGER[pace];
        }
        const el = lensV(t);
        el.classList.toggle('is-taunt', playing && !crying && now < (tauntUntil[t] ?? 0));
        el.classList.toggle('is-gone', rem[t as 0 | 1 | 2] === 0 && !crying);
      }
      const key = [g.score, g.level, g.tutorial, Math.ceil(g.timeLeftMs / 1000), ...rem, warn, playing].join('|');
      if (key === last) return;
      last = key;
      $('virus-time').textContent = g.tutorial ? '–' : formatTime(g.timeLeftMs);
      const card = $('virus-card');
      if (warn) card.dataset['warn'] = '1';
      else delete card.dataset['warn'];
      $('virus-left').textContent = String(rem[0] + rem[1] + rem[2]);
      $('virus-level').textContent = g.tutorial ? VIRUS_TEXT.tutorialLevel : String(g.level);
      $('hud-score').textContent = g.score.toLocaleString('tr-TR');
    },
    react(e, type) {
      if (e === 'back') {
        for (let t = 0; t < 3; t++) {
          clearTimeout(timers[t]);
          cryUntil[t] = 0;
          lensV(t).classList.remove('is-gone', 'is-cry', 'is-taunt');
        }
        return;
      }
      const el = lensV(type);
      cryUntil[type] = Date.now() + CRY_MS;
      tauntUntil[type] = 0;
      el.classList.remove('is-taunt');
      el.classList.add('is-cry');
      clearTimeout(timers[type]);
      timers[type] = setTimeout(() => el.classList.remove('is-cry'), CRY_MS);
    },
    reset() {
      last = '';
      for (let t = 0; t < 3; t++) {
        clearTimeout(timers[t]);
        cryUntil[t] = tauntUntil[t] = 0;
        lensV(t).classList.remove('is-gone', 'is-cry', 'is-taunt');
      }
      schedule(Date.now());
    },
  };
}
