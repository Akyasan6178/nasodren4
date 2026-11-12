/* =====================================================================
   Geliştirme araçları: bölüm saati (NS4-45 dalga / hızlanma) ve Spray (__fn.sinus). Yalnızca
   development build'de bootstrap'ın DEV dalında dinamik olarak yüklenir;
   production paketinde yok. Oyun oynanmıyorsa önce başlatılır.
   ===================================================================== */
import type { Game } from '../game/Game';
import type { Lifecycle } from '../app/lifecycle';
import { COLS, ROWS } from '../config/gameConfig';
import { ORIGIN, SINUS } from '../game/sinusAttack';

export interface SinusState {
  /** Saat barı (0..1), sıradaki adım, bu bölümdeki adım ve hız payı, gerçek iniş süresi (ms). */
  readonly attackProgress: number;
  readonly next: 'wave' | 'speed';
  readonly steps: number;
  readonly speedBoost: number;
  readonly gravityMs: number;
  /** Dalga sayısı, tahtadaki dalga hücresi ve oda grisi, düşen ve satırla silinen virüs. */
  readonly viruses: number;
  readonly virusesCleared: number;
  readonly attacks: number;
  readonly attackGray: number;
  readonly roomGray: number;
  /** Spray şarjı, eşiği, hazır mı, dolu ama hedefsiz mi, kullanım sayısı. */
  readonly sprayCharge: number;
  readonly sprayThreshold: number;
  readonly sprayReady: boolean;
  readonly sprayNoTarget: boolean;
  readonly sprays: number;
  /** Dalga hücresi içeren silinen satır ve oda geçişinde taşınan dalga hücresi. */
  readonly attackLines: number;
  readonly carriedAttackGray: number;
}

export interface SinusDemo {
  /** Dalgayı hemen düşürür (bar sıfırlanır; adım sayılmaz). */
  attack(): SinusState;
  /** Saatin sıradaki adımını hemen atar (tek: dalga, çift: hızlanma; bar sıfırlanır). */
  step(): SinusState;
  /** Barı verilen orana getirir (0..0,999; atak tetiklenmez). */
  setProgress(p: number): SinusState;
  /** Spray şarjını doldurur. */
  fillSpray(): SinusState;
  /** Kaynak katmanı: sıra başına bir dize ('.' boş/renkli, 'o' oda grisi, 'a' tek kare, 'v' virüs). */
  origin(): string[];
  state(): SinusState;
}

export function createSinusDemo(game: Game, lifecycle: Lifecycle): SinusDemo {
  const ensure = () => {
    if (lifecycle.getState() !== 'playing') lifecycle.start();
  };
  const state = (): SinusState => ({
    attackProgress: Math.round(game.stepProgress() * 1000) / 1000,
    next: game.nextStep(),
    steps: game.pressSteps,
    speedBoost: game.speedBoost,
    gravityMs: Math.round(game.gravityMs()),
    viruses: game.viruses,
    virusesCleared: game.virusesCleared,
    attacks: game.attacks,
    attackGray: game.attackGrayCount(),
    roomGray: game.roomGray,
    sprayCharge: game.sprayCharge,
    sprayThreshold: SINUS.sprayThreshold,
    sprayReady: game.canSpray(),
    sprayNoTarget: game.sprayNoTarget(),
    sprays: game.sprays,
    attackLines: game.attackLines,
    carriedAttackGray: game.carriedAttackGray,
  });
  return {
    attack() {
      ensure();
      game.attackT = 0;
      game.sinusAttack();
      return state();
    },
    step() {
      ensure();
      game.attackT = 0;
      game.pressureStep();
      return state();
    },
    setProgress(p) {
      ensure();
      game.attackT = Math.max(0, Math.min(0.999, p)) * game.stepMs();
      return state();
    },
    fillSpray() {
      ensure();
      game.sprayCharge = SINUS.sprayThreshold;
      return state();
    },
    origin() {
      const out: string[] = [];
      for (let y = 0; y < ROWS; y++) {
        let r = '';
        for (let x = 0; x < COLS; x++) {
          const o = game.origin[y * COLS + x];
          r += o === ORIGIN.room ? 'o' : o === ORIGIN.attack ? 'a' : (o ?? 0) >= ORIGIN.virus ? 'v' : '.';
        }
        out.push(r);
      }
      return out;
    },
    state,
  };
}
