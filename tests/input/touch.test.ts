// NS4-13: dokunmatik kontroller gerçek InputController + lifecycle + öğretici ile; deterministik pointer verileri.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PIECE } from '../../src/game/pieces';
import { computeLayout } from '../../src/rendering/layout';
import { createAppStubs } from '../helpers/appStubs';
import { installFakeDom, type FakeDom } from '../helpers/fakeDom';
import { clearBoard, createGame, placePiece } from '../helpers/gameHelpers';

let dom: FakeDom;
beforeEach(() => {
  vi.useFakeTimers();
  dom = installFakeDom();
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {} });
});

async function setup(W = 390, H = 844) {
  vi.resetModules();
  const L = computeLayout(W, H);
  dom.canvas.rect = { left: 0, top: 0, width: W, height: H };
  const { createLifecycle } = await import('../../src/app/lifecycle');
  const { InputController } = await import('../../src/input/InputController');
  const { Tutorial } = await import('../../src/tutorial/Tutorial');
  const g = createGame(1);
  const tutorial = new Tutorial(
    g,
    { show: () => {}, hide: () => {} },
    { isDone: () => false, markDone: () => {} },
    { mode: 'touch' },
  );
  const lc = createLifecycle({ ...createAppStubs(g).deps, tutorial });
  const input = new InputController({
    game: g,
    canvas: dom.canvas as unknown as HTMLCanvasElement,
    settings: { das: 167, arr: 33 },
    getState: lc.getState,
    getCell: () => L.cell,
    getBoard: () => L.board,
    pause: lc.pause,
    resume: lc.resume,
    closeSub: () => false,
    unlockAudio: () => {},
    onSoftDrop: () => tutorial.softDrop(),
    onInputMode: (m) => tutorial.setMode(m),
  });
  lc.start();
  const fresh = (type: 1 | 2 | 3 | 4 | 5 | 6 | 7 = PIECE.T) => {
    clearBoard(g);
    placePiece(g, type, 0, 3, 5);
  };
  fresh();
  const c = L.cell;
  // tahtanın üst üçte birinde, yatay ortada (sol üçte bir kuralı ekrana göre)
  const bx = L.board.x + L.board.w * 0.7,
    by = L.board.y + L.board.h * 0.3;
  let time = 1000;
  const ev = (type: string, id: number, x: number, y: number, extra: Record<string, unknown> = {}) =>
    dom.canvas.dispatch(type, {
      pointerId: id,
      pointerType: 'touch',
      isPrimary: id === 1,
      clientX: x,
      clientY: y,
      timeStamp: time,
      ...extra,
    });
  /** [dx, dy] hücre noktaları; ilk nokta down, son nokta up, aralar move. */
  const swipe = (pts: readonly (readonly [number, number])[], dt: number, at = { x: bx, y: by }, id = 1) => {
    pts.forEach((p, i) => {
      if (i > 0) time += dt;
      const x = at.x + p[0] * c,
        y = at.y + p[1] * c;
      ev(i === 0 ? 'pointerdown' : i === pts.length - 1 ? 'pointerup' : 'pointermove', id, x, y);
    });
  };
  const tick = (ms: number) => void (time += ms);
  return { g, lc, input, tutorial, L, c, bx, by, ev, swipe, fresh, tick };
}

describe('dokunma ve sürükleme', () => {
  it('kısa dokunma: sağ bölge normal, ekranın sol üçte biri ters döndürür', async () => {
    const { g, swipe, L, by, fresh } = await setup();
    swipe(
      [
        [0, 0],
        [0, 0],
      ],
      60,
    );
    expect(g.rot).toBe(1);
    fresh();
    swipe(
      [
        [0, 0],
        [0, 0],
      ],
      60,
      { x: L.board.x + 20, y: by },
    ); // x < 390/3
    expect(g.rot).toBe(3);
  });

  it('O parçasının dönmemesi hata üretmez', async () => {
    const { g, swipe, fresh } = await setup();
    fresh(PIECE.O);
    expect(() =>
      swipe(
        [
          [0, 0],
          [0, 0],
        ],
        60,
      ),
    ).not.toThrow();
    expect(g.rot).toBe(0);
  });

  it('küçük titreşim yok sayılır', async () => {
    const { g, swipe } = await setup();
    swipe(
      [
        [0, 0],
        [0.35, 0.1],
        [0.4, 0],
        [0.38, 0.05],
      ],
      40,
    );
    expect([g.x, g.y, g.rot]).toEqual([3, 5, 0]);
  });

  it('yatay sürükleme doğru hücre sayısı; bırakış dokunma sayılmaz', async () => {
    const { g, swipe } = await setup();
    swipe(
      [
        [0, 0],
        [1, 0],
        [2.0, 0],
        [2.7, 0],
      ],
      30,
    ); // trunc(2,7 / 0,9) = 3
    expect(g.x).toBe(6);
    expect(g.rot).toBe(0);
  });

  it('tahta dışından başlayan jest oyunu kontrol etmez', async () => {
    const { g, swipe, L } = await setup();
    swipe(
      [
        [0, 0],
        [2, 0],
        [3, 0],
      ],
      30,
      { x: L.board.x + L.board.w / 2, y: L.board.y + L.board.h + 60 },
    ); // alt butonların üstü
    swipe(
      [
        [0, 0],
        [0, 0],
      ],
      60,
      { x: 5, y: 5 },
    ); // sol üst köşe (Beklet paneli)
    expect([g.x, g.rot]).toEqual([3, 0]);
  });
});

describe('dikey hareketler', () => {
  it('yavaş aşağı sürükleme yavaş indirir, hard drop yapmaz', async () => {
    const { g, swipe } = await setup();
    const y0 = g.y;
    swipe(
      [
        [0, 0],
        [0, 1],
        [0, 2],
        [0, 3],
        [0, 3],
      ],
      200,
    );
    expect(g.y).toBe(y0 + 3);
    expect(g.type).toBe(PIECE.T); // kilitlenmedi
  });

  it('hızlı aşağı fırlatma hard drop yapar', async () => {
    const { g, swipe } = await setup();
    const before = g.pieceVer;
    swipe(
      [
        [0, 0],
        [0, 1.5],
        [0, 3],
      ],
      15,
    );
    expect(g.board.some((v) => v === PIECE.T)).toBe(true); // kilitlendi
    expect(g.pieceVer).toBeGreaterThan(before);
  });

  it('hızlı yukarı fırlatma hold yapar; kısa yukarı hareket yapmaz', async () => {
    const a = await setup();
    a.swipe(
      [
        [0, 0],
        [0, -0.8],
        [0, -1.5],
      ],
      15,
    );
    expect(a.g.hold).toBe(0);
    a.swipe(
      [
        [0, 0],
        [0, -1.5],
        [0, -3],
      ],
      15,
    );
    expect(a.g.hold).toBe(PIECE.T);
  });

  it('hold sonrası aynı jestin devamı ikinci işlem üretmez', async () => {
    const { g, swipe, ev, bx, by, c } = await setup();
    swipe(
      [
        [0, 0],
        [0, -1.5],
        [0, -3],
      ],
      15,
    );
    const t = g.type;
    ev('pointermove', 1, bx, by + 5 * c);
    ev('pointerup', 1, bx, by + 6 * c);
    expect([g.hold, g.type]).toEqual([PIECE.T, t]);
  });
});

describe('çoklu dokunma ve iptal', () => {
  it('ikinci parmak yok sayılır ve dokunmayı iptal eder', async () => {
    const { g, ev, bx, by } = await setup();
    ev('pointerdown', 1, bx, by);
    ev('pointerdown', 2, bx - 60, by);
    ev('pointerup', 2, bx - 60, by);
    ev('pointerup', 1, bx, by);
    expect(g.rot).toBe(0);
  });

  it('ikinci parmağın hareketi parçayı oynatmaz', async () => {
    const { g, ev, bx, by, c, tick } = await setup();
    ev('pointerdown', 1, bx, by);
    ev('pointerdown', 2, bx - 60, by);
    tick(30);
    ev('pointermove', 2, bx - 60 + 3 * c, by);
    expect(g.x).toBe(3);
  });

  it.each(['pointercancel', 'lostpointercapture'])('%s jesti temizler', async (type) => {
    const { g, ev, bx, by, c, tick } = await setup();
    ev('pointerdown', 1, bx, by);
    tick(20);
    ev(type, 1, bx, by);
    tick(20);
    ev('pointermove', 1, bx + 3 * c, by);
    ev('pointerup', 1, bx + 3 * c, by);
    expect([g.x, g.rot]).toEqual([3, 0]);
  });

  it('pause jesti temizler; resume sonrası eski jest etkisiz', async () => {
    const { g, lc, ev, bx, by, c } = await setup();
    ev('pointerdown', 1, bx, by);
    lc.pause();
    ev('pointermove', 1, bx + 3 * c, by);
    lc.resume();
    ev('pointermove', 1, bx + 3 * c, by);
    ev('pointerup', 1, bx, by);
    expect([g.x, g.rot]).toEqual([3, 0]);
  });

  it('resize (window) ve yeniden yerleşim jesti iptal eder', async () => {
    const { g, input, ev, bx, by, c } = await setup();
    ev('pointerdown', 1, bx, by);
    dom.window.dispatch('resize');
    ev('pointermove', 1, bx + 3 * c, by);
    ev('pointerup', 1, bx, by);
    ev('pointerdown', 1, bx, by);
    input.cancelGesture();
    ev('pointerup', 1, bx, by);
    expect([g.x, g.rot]).toEqual([3, 0]);
  });
});

describe('öğretici uyumu', () => {
  it('dokunmatik jestlerle adımlar sırayla ilerler', async () => {
    const { tutorial, swipe, fresh } = await setup();
    expect(tutorial.step).toBe('move');
    swipe(
      [
        [0, 0],
        [1.2, 0],
        [1.2, 0],
      ],
      30,
    );
    expect(tutorial.step).toBe('rotate');
    swipe(
      [
        [0, 0],
        [0, 0],
      ],
      60,
    );
    expect(tutorial.step).toBe('soft');
    swipe(
      [
        [0, 0],
        [0, 1],
        [0, 1],
      ],
      200,
    );
    expect(tutorial.step).toBe('hard');
    swipe(
      [
        [0, 0],
        [0, 1.5],
        [0, 3],
      ],
      15,
    );
    expect(tutorial.step).toBe('hold');
    fresh();
    swipe(
      [
        [0, 0],
        [0, -1.5],
        [0, -3],
      ],
      15,
    );
    expect(tutorial.step).toBe('clear');
  });

  it('titreşim ve yanlış jest adımı ilerletmez', async () => {
    const { tutorial, swipe } = await setup();
    swipe(
      [
        [0, 0],
        [0.4, 0],
        [0.4, 0],
      ],
      30,
    );
    swipe(
      [
        [0, 0],
        [0, 0],
      ],
      60,
    ); // döndürme: kaydırma adımında yanlış eylem
    expect(tutorial.step).toBe('move');
  });
});

describe.each([
  [390, 844],
  [844, 390],
  [768, 1024],
])('%i×%i emülasyonu (güncel hücre)', (W, H) => {
  it('2,2 hücre sürükleme 2 sütun; 3 hücrelik fırlatma hard drop; 1,8 hücrelik değil', async () => {
    const a = await setup(W, H);
    a.swipe(
      [
        [0, 0],
        [1.1, 0],
        [2.2, 0],
        [2.2, 0],
      ],
      30,
    );
    expect(a.g.x).toBe(5);
    a.fresh();
    a.swipe(
      [
        [0, 0],
        [0, 0.9],
        [0, 1.8],
      ],
      10,
    );
    expect(a.g.type).toBe(PIECE.T);
    a.fresh();
    a.swipe(
      [
        [0, 0],
        [0, 1.5],
        [0, 3],
      ],
      15,
    );
    expect(a.g.board.some((v) => v === PIECE.T)).toBe(true);
  });
});

describe('klavye regresyonu', () => {
  it('klavye kontrolleri değişmedi', async () => {
    const { g } = await setup(1366, 768);
    const key = (k: string) => dom.window.dispatch('keydown', { key: k });
    key('ArrowLeft');
    expect(g.x).toBe(2);
    key('ArrowUp');
    expect(g.rot).toBe(1);
    key('z');
    expect(g.rot).toBe(0);
    key('ArrowDown');
    expect(g.softDrop).toBe(true);
    key('c');
    expect(g.hold).toBe(PIECE.T);
  });
});
