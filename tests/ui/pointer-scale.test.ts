// NS4-11: dokunmatik jest eşikleri güncel hücre boyutundan (L.cell) hesaplanır; büyük ekranda büyüyen
// hücre, aynı sayıda hücrelik sürüklemede aynı sayıda sütun hareketi üretir.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { computeLayout } from '../../src/rendering/layout';
import { createAppStubs } from '../helpers/appStubs';
import { installFakeDom, type FakeDom } from '../helpers/fakeDom';
import { clearBoard, createGame, placePiece } from '../helpers/gameHelpers';
import { PIECE } from '../../src/game/pieces';

let dom: FakeDom;
beforeEach(() => {
  vi.useFakeTimers();
  dom = installFakeDom();
});

async function setup(getCell: () => number) {
  vi.resetModules();
  const { createLifecycle } = await import('../../src/app/lifecycle');
  const { InputController } = await import('../../src/input/InputController');
  const g = createGame(1);
  const lc = createLifecycle(createAppStubs(g).deps);
  new InputController({
    game: g,
    canvas: dom.canvas as unknown as HTMLCanvasElement,
    settings: { das: 167, arr: 33 },
    getState: lc.getState,
    getCell,
    pause: lc.pause,
    resume: lc.resume,
    closeSub: () => false,
    unlockAudio: () => {},
  });
  lc.start();
  clearBoard(g);
  placePiece(g, PIECE.T, 0, 3, 5);
  const drag = (dx: number, dy = 0) => {
    dom.canvas.dispatch('pointerdown', { pointerId: 1, clientX: 100, clientY: 100 });
    dom.canvas.dispatch('pointermove', { pointerId: 1, clientX: 100 + dx, clientY: 100 + dy });
  };
  return { g, drag };
}

describe('pointer hareketi güncel hücre boyutuyla', () => {
  it.each([
    [1366, 768],
    [1920, 1080],
    [2560, 1440],
    [390, 844],
  ])('%i×%i: 2,2 hücrelik sürükleme 2 sütun, 0,4 hücre hiç hareket', async (W, H) => {
    const cell = computeLayout(W, H).cell;
    {
      const { g, drag } = await setup(() => cell);
      drag(cell * 2.2);
      expect(g.x).toBe(5);
    }
    {
      const { g, drag } = await setup(() => cell);
      drag(cell * 0.4);
      expect(g.x).toBe(3);
    }
  });

  it('resize sonrası eşik yeni hücre boyutunu kullanır (getCell her olayda okunur)', async () => {
    let cell = computeLayout(1366, 768).cell; // 37
    const { g, drag } = await setup(() => cell);
    cell = computeLayout(1920, 1080).cell; // 52: aynı piksel sürükleme artık daha az hücre
    drag(37 * 2.2); // 81 px → 81 / (52 × 0,9) = 1,7 → 1 sütun
    expect(g.x).toBe(4);
  });
});
