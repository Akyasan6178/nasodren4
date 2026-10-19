// NS4-15: GameView'i Node'da (render olmadan) kurmak için en küçük ortam. Pixi sahne grafiği, sprite ve
// ParticleContainer gerçek nesnelerdir; yalnızca canvas/2D bağlamı ve renderer taklit edilir. Piksel üretilmez.
import { vi } from 'vitest';
import type * as PIXI from 'pixi.js';
import type { Game } from '../../src/game/Game';
import type { View } from '../../src/rendering/GameView';
import { computeLayout } from '../../src/rendering/layout';

/** Her yöntemi boş fonksiyon, gradyanları addColorStop'lu nesne döndüren 2D bağlam. */
function fakeContext(): CanvasRenderingContext2D {
  const grad = { addColorStop: () => undefined };
  const store: Record<string, unknown> = {};
  return new Proxy(store, {
    get(target, prop) {
      if (prop in target) return target[prop as string];
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient') return () => grad;
      if (prop === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
      return () => undefined;
    },
    set(target, prop, v) {
      target[prop as string] = v;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
}

class FakeCanvas {
  width = 0;
  height = 0;
  style = {};
  getContext() {
    return fakeContext();
  }
  addEventListener() {}
  removeEventListener() {}
}

/** document/canvas taklitlerini kurar. Pixi bu taklitten sonra (dinamik) import edilmelidir. */
export function stubCanvasDom() {
  vi.stubGlobal('HTMLCanvasElement', FakeCanvas);
  vi.stubGlobal('document', {
    createElement: () => new FakeCanvas(),
    baseURI: 'http://localhost/',
  });
}

export interface ViewHarness {
  readonly view: View;
  /** Belirtilen sahne boyutunda layout uygular (resize). */
  resize(w: number, h: number): void;
  /** n kare × dt ms ilerletir. */
  step(ms: number, dt?: number): void;
}

export async function createView(game: Game, w = 1366, h = 768, resolution = 1): Promise<ViewHarness> {
  const { Container } = await import('pixi.js');
  const { View } = await import('../../src/rendering/GameView');
  const app = {
    stage: new Container(),
    renderer: { resolution },
  } as unknown as PIXI.Application<HTMLCanvasElement>;
  const view = new View(app, game, { ghost: true });
  view.layout(computeLayout(w, h));
  return {
    view,
    resize: (W, H) => view.layout(computeLayout(W, H)),
    step(ms, dt = 16) {
      for (let t = 0; t < ms; t += dt) view.update(dt);
    },
  };
}
