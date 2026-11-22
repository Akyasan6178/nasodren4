/* =====================================================================
   Sinüzit atağı geri sayımı ve Spray düğmesi (docs/NS4-45-ZORLASAN-DALGALAR.md,
   NS4-47). Geri sayım bölüm saatinin sıradaki adımına kalan süreyi tam
   saniye (yukarı yuvarlanmış) gösterir; süre Game.stepRemainingMs()'ten gelir
   (tek kaynak). Yalnızca değişen değerler DOM'a yazılır: sayı saniyede bir
   değişir. role="timer" canlı anons yapmaz (her saniye okunmaz).
   ===================================================================== */
import { $, place } from './dom';
import type { Game } from '../game/Game';
import type { Layout } from '../types/layout';
import { SINUS } from '../game/sinusAttack';
import { STEP_NAME } from '../content/waves';

/** Son bu kadar saniyede sayı tehlike renginde görünür (hareketsiz). */
export const ATTACK_SOON_S = 5;
/** Atak anı parlamasının süresi (ms). */
export const ATTACK_HIT_MS = 450;
/** Portrede satır bu genişlikten darsa sıradaki adımın adı gizlenir (320 px ekranda taşma olmasın). */
export const TIMER_NARROW_W = 300;

/** Kalan süre (ms) → gösterilen tam saniye: yukarı yuvarlanır, en az 1 (0, negatif ya da NaN gösterilmez). */
export function timerSeconds(ms: number): number {
  return Number.isFinite(ms) ? Math.max(1, Math.ceil(ms / 1000)) : 1;
}

export interface SinusHud {
  layout(L: Layout): void;
  sync(g: Game, playing: boolean): void;
  /** Atak tetiklendi: kısa parlama. */
  onAttack(): void;
  reset(): void;
}

export function createSinusHud(): SinusHud {
  const timer = $('attack-timer'),
    sec = $('attack-sec'),
    kind = $('attack-kind'),
    btn = $('btn-spray', HTMLButtonElement),
    sfill = $('spray-fill');
  let lastSec = -1,
    lastS = -1,
    lastShown: boolean | null = null,
    lastReady: boolean | null = null,
    lastIdle: boolean | null = null,
    lastSoon: boolean | null = null,
    lastNext: 'wave' | 'speed' | null = null,
    hitTimer: ReturnType<typeof setTimeout> | undefined;
  const reset = () => {
    lastSec = lastS = -1;
    lastShown = lastReady = lastIdle = lastSoon = lastNext = null;
    clearTimeout(hitTimer);
    timer.classList.remove('hit', 'soon');
  };
  return {
    layout(L) {
      place(timer, L.attackTimer);
      const card = !L.portrait;
      timer.classList.toggle('card', card);
      timer.classList.toggle('panel', card);
      timer.classList.toggle('narrow', !card && L.attackTimer.w < TIMER_NARROW_W);
      place(btn, L.btnSpray);
      btn.classList.toggle('compact-btn', L.compactBtns);
    },
    sync(g, playing) {
      // oyun sonunda gizlenir; molada sync çağrılmaz (sayı olduğu yerde kalır)
      if (playing !== lastShown) {
        lastShown = playing;
        timer.hidden = !playing;
      }
      const n = timerSeconds(g.stepRemainingMs());
      if (n !== lastSec) {
        lastSec = n;
        sec.textContent = String(n);
      }
      const soon = playing && n <= ATTACK_SOON_S;
      if (soon !== lastSoon) {
        lastSoon = soon;
        timer.classList.toggle('soon', soon);
      }
      const next = g.nextStep();
      if (next !== lastNext) {
        lastNext = next;
        kind.textContent = STEP_NAME[next];
      }
      const s = Math.min(1, g.sprayCharge / SINUS.sprayThreshold);
      if (s !== lastS) {
        lastS = s;
        sfill.style.transform = `scaleX(${s})`;
      }
      const ready = playing && g.canSpray();
      if (ready !== lastReady) {
        lastReady = ready;
        btn.disabled = !ready;
        btn.classList.toggle('ready', ready);
      }
      // şarj dolu ama atak grisi yok: düğme kapalı, dolum çizgili sönük görünür (metin yok)
      const idle = playing && g.sprayNoTarget();
      if (idle !== lastIdle) {
        lastIdle = idle;
        btn.classList.toggle('idle', idle);
      }
    },
    onAttack() {
      timer.classList.add('hit');
      clearTimeout(hitTimer);
      hitTimer = setTimeout(() => timer.classList.remove('hit'), ATTACK_HIT_MS);
    },
    reset,
  };
}
