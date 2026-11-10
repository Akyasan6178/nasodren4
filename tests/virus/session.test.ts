// NS4-44: Virüs Avı oturumu ve mod yönlendirme: ilk giriş öğreticisi, mola/devam (geçişte süre), oyun sonu kaydı,
// klasik ↔ Virüs Avı geçişinde HUD modu, Pixi kapları ve kontrol hedefi.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAppStubs } from '../helpers/appStubs';
import { installFakeDom, type FakeDom } from '../helpers/fakeDom';
import { createGame } from '../helpers/gameHelpers';
import { COLS } from '../../src/config/gameConfig';
import type { VirusGame } from '../../src/virus/VirusGame';
import type * as Rules from '../../src/virus/rules';

let dom: FakeDom;
let mem: Map<string, string>;
beforeEach(() => {
  vi.useFakeTimers();
  dom = installFakeDom();
  mem = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => void mem.set(k, v),
    removeItem: (k: string) => void mem.delete(k),
  });
});
afterEach(() => vi.unstubAllGlobals());

async function load() {
  vi.resetModules();
  const { createLifecycle } = await import('../../src/app/lifecycle');
  const { createVirusSession, VIRUS_RULESET } = await import('../../src/virus/session');
  const { createModeRouter } = await import('../../src/virus/modeRouter');
  const { VirusGame } = await import('../../src/virus/VirusGame');
  const { VirusTutorial, virusTutorialStore } = await import('../../src/virus/tutorial');
  const { createVirusTutorialView } = await import('../../src/virus/tutorialView');
  const { createVirusHud } = await import('../../src/virus/hud');
  const rules = await import('../../src/virus/rules');
  const { meta } = await import('../../src/storage/progress');
  const classic = createGame(1);
  const stubs = createAppStubs(classic);
  const lc = createLifecycle(stubs.deps);
  const game = new VirusGame();
  const vview = { root: { visible: false }, syncAll: vi.fn(), update: vi.fn(), resetFx: vi.fn(), onGameOver: vi.fn() };
  const cview = { root: { visible: true } };
  const box: { onFinish: () => void } = { onFinish: () => {} };
  const tutorial = new VirusTutorial(
    game,
    createVirusTutorialView({ skip: () => tutorial.skip(), next: () => tutorial.next() }),
    virusTutorialStore,
    { mode: 'keyboard', onFinish: () => box.onFinish() },
  );
  const session = createVirusSession({
    app: stubs.deps.app,
    sound: stubs.deps.sound,
    buzz: stubs.deps.buzz,
    resetInput: () => {},
    game,
    view: vview,
    hud: createVirusHud(),
    tutorial,
  });
  box.onFinish = () => session.onTutorialFinish();
  const router = createModeRouter({
    lifecycle: lc,
    session,
    classicGame: classic,
    classicView: cview,
    virusView: vview,
  });
  const step = (ms: number, dt = 16) => {
    for (let t = 0; t < ms; t += dt) if (router.mode() === 'virus') session.update(dt);
  };
  return { lc, session, router, game, tutorial, classic, vview, cview, rules, meta, VIRUS_RULESET, step };
}

/** Son virüsü silecek hazır tahta (yatay kapsül 3. sütuna). */
function lastVirus(game: VirusGame, rules: typeof Rules) {
  rules.clearGrid(game.grid);
  game.grid.kind[19 * COLS] = rules.VIRUS;
  game.grid.kind[19 * COLS + 1] = rules.CAPSULE;
  game.grid.kind[19 * COLS + 2] = rules.CAPSULE;
  game.cap = { x: 3, y: 0, rot: 0, a: 0, b: 1 };
}

describe('ilk giriş öğreticisi', () => {
  it('ilk girişte Elif açılır; atlanınca 1. bölüm; ikinci girişte öğretici yok', async () => {
    const { router, game, tutorial } = await load();
    router.startVirus();
    expect(game.tutorial).toBe(true);
    expect(dom.el('virus-tut').hidden).toBe(false);
    tutorial.skip();
    expect(game.tutorial).toBe(false);
    expect(game.level).toBe(1);
    router.toMenu();
    router.startVirus();
    expect(game.tutorial).toBe(false);
    expect(game.level).toBe(1);
    expect(dom.el('virus-tut').hidden).toBe(true);
  });
  it('"Nasıl oynanır"dan yeniden izleme öğreticiyi bir kez daha açar', async () => {
    mem.set('fn_virus_tutorial', '{"done":true}');
    const { router, game } = await load();
    router.startVirus({ forceTutorial: true });
    expect(game.tutorial).toBe(true);
  });
});

describe('mola ve bölüm geçişi', () => {
  it('geçişte mola: süre ve geçiş durur; devamda kaldığı yerden sürer', async () => {
    mem.set('fn_virus_tutorial', '{"done":true}');
    const { router, session, game, rules, step } = await load();
    router.startVirus();
    lastVirus(game, rules);
    game.hardDrop();
    step(400);
    expect(game.state).toBe('levelclear');
    const t = game.timeLeftMs;
    router.pause();
    expect(session.getState()).toBe('paused');
    step(5000);
    expect(game.state).toBe('levelclear');
    expect(game.timeLeftMs).toBe(t);
    router.resume();
    step(2000);
    expect(game.level).toBe(2);
    expect(game.state).toBe('play');
  });
});

describe('oyun sonu', () => {
  it('süre bitince yerel listeye virus-avi-v1 kaydı; klasik rekor değişmez', async () => {
    mem.set('fn_virus_tutorial', '{"done":true}');
    const { router, game, meta, VIRUS_RULESET, step, session } = await load();
    router.startVirus();
    game.score = 1234;
    game.timeLeftMs = 10;
    step(32);
    expect(session.getState()).toBe('over');
    const raw = JSON.parse(mem.get('fn_scores') ?? '{}') as { entries: { ruleset: string; score: number }[] };
    expect(raw.entries.filter((e) => e.ruleset === VIRUS_RULESET).map((e) => e.score)).toEqual([1234]);
    expect(meta.best).toBe(0);
    vi.advanceTimersByTime(1000);
    expect(dom.visibleScreen()).toBe('scr-over');
    expect(dom.el('o-title').textContent).toBe('Süre doldu');
  });
  it('20. bölüm bitince "Bütün virüsler temiz!"', async () => {
    mem.set('fn_virus_tutorial', '{"done":true}');
    const { router, game, rules, step } = await load();
    router.startVirus();
    game.startLevel(20);
    lastVirus(game, rules);
    game.hardDrop();
    step(2200);
    vi.advanceTimersByTime(1000);
    expect(dom.el('o-title').textContent).toBe('Bütün virüsler temiz!');
  });
});

describe('mod yönlendirme', () => {
  it('Virüs Avı → menü → klasik: HUD modu, Pixi kapları ve kontrol hedefi geçer; Tekrar son modu açar', async () => {
    mem.set('fn_virus_tutorial', '{"done":true}');
    const { router, lc, session, game, classic, vview, cview } = await load();
    router.startVirus();
    expect(dom.el('app').dataset['mode']).toBe('virus');
    expect(vview.root.visible).toBe(true);
    expect(cview.root.visible).toBe(false);
    expect(router.controls()).toBe(game);
    expect(router.getState()).toBe('playing');
    router.toMenu();
    expect(dom.visibleScreen()).toBe('scr-start');
    router.startClassic();
    expect(dom.el('app').dataset['mode']).toBe('classic');
    expect(vview.root.visible).toBe(false);
    expect(cview.root.visible).toBe(true);
    expect(router.controls()).toBe(classic);
    expect(lc.getState()).toBe('playing');
    router.again();
    expect(router.mode()).toBe('classic');
    router.toMenu();
    router.startVirus();
    router.again();
    expect(router.mode()).toBe('virus');
    expect(session.getState()).toBe('playing');
  });
});

describe('gözden geçirme düzeltmeleri', () => {
  it('final (complete) zaferinde tahta soluklaşmaz; süre bitiminde soluklaşır', async () => {
    mem.set('fn_virus_tutorial', '{"done":true}');
    const { router, game, rules, step, vview } = await load();
    router.startVirus();
    game.startLevel(20);
    lastVirus(game, rules);
    game.hardDrop();
    step(2200);
    expect(vview.onGameOver).not.toHaveBeenCalled();
    router.again();
    game.timeLeftMs = 10;
    step(32);
    expect(vview.onGameOver).toHaveBeenCalledTimes(1);
  });
  it('Virüs Avı → Ana menü: görünüm klasiğe döner (çok oyunculu geri sayımında eski tahta görünmez)', async () => {
    mem.set('fn_virus_tutorial', '{"done":true}');
    const { router, vview, cview } = await load();
    router.startVirus();
    router.toMenu();
    expect(router.mode()).toBe('classic');
    expect(dom.el('app').dataset['mode']).toBe('classic');
    expect(vview.root.visible).toBe(false);
    expect(cview.root.visible).toBe(true);
  });
});
