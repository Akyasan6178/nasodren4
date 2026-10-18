// NS4-10: ekranlara göre odak yönetimi. Overlay açıkken #stage (canvas + HUD butonları) inert olur;
// yalnızca açık ekran odaklanabilir. Gerçek Tab sırası headless tarayıcıda ayrıca ölçülür.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import html from '../../index.html?raw';
import { createAppStubs } from '../helpers/appStubs';
import { installFakeDom, type FakeDom } from '../helpers/fakeDom';
import { createGame } from '../helpers/gameHelpers';

let dom: FakeDom;
beforeEach(() => {
  vi.useFakeTimers();
  dom = installFakeDom();
});

async function load() {
  vi.resetModules();
  const { createLifecycle } = await import('../../src/app/lifecycle');
  const { InputController } = await import('../../src/input/InputController');
  const screens = await import('../../src/ui/screens');
  screens.bindBackButtons();
  screens.initScreens();
  const g = createGame(1);
  const lc = createLifecycle(createAppStubs(g).deps);
  g.on('gameover', (r) => lc.handleGameOver(r));
  new InputController({
    game: g,
    canvas: dom.canvas as unknown as HTMLCanvasElement,
    settings: { das: 167, arr: 33 },
    getState: lc.getState,
    getCell: () => 30,
    pause: lc.pause,
    resume: lc.resume,
    closeSub: screens.closeSub,
    unlockAudio: () => {},
  });
  const key = (k: string) => dom.window.dispatch('keydown', { key: k });
  /** show() odağı 30 ms sonra verir. */
  const settle = () => vi.advanceTimersByTime(50);
  const active = () => (dom.document.activeElement as { id?: string } | null)?.id ?? null;
  return { g, lc, screens, key, settle, active };
}

describe('statik işaretleme', () => {
  it('#stage başlangıçta inert (ana menü açık gelir) ve programla odaklanabilir', () => {
    expect(html).toMatch(/<div id="stage" inert tabindex="-1">/);
  });
});

describe('overlay açıkken arka plan', () => {
  it('ana menü açıkken HUD ve canvas etkileşime kapalı', async () => {
    await load();
    expect(dom.visibleScreen()).toBe('scr-start');
    expect(dom.el('stage').inert).toBe(true);
  });

  it('oyun başlayınca HUD yeniden erişilebilir ve odak oyun alanına geçer', async () => {
    const { lc, settle, active } = await load();
    lc.start();
    settle();
    expect(dom.visibleScreen()).toBeNull();
    expect(dom.el('stage').inert).toBe(false);
    expect(active()).toBe('stage');
  });

  it.each([
    ['scr-pause', 'b-resume'],
    ['scr-over', 'scr-over-sheet'],
  ])('%s açılınca arka plan inert, odak ilk uygun öğede (%s)', async (screen, first) => {
    const { g, lc, settle, active } = await load();
    lc.start();
    settle();
    if (screen === 'scr-pause') lc.pause();
    else {
      g.gameOver('blockout');
      vi.advanceTimersByTime(1000); // oyun sonu ekranı 950 ms sonra açılır
    }
    settle();
    expect(dom.visibleScreen()).toBe(screen);
    expect(dom.el('stage').inert).toBe(true);
    expect(active()).toBe(first);
  });

  it('oyun sonu ekranı açılmadan önceki 950 ms içinde HUD kilitlenmez; ekran açılınca kilitlenir', async () => {
    const { g, lc, settle } = await load();
    lc.start();
    settle();
    g.gameOver('blockout');
    expect(dom.el('stage').inert).toBe(false);
    vi.advanceTimersByTime(1000);
    expect(dom.el('stage').inert).toBe(true);
  });

  it.each(['scr-how', 'scr-set'] as const)('başlangıçtan açılan %s ekranında arka plan inert kalır', async (sub) => {
    const { screens } = await load();
    screens.openSub(sub);
    expect(dom.el('stage').inert).toBe(true);
  });
});

describe('overlay geçişlerinde odak', () => {
  it('pause → Ayarlar → geri: odak Ayarlar’ı açan butona döner', async () => {
    const { lc, screens, settle, active } = await load();
    lc.start();
    settle();
    lc.pause();
    settle();
    dom.el('b-set2').focus();
    screens.openSub('scr-set');
    settle();
    expect(active()).toBe('scr-set-back');
    dom.backButton('scr-set').click();
    settle();
    expect(dom.visibleScreen()).toBe('scr-pause');
    expect(active()).toBe('b-set2');
  });

  it('Escape ile alt ekrandan dönüş de açan butona odaklanır; ikinci Escape oyunu sürdürür', async () => {
    const { lc, screens, key, settle, active } = await load();
    dom.el('b-how').focus();
    screens.openSub('scr-how');
    settle();
    key('Escape');
    settle();
    expect(dom.visibleScreen()).toBe('scr-start');
    expect(active()).toBe('b-how');
    lc.start();
    settle();
    key('Escape');
    settle();
    expect(lc.getState()).toBe('paused');
    key('Escape');
    settle();
    expect(lc.getState()).toBe('playing');
    expect(dom.el('stage').inert).toBe(false);
    expect(active()).toBe('stage');
  });

  it('resume sonrası odak HUD butonuna değil oyun alanına döner (Space yeniden pause yapmaz)', async () => {
    const { lc, settle, active, key } = await load();
    lc.start();
    settle();
    dom.el('btn-pause').focus();
    lc.pause();
    settle();
    lc.resume();
    settle();
    expect(active()).toBe('stage');
    key(' ');
    expect(lc.getState()).toBe('playing');
  });

  it('ana menüye dönüşte odak başlangıç ekranının ilk butonuna gider', async () => {
    const { lc, settle, active } = await load();
    lc.start();
    settle();
    lc.pause();
    settle();
    lc.toMenu();
    settle();
    expect(dom.el('stage').inert).toBe(true);
    expect(active()).toBe('b-play');
  });
});
