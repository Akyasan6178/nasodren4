/* =====================================================================
   Geliştirme araçları: Virüs Avı (__fn.virus). Yalnızca development
   build'de bootstrap'ın DEV dalında dinamik olarak yüklenir; production
   paketinde yok. Mod açık değilse önce Virüs Avı başlatılır.
   ===================================================================== */
import { COLS, VIS } from '../config/gameConfig';
import type { ModeRouter } from '../virus/modeRouter';
import { CAPSULE, VIRUS, clearGrid } from '../virus/rules';
import type { VirusGame } from '../virus/VirusGame';

export interface VirusDemoState {
  readonly state: string;
  readonly level: number;
  readonly tutorial: boolean;
  readonly timeLeftMs: number;
  readonly remaining: readonly number[];
  readonly score: number;
}
export interface VirusDemo {
  /** Kalan süreyi ayarlar (ms). */
  setTime(ms: number): VirusDemoState;
  /** Tahtayı tek virüse indirir ve onu silecek kapsülü bırakır (bölüm sonunu denemek için). */
  almostWin(): VirusDemoState;
  /** Verilen bölümü temiz tahtada başlatır (öğretici açıksa kapanmaz; önce Atla). */
  level(n: number): VirusDemoState;
  state(): VirusDemoState;
}

export function createVirusDemo(game: VirusGame, router: ModeRouter): VirusDemo {
  const ensure = () => {
    if (router.mode() !== 'virus' || router.getState() !== 'playing') router.startVirus();
  };
  const state = (): VirusDemoState => ({
    state: game.state,
    level: game.level,
    tutorial: game.tutorial,
    timeLeftMs: Math.round(game.timeLeftMs),
    remaining: game.remaining(),
    score: game.score,
  });
  return {
    setTime(ms) {
      ensure();
      game.timeLeftMs = ms;
      return state();
    },
    almostWin() {
      ensure();
      clearGrid(game.grid);
      const y = VIS - 1;
      game.grid.kind[y * COLS] = VIRUS;
      game.grid.kind[y * COLS + 1] = CAPSULE;
      game.grid.kind[y * COLS + 2] = CAPSULE;
      game.cap = { x: 3, y: 0, rot: 0, a: 0, b: 1 };
      game.hardDrop();
      return state();
    },
    level(n) {
      ensure();
      game.startLevel(n);
      return state();
    },
    state,
  };
}
