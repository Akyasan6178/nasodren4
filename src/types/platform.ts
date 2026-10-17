// Tarayıcı global'leri için dar kapsamlı tip genişletmesi (çalışma anı kodu yok).
import type * as PIXI from 'pixi.js';
import type { Game } from '../game/Game';
import type { View } from '../rendering/GameView';

declare global {
  interface Window {
    /** Yalnızca development build'de atanır (bkz. app/bootstrap.ts). */
    __fn?: { game: Game; view: View; app: PIXI.Application<HTMLCanvasElement> };
    dataLayer?: unknown[];
    webkitAudioContext?: typeof AudioContext;
  }
}

export {};
