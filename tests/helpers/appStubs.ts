// NS4-06: createLifecycle için en küçük View/Sound/Pixi taklitleri. Yalnızca lifecycle'ın dokunduğu
// alanlar vardır; render veya ses üretilmez. Çağrılar `calls` dizisine yazılır.
import type * as PIXI from 'pixi.js';
import type { LifecycleDeps } from '../../src/app/lifecycle';
import type { Sound } from '../../src/audio/SoundManager';
import type { Game } from '../../src/game/Game';
import type { View } from '../../src/rendering/GameView';

export interface AppStubs {
  readonly deps: LifecycleDeps;
  readonly calls: string[];
}

export function createAppStubs(game: Game): AppStubs {
  const calls: string[] = [];
  const rec = (name: string) => () => {
    calls.push(name);
  };
  const view = {
    overT: -1,
    anim: null,
    wave: null,
    flashes: [],
    syncAll: rec('view.syncAll'),
    onGameOver: rec('view.onGameOver'),
  };
  const sound = { unlock: rec('sound.unlock'), setMusic: rec('sound.setMusic'), over: rec('sound.over') };
  const app = { ticker: { stop: rec('ticker.stop'), start: rec('ticker.start') } };
  return {
    calls,
    deps: {
      game,
      view: view as unknown as View,
      sound: sound as unknown as Sound,
      app: app as unknown as PIXI.Application<HTMLCanvasElement>,
      buzz: rec('buzz'),
      resetInput: rec('resetInput'),
    },
  };
}
