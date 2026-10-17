import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAppStubs } from '../helpers/appStubs';
import { installFakeDom, type FakeDom } from '../helpers/fakeDom';
import { createGame } from '../helpers/gameHelpers';

// Gerçek lifecycle + gerçek ekran yığını + gerçek InputController; yalnızca DOM ve Pixi/ses taklit.
async function load() {
  vi.resetModules();
  const { createLifecycle } = await import('../../src/app/lifecycle');
  const { InputController } = await import('../../src/input/InputController');
  const screens = await import('../../src/ui/screens');
  screens.bindBackButtons();
  const g = createGame(1);
  const lc = createLifecycle(createAppStubs(g).deps);
  const resume = vi.fn(lc.resume);
  new InputController({
    game: g,
    canvas: dom.canvas as unknown as HTMLCanvasElement,
    settings: { das: 167, arr: 33 },
    getState: lc.getState,
    getCell: () => 30,
    pause: lc.pause,
    resume,
    closeSub: screens.closeSub,
    unlockAudio: () => {},
  });
  const key = (k: string) => dom.window.dispatch('keydown', { key: k });
  return { lc, screens, resume, key };
}

let dom: FakeDom;
beforeEach(() => {
  vi.useFakeTimers();
  dom = installFakeDom();
});

describe('Escape ve Ayarlar', () => {
  it('pause → Ayarlar → Escape önce pause ekranına döner, ikinci Escape oyunu sürdürür', async () => {
    const { lc, screens, resume, key } = await load();
    lc.start();
    key('Escape');
    expect(lc.getState()).toBe('paused');
    expect(dom.visibleScreen()).toBe('scr-pause');
    screens.openSub('scr-set');
    key('Escape');
    expect(resume).not.toHaveBeenCalled();
    expect(lc.getState()).toBe('paused');
    expect(dom.visibleScreen()).toBe('scr-pause');
    key('Escape');
    expect(resume).toHaveBeenCalledTimes(1);
    expect(lc.getState()).toBe('playing');
    expect(dom.visibleScreen()).toBeNull();
  });

  it('pause içindeki Ayarlar açıkken P oyunu sürdürmez', async () => {
    const { lc, screens, resume, key } = await load();
    lc.start();
    key('p');
    screens.openSub('scr-set');
    key('p');
    expect(resume).not.toHaveBeenCalled();
    expect(dom.visibleScreen()).toBe('scr-set');
  });

  it('pause ekranında Escape ve P oyunu sürdürür (değişmeyen davranış)', async () => {
    const { lc, key } = await load();
    lc.start();
    key('Escape');
    key('Escape');
    expect(lc.getState()).toBe('playing');
    key('P');
    key('P');
    expect(lc.getState()).toBe('playing');
  });

  it('başlangıç menüsünden açılan Ayarlar Escape ile başlangıca döner', async () => {
    const { lc, screens, key } = await load();
    screens.openSub('scr-set');
    key('Escape');
    expect(lc.getState()).toBe('menu');
    expect(dom.visibleScreen()).toBe('scr-start');
  });
});
