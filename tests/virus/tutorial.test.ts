// NS4-44: Doktor Elif'in tek seferlik Virüs Avı öğreticisi.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VirusEvents } from '../../src/virus/VirusGame';

type Shown = { step: string; index: number; pose: string; text: string; next: boolean };

function fakeGame() {
  const h = new Map<string, ((e: unknown) => void)[]>();
  return {
    on<K extends keyof VirusEvents>(name: K, fn: (e: VirusEvents[K]) => void) {
      const list = h.get(name) ?? [];
      list.push(fn as (e: unknown) => void);
      h.set(name, list);
    },
    emit<K extends keyof VirusEvents>(name: K, e: VirusEvents[K]) {
      for (const fn of h.get(name) ?? []) fn(e);
    },
  };
}
function fakeView() {
  const shown: Shown[] = [];
  return {
    shown,
    visible: false,
    show(s: Shown) {
      shown.push(s);
      this.visible = true;
    },
    hide() {
      this.visible = false;
    },
  };
}
const clear = (viruses: number) => ({
  cells: [1, 2, 3, 4],
  viruses: Array.from({ length: viruses }, (_, i) => ({ i, type: 0 })),
  chain: 1,
  points: 0,
});

/** Bellek içi localStorage (fn_ önekli store.ts bunu kullanır). */
function memStorage(init: Record<string, string> = {}, broken = false) {
  const m = new Map(Object.entries(init));
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => {
      if (broken) throw new Error('kapalı');
      return m.get(k) ?? null;
    },
    setItem: (k: string, v: string) => {
      if (broken) throw new Error('kapalı');
      m.set(k, v);
    },
  });
  return m;
}

async function load() {
  vi.resetModules();
  const mod = await import('../../src/virus/tutorial');
  const game = fakeGame();
  const view = fakeView();
  const onFinish = vi.fn();
  const tut = new mod.VirusTutorial(game, view, mod.virusTutorialStore, { mode: 'keyboard', onFinish });
  return { mod, game, view, onFinish, tut };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.unstubAllGlobals());

describe('kayıt', () => {
  it('kayıt yokken öğretici çalışır', async () => {
    memStorage();
    const { tut } = await load();
    expect(tut.shouldRun()).toBe(true);
  });
  it('bozuk kayıt ya da kapalı depo: çalışır, çökmez', async () => {
    memStorage({ fn_virus_tutorial: '"x"' });
    expect((await load()).tut.shouldRun()).toBe(true);
    memStorage({ fn_virus_tutorial: '{"done":"yes"}' });
    expect((await load()).tut.shouldRun()).toBe(true);
    memStorage({}, true);
    const { tut } = await load();
    expect(tut.shouldRun()).toBe(true);
    expect(() => tut.skip()).not.toThrow();
  });
});

describe('adımlar', () => {
  it('selam → kapsül → dörtlü → virüs (alkış) → lens → bitti', async () => {
    const m = memStorage();
    const { game, view, onFinish, tut } = await load();
    tut.begin();
    expect(view.shown.at(-1)).toMatchObject({ step: 'selam', index: 0, pose: 'selam', next: true });
    game.emit('move', {}); // yanlış adım: ilerlemez
    expect(view.shown.at(-1)?.step).toBe('selam');
    tut.next();
    expect(view.shown.at(-1)).toMatchObject({ step: 'kapsul', pose: 'goster', next: false });
    game.emit('rotate', {});
    expect(view.shown.at(-1)?.step).toBe('dortlu');
    game.emit('clear', clear(0));
    expect(view.shown.at(-1)?.step).toBe('virus');
    game.emit('clear', clear(0)); // virüssüz silme virüs adımını geçmez
    expect(view.shown.at(-1)?.step).toBe('virus');
    game.emit('clear', clear(1));
    expect(view.shown.at(-1)?.pose).toBe('alkis');
    vi.advanceTimersByTime(1300);
    expect(view.shown.at(-1)).toMatchObject({ step: 'lens', next: true });
    tut.next();
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(view.visible).toBe(false);
    expect(m.get('fn_virus_tutorial')).toBe('{"done":true}');
    expect(tut.shouldRun()).toBe(false);
  });
  it('ilk silme virüs içeriyorsa dörtlü ve virüs adımları birlikte geçilir', async () => {
    memStorage();
    const { game, view, tut } = await load();
    tut.begin();
    tut.next();
    game.emit('move', {});
    game.emit('clear', clear(1));
    expect(view.shown.at(-1)).toMatchObject({ step: 'virus', pose: 'alkis' });
  });
  it('Atla: kalıcı işaret + onFinish', async () => {
    const m = memStorage();
    const { onFinish, tut, view } = await load();
    tut.begin();
    tut.skip();
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(view.visible).toBe(false);
    expect(m.get('fn_virus_tutorial')).toBe('{"done":true}');
    expect(tut.shouldRun()).toBe(false);
  });
  it('restart bir kez daha açar', async () => {
    memStorage({ fn_virus_tutorial: '{"done":true}' });
    const { tut } = await load();
    expect(tut.shouldRun()).toBe(false);
    tut.restart();
    expect(tut.shouldRun()).toBe(true);
    tut.begin();
    tut.skip();
    expect(tut.shouldRun()).toBe(false);
  });
  it('mola: kart gizlenir; devam: aynı adım', async () => {
    memStorage();
    const { view, tut } = await load();
    tut.begin();
    tut.next();
    tut.onPause();
    expect(view.visible).toBe(false);
    tut.onResume();
    expect(view.visible).toBe(true);
    expect(view.shown.at(-1)?.step).toBe('kapsul');
  });
  it('dokunmatik anlatım', async () => {
    memStorage();
    const { mod, view, tut } = await load();
    tut.begin();
    tut.next();
    tut.setMode('touch');
    expect(view.shown.at(-1)?.text).toBe(mod.VIRUS_TUT_COPY.kapsul.touch);
  });
});

describe('öğretici kartı (DOM)', () => {
  it('Elif çizimi, sayaç, metin ve Devam görünürlüğü', async () => {
    const { installFakeDom } = await import('../helpers/fakeDom');
    const dom = installFakeDom();
    vi.resetModules();
    const { createVirusTutorialView } = await import('../../src/virus/tutorialView');
    const skip = vi.fn(),
      next = vi.fn();
    const v = createVirusTutorialView({ skip, next });
    v.show({ step: 'selam', index: 0, total: 5, pose: 'selam', text: 'Merhaba', next: true });
    expect(dom.el('virus-tut').hidden).toBe(false);
    expect(dom.el('vt-step').textContent).toBe('Öğretici · 1/5');
    expect(dom.el('vt-text').textContent).toBe('Merhaba');
    expect(dom.el('vt-next').hidden).toBe(false);
    v.show({ step: 'kapsul', index: 1, total: 5, pose: 'goster', text: 'Kaydır', next: false });
    expect(dom.el('vt-next').hidden).toBe(true);
    dom.el('vt-skip').dispatch('click');
    dom.el('vt-next').dispatch('click');
    expect(skip).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledTimes(1);
    v.hide();
    expect(dom.el('virus-tut').hidden).toBe(true);
  });
});

describe('otomatik geçiş (Devam zorunlu değil)', () => {
  it('selam 4 sn sonra kendiliğinden kapsül adımına geçer', async () => {
    memStorage();
    const { view, tut, mod } = await load();
    tut.begin();
    vi.advanceTimersByTime(mod.AUTO_MS.selam - 50);
    expect(view.shown.at(-1)?.step).toBe('selam');
    vi.advanceTimersByTime(100);
    expect(view.shown.at(-1)?.step).toBe('kapsul');
  });
  it('lens 5 sn sonra öğreticiyi kendiliğinden bitirir', async () => {
    const m = memStorage();
    const { game, onFinish, tut, mod } = await load();
    tut.begin();
    tut.next();
    game.emit('move', {});
    game.emit('clear', clear(1));
    vi.advanceTimersByTime(1300); // alkış → lens
    vi.advanceTimersByTime(mod.AUTO_MS.lens + 50);
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(m.get('fn_virus_tutorial')).toBe('{"done":true}');
  });
  it('mola sırasında süre durur, devamda kalan süre kadar bekler', async () => {
    memStorage();
    const { view, tut, mod } = await load();
    tut.begin();
    vi.advanceTimersByTime(2000);
    tut.onPause();
    vi.advanceTimersByTime(10_000);
    tut.onResume();
    expect(view.shown.at(-1)?.step).toBe('selam');
    vi.advanceTimersByTime(mod.AUTO_MS.selam - 2000 + 50);
    expect(view.shown.at(-1)?.step).toBe('kapsul');
  });
});

describe('gözden geçirme düzeltmesi: alkış sırasında mola', () => {
  it('mola sırasında alkış zamanlayıcısı ilerlemez; öğretici molada bitmez, devamda lens gelir', async () => {
    memStorage();
    const { game, view, onFinish, tut } = await load();
    tut.begin();
    tut.next();
    game.emit('move', {});
    game.emit('clear', clear(1)); // alkış
    tut.onPause();
    vi.advanceTimersByTime(10_000);
    expect(onFinish).not.toHaveBeenCalled();
    expect(view.visible).toBe(false);
    tut.onResume();
    vi.advanceTimersByTime(1300);
    expect(view.shown.at(-1)?.step).toBe('lens');
    expect(onFinish).not.toHaveBeenCalled();
  });
});
