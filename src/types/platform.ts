// Tarayıcı global'leri için dar kapsamlı tip genişletmesi (çalışma anı kodu yok).
import type * as PIXI from 'pixi.js';
import type { Game } from '../game/Game';
import type { View } from '../rendering/GameView';
import type { FxDemo } from '../dev/fxDemo';
import type { ScreensDemo } from '../dev/screensDemo';
import type { AudioDemo } from '../dev/audioDemo';

declare global {
  interface Window {
    /** Yalnızca development build'de atanır (bkz. app/bootstrap.ts). */
    __fn?: {
      game: Game;
      view: View;
      app: PIXI.Application<HTMLCanvasElement>;
      fx?: FxDemo;
      ui?: ScreensDemo;
      sfx?: AudioDemo;
    };
    /**
     * Etiket yöneticisi (ör. GTM) kuyruğu. Sayfaya dışarıdan eklenir; öğeleri bu kodun kontrolünde
     * olmadığı için `unknown[]` olarak modellenir. track() yalnızca Array.isArray sonrası push eder.
     */
    dataLayer?: unknown[];
    /** Eski Safari için önekli AudioContext. */
    webkitAudioContext?: typeof AudioContext;
  }
}

export {};
