import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAppStubs } from '../helpers/appStubs';
import { installFakeDom, type FakeDom } from '../helpers/fakeDom';
import { chargeCyc, createGame, finishClear, stackRows } from '../helpers/gameHelpers';

// Modül durumu (HUD önbelleği, ekran yığını) testler arasında taşınmasın diye her testte yeniden yüklenir.
async function load() {
  vi.resetModules();
  const { createLifecycle } = await import('../../src/app/lifecycle');
  const { updateHud } = await import('../../src/ui/hud');
  const g = createGame(1);
  const lc = createLifecycle(createAppStubs(g).deps);
  g.on('gameover', (r) => lc.handleGameOver(r));
  /** bootstrap'taki ana döngünün HUD adımı. */
  const frame = () => {
    const s = lc.getState();
    if (s === 'playing' || s === 'over') updateHud(g, s === 'playing');
  };
  return { g, lc, frame };
}

let dom: FakeDom;
beforeEach(() => {
  vi.useFakeTimers();
  dom = installFakeDom();
});

describe('tehlike vinyeti', () => {
  it('yüksek tıkanıklıkta açılır, pause sırasında gizlenir, resume sonrası yeniden açılır', async () => {
    const { g, lc, frame } = await load();
    lc.start();
    stackRows(g, 14); // tıkanıklık 0.70
    frame();
    expect(dom.el('danger').classList.contains('on')).toBe(true);
    lc.pause();
    frame(); // pause sırasında ana döngü HUD'u güncellemez
    expect(dom.el('danger').classList.contains('on')).toBe(false);
    lc.resume();
    frame();
    expect(dom.el('danger').classList.contains('on')).toBe(true);
  });

  it('resume sonrası mevcut tıkanıklığa göre hesaplanır (eşiğin altındaysa kapalı kalır)', async () => {
    const { g, lc, frame } = await load();
    lc.start();
    stackRows(g, 14);
    frame();
    lc.pause();
    stackRows(g, 6); // pause sırasında değişen tahta (ör. test kurulumu): 0.30
    lc.resume();
    frame();
    expect(dom.el('danger').classList.contains('on')).toBe(false);
  });

  it('oyun bitince kapanır', async () => {
    const { g, lc, frame } = await load();
    lc.start();
    stackRows(g, 14);
    frame();
    g.gameOver('blockout');
    frame();
    expect(dom.el('danger').classList.contains('on')).toBe(false);
  });
});

describe('efekt rozetleri (×2 ve Rebound)', () => {
  /** Siklamen + iki sentetik: ×2 ve Rebound sayaçları çalışır. */
  function activateEffects(g: ReturnType<typeof createGame>) {
    stackRows(g, 7);
    chargeCyc(g);
    g.useCyc();
    finishClear(g);
    for (let i = 0; i < 2; i++) {
      stackRows(g, 7);
      g.useSyn();
      finishClear(g);
    }
    expect(g.multT).toBeGreaterThan(0);
    expect(g.reboundT).toBeGreaterThan(0);
  }

  it('oynarken görünür, game-over sırasında gizlenir', async () => {
    const { g, lc, frame } = await load();
    lc.start();
    activateEffects(g);
    frame();
    expect(dom.el('badge-mult').style['display']).toBe('block');
    expect(dom.el('badge-rebound').style['display']).toBe('block');
    g.gameOver('garbage');
    expect(lc.getState()).toBe('over');
    frame();
    expect(dom.el('badge-mult').style['display']).toBe('none');
    expect(dom.el('badge-rebound').style['display']).toBe('none');
    frame(); // sonraki karelerde de gizli kalır
    expect(dom.el('badge-mult').style['display']).toBe('none');
  });

  it('yeni oyun temiz bir HUD ile başlar', async () => {
    const { g, lc, frame } = await load();
    lc.start();
    activateEffects(g);
    frame();
    g.gameOver('garbage');
    frame();
    lc.start();
    frame();
    expect(dom.el('badge-mult').style['display']).toBe('none');
    expect(dom.el('badge-rebound').style['display']).toBe('none');
    expect(dom.el('hud-score').textContent).toBe('0');
    expect(dom.el('danger').classList.contains('on')).toBe(false);
  });
});
