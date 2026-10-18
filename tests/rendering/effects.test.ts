// NS4-15: geri bildirim efektleri. Tarifler saf veridir; GameView gerçek Pixi sahne nesneleriyle (render olmadan,
// sahte canvas) kurulur. Blok dokusu, atlas ve mekanik süreler efektlerden etkilenmemelidir.
import { beforeEach, describe, expect, it } from 'vitest';
import { CFG, COLS, VIS } from '../../src/config/gameConfig';
import { PIECE } from '../../src/game/pieces';
import type { Game } from '../../src/game/Game';
import {
  Budget,
  GARBAGE_FX,
  LINE_FX,
  REBOUND_FX,
  REDUCED,
  flavorOf,
  glowAlpha,
  motionScale,
} from '../../src/rendering/effects';
import type { View } from '../../src/rendering/GameView';
import {
  clearBoard,
  createGame,
  dropVerticalI,
  fillRow,
  finishClear,
  placePiece,
  setCell,
  setupWell,
  stackRows,
} from '../helpers/gameHelpers';
import { createView, stubCanvasDom, type ViewHarness } from '../helpers/pixiView';

describe('efekt tarifleri (saf)', () => {
  it('temizleme dili: T-spin satırı Nörorefleks, dört satır Ozmotik, diğerleri drenaj', () => {
    expect(flavorOf({ n: 1, tspin: 0 })).toBe('drain');
    expect(flavorOf({ n: 3, tspin: 0 })).toBe('drain');
    expect(flavorOf({ n: 4, tspin: 0 })).toBe('osmotic');
    expect(flavorOf({ n: 2, tspin: 2 })).toBe('neuro');
    expect(flavorOf({ n: 1, tspin: 1 })).toBe('neuro');
    expect(flavorOf({ n: 0, tspin: 2 })).toBe('drain'); // satırsız T-spin temizleme dili değil, yalnızca kıvılcım
  });

  it('reduced motion sarsıntı ve parçacıkları belirgin biçimde azaltır, titreşimli vuruşu kapatır', () => {
    expect(motionScale(false)).toEqual({ shake: 1, particles: 1, glow: 1, flicker: true });
    const r = motionScale(true);
    expect(r.shake).toBeLessThanOrEqual(0.3);
    expect(r.particles).toBeLessThanOrEqual(0.35);
    expect(r.flicker).toBe(false);
    expect(r).toMatchObject(REDUCED);
  });

  it('ışıma eğrisi uçlarda 0, tepeyi aşmaz, süre bitince 0', () => {
    for (const beats of [1, 2]) {
      expect(glowAlpha(0, 0.3, beats)).toBe(0);
      expect(glowAlpha(1, 0.3, beats)).toBe(0);
      for (let p = 0; p < 1; p += 0.01) expect(glowAlpha(p, 0.3, beats)).toBeLessThanOrEqual(0.3);
    }
    expect(glowAlpha(0.25, 0.3, 2)).toBeGreaterThan(0.2); // iki vuruşun ilk tepesi
  });

  it('parçacık bütçesi kesirleri biriktirir (deterministik)', () => {
    const b = new Budget();
    let sum = 0;
    for (let i = 0; i < 10; i++) sum += b.take(2, 0.3);
    expect(sum).toBe(6);
    expect(new Budget().take(3, 1)).toBe(3);
  });

  it('Ozmotik, Nörorefleks ve sentetik farklı görsel dillerde', () => {
    expect(LINE_FX.osmotic.bloom).toBeGreaterThan(0);
    expect(LINE_FX.osmotic.splash).toBeGreaterThan(LINE_FX.drain.splash);
    expect(LINE_FX.neuro.streak).toBeGreaterThan(0);
    expect(LINE_FX.neuro.splash).toBe(0);
    expect(LINE_FX.syn.flash).not.toBe(LINE_FX.drain.flash);
    expect(REBOUND_FX.tint).toBe(0xff5a1f);
    expect(REBOUND_FX.dur).toBeLessThanOrEqual(700);
  });

  it('mekanik süreler değişmedi', () => {
    expect([CFG.lineClearMs, CFG.synClearMs, CFG.drainMs]).toEqual([300, 260, 800]);
  });
});

// ---- GameView ----
let H: ViewHarness;
let g: Game;
let v: View;
const live = () => v.parts.filter((p) => p.life > 0);
const countNodes = (c: { children: readonly unknown[] }): number =>
  c.children.reduce<number>((n, ch) => n + 1 + countNodes(ch as { children: readonly unknown[] }), 0);

/** events.ts'teki view bağlantılarının görsel alt kümesi (ses/popup yok). */
function wire() {
  g.on('lock', (cells) => v.onLock(cells));
  g.on('harddrop', (d) => v.onHard(d));
  g.on('scored', (e) => v.onScored(e));
  g.on('clearstart', (e) => v.onClearStart(e));
  g.on('clearend', () => v.onClearEnd());
  g.on('garbage', () => v.onGarbage());
  g.on('powerdone', (e) => {
    if (e.kind === 'syn' && e.rebound) v.onRebound();
  });
}

/** Görsel durumun tamamen temiz olduğunu doğrular (efekt sonrası temizlik). */
function expectClean() {
  expect(v.anim).toBeNull();
  expect(v.flashes.every((f) => !f.visible && f.height === v.L.cell)).toBe(true);
  expect(v.wave.visible).toBe(false);
  expect(v.crest.visible).toBe(false);
  expect([v.glow.on, v.glow.s.visible, v.band.on, v.band.s.visible]).toEqual([false, false, false, false]);
  expect(v.glow.edges.every((e) => !e.visible && e.alpha === 0)).toBe(true);
  expect(live()).toHaveLength(0);
  expect(v.shake).toBe(0);
  expect([v.boardC.x, v.boardC.y]).toEqual([v.L.board.x, v.L.board.y]);
  // blok hücreleri dokunulmamış: yalnızca atlas dokuları, tam boy, opak, renksiz
  const blockTex = new Set(Object.values(v.tex));
  for (const s of v.cells.filter((x) => x.visible)) {
    expect(blockTex.has(s.texture)).toBe(true);
    expect([s.alpha, s.tint]).toEqual([1, 0xffffff]);
    expect(s.scale.x).toBeCloseTo(v.L.cell / s.texture.orig.width, 6);
    expect(s.scale.y).toBeCloseTo(v.L.cell / s.texture.orig.width, 6);
  }
}

beforeEach(async () => {
  stubCanvasDom();
  g = createGame(3);
  H = await createView(g);
  v = H.view;
  wire();
});

describe('GameView efektleri: başlama, bitiş ve temizlik', () => {
  it('tek satır drenajı: flaş + damlalar, mekanik süresinde biter, iz bırakmaz', () => {
    setupWell(g, 1);
    const base = v.atlasBase;
    dropVerticalI(g);
    expect(v.anim).toMatchObject({ kind: 'lines', flavor: 'drain', dur: CFG.lineClearMs });
    expect(v.flashes[0].visible).toBe(true);
    expect(v.flashes[0].tint).toBe(LINE_FX.drain.flash);
    expect(live().length).toBeGreaterThanOrEqual(COLS * 3); // hücre başına 2 sıçrama + 1 süzülme
    H.step(CFG.lineClearMs);
    finishClear(g);
    expect(v.anim).toBeNull();
    H.step(1500);
    expectClean();
    expect(v.atlasBase).toBe(base); // efekt yeni atlas/doku üretmez
  });

  it('Tetris → Ozmotik: büyüyen flaş, turkuaz ışıma, belirgin sarsıntı', () => {
    setupWell(g, 4);
    dropVerticalI(g);
    expect(v.anim?.flavor).toBe('osmotic');
    expect(v.flavor).toBe('drain'); // tüketildi
    expect(v.glow.on).toBe(true);
    expect(v.glow.s.tint).toBe(LINE_FX.osmotic.glow);
    expect(v.shake).toBeGreaterThanOrEqual(LINE_FX.osmotic.shake);
    H.step(CFG.lineClearMs - 16);
    expect(v.flashes[0].height).toBeGreaterThan(v.L.cell * 1.5);
    finishClear(g);
    H.step(1500);
    expectClean();
  });

  it('T-spin → Nörorefleks: T merkezinden sönümlü, yerçekimsiz kıvılcımlar ve yatay çizgiler', () => {
    // NS4-01 T-spin double tahtası (scoring.test.ts ile aynı)
    clearBoard(g);
    fillRow(g, 21, PIECE.L, [4]);
    fillRow(g, 20, PIECE.L, [3, 4, 5]);
    setCell(g, 3, 19, PIECE.L);
    placePiece(g, PIECE.T, 1, 3, 19);
    expect(g.rotate(1)).toBe(true);
    expect(g.tspinKind()).toBe(2);
    g.hardDrop();
    expect(v.anim?.flavor).toBe('neuro');
    const sparks = live().filter((p) => p.drag > 0 && p.g === 0);
    expect(sparks.length).toBeGreaterThanOrEqual(12 + COLS * 2 * 2 - 4);
    expect(sparks.some((p) => p.sx > 1 && p.sy < 1)).toBe(true); // yatay çizgi
    finishClear(g);
    H.step(1500);
    expectClean();
  });

  it('satırsız T-spin: yalnızca küçük kıvılcım, temizleme dili değişmez', () => {
    v.lastLock = [20 * COLS + 3, 20 * COLS + 4, 20 * COLS + 5, 21 * COLS + 4];
    v.onScored({ n: 0, tspin: 2 });
    expect(live()).toHaveLength(6);
    expect(v.flavor).toBe('drain');
    H.step(800);
    expect(live()).toHaveLength(0);
  });

  it('sentetik: hızlı ve keskin (kırmızı flaş, yatay çizgiler, hücre sıkışması)', () => {
    stackRows(g, 7);
    expect(g.useSyn()).toBe(true);
    expect(v.anim).toMatchObject({ kind: 'syn', dur: CFG.synClearMs });
    expect(v.flashes[0].tint).toBe(LINE_FX.syn.flash);
    expect(live().every((p) => p.sx > 1 && p.drag > 0)).toBe(true);
    H.step(CFG.synClearMs * 0.7);
    const s = v.cells[(VIS - 1) * COLS];
    expect(s.scale.y).toBeLessThan(s.scale.x * 0.2);
    finishClear(g);
    H.step(1500);
    expectClean();
  });

  it('rebound: kısa kırmızı-turuncu iki vuruşlu uyarı, sonra kapanır', () => {
    for (let i = 0; i < 2; i++) {
      stackRows(g, 7);
      g.useSyn();
      finishClear(g);
    }
    expect(v.glow.on).toBe(true);
    expect([v.glow.s.tint, v.glow.beats, v.glow.peak]).toEqual([REBOUND_FX.tint, 2, REBOUND_FX.peak]);
    // kenar çerçevesi zeminden belirgin (kırmızı-turuncu), tahta kenarlarında
    expect(v.glow.edges.every((e) => e.visible && e.tint === REBOUND_FX.tint)).toBe(true);
    H.step(160);
    expect(v.glow.edges[0].alpha).toBeGreaterThan(v.glow.s.alpha * 4);
    expect(v.glow.edges[3].x + v.glow.edges[3].width).toBeCloseTo(COLS * v.L.cell, 6);
    H.step(REBOUND_FX.dur + 1500);
    expectClean();
  });

  it('garbage: alt bantta gri vuruş, yukarı toz ve sarsıntı; garbage dokusu aynı', () => {
    g.reboundT = 10000;
    g.garbageT = 1;
    g.update(16);
    expect(v.band.on).toBe(true);
    expect(v.band.s.y).toBe((VIS - 1) * v.L.cell);
    expect(v.shake).toBeCloseTo(GARBAGE_FX.shake, 6);
    expect(live()).toHaveLength(GARBAGE_FX.puffs);
    v.syncBoard();
    const bottom = v.cells.slice((VIS - 1) * COLS).filter((s) => s.visible);
    expect(bottom.every((s) => s.texture === v.tex[PIECE.GARBAGE])).toBe(true);
    H.step(1500);
    expectClean();
  });

  it('sıklamen: dalga + tepe şeridi, hücreler çözünür; bitişte ×2 vuruşu, sonra tamamen temiz', () => {
    stackRows(g, 8);
    expect(g.useCyc()).toBe(true);
    expect([v.wave.visible, v.crest.visible]).toEqual([true, true]);
    H.step(CFG.drainMs);
    const dissolved = v.anim?.done?.reduce((a, b) => a + b, 0) ?? 0;
    expect(dissolved).toBeGreaterThan(8 * 8); // sıvıya giren hücreler bir kez parçacık salar
    expect(v.cells[(VIS - 1) * COLS].tint).not.toBe(0xffffff); // çözünürken pembeleşir (doku aynı)
    finishClear(g);
    expect(v.anim?.recede).toBe(0);
    expect(v.glow.on).toBe(true);
    expect(v.glow.s.tint).toBe(0xff79bd);
    H.step(2000);
    expectClean();
  });

  it('resetFx yeni oyunda süren her efekti temizler', () => {
    setupWell(g, 4);
    dropVerticalI(g);
    v.onRebound();
    v.onGarbage();
    H.step(50);
    v.resetFx();
    g.reset();
    v.syncAll();
    expect(v.overT).toBe(-1);
    expectClean();
  });
});

describe('reduced motion', () => {
  function tetrisParticles(reduced: boolean) {
    v.reducedMotion = reduced;
    v.budget.reset();
    setupWell(g, 4);
    v.shake = 0;
    dropVerticalI(g);
    const n = live().length,
      shake = v.shake;
    finishClear(g);
    H.step(1500);
    return { n, shake };
  }

  it('Tetris: parçacık ve sarsıntı belirgin biçimde az; süre ve durum aynı', () => {
    const full = tetrisParticles(false);
    const red = tetrisParticles(true);
    expect(red.n).toBeLessThanOrEqual(Math.ceil(full.n * 0.35));
    expect(red.n).toBeGreaterThan(0);
    expect(red.shake).toBeLessThanOrEqual(full.shake * 0.3);
    expectClean();
  });

  it('hard drop, garbage ve rebound sarsıntısı azalır; rebound tek, yumuşak vuruş', () => {
    v.reducedMotion = true;
    v.onHard(18);
    expect(v.shake).toBeLessThanOrEqual(0.25);
    v.shake = 0;
    v.onGarbage();
    expect(v.shake).toBeLessThanOrEqual(GARBAGE_FX.shake * 0.3);
    expect(live().length).toBeLessThanOrEqual(3);
    v.onRebound();
    expect(v.glow.beats).toBe(1);
    expect(v.glow.peak).toBeCloseTo(REBOUND_FX.peak * REDUCED.glow, 6);
    H.step(2000);
    expectClean();
  });

  it('mekanik zamanlama değişmez (aynı süre sonunda temizleme biter)', () => {
    v.reducedMotion = true;
    setupWell(g, 2);
    dropVerticalI(g);
    expect(g.stateT).toBe(CFG.lineClearMs);
    expect(v.anim?.dur).toBe(CFG.lineClearMs);
    g.update(CFG.lineClearMs);
    expect(g.state).toBe('play');
  });
});

describe('performans ve dayanıklılık', () => {
  it('parçacık havuzu taşmaz: art arda 25 Tetris + sıklamen + garbage', () => {
    const nodes = countNodes(v.app.stage);
    for (let i = 0; i < 25; i++) {
      setupWell(g, 4);
      dropVerticalI(g);
      v.onGarbage();
      H.step(48);
      finishClear(g);
    }
    stackRows(g, 8);
    g.useCyc();
    H.step(CFG.drainMs);
    expect(v.parts).toHaveLength(420);
    expect(v.pc.children).toHaveLength(420);
    expect(v.partIdx).toBeGreaterThanOrEqual(0);
    expect(v.partIdx).toBeLessThan(420);
    expect(live().length).toBeLessThanOrEqual(420);
    expect(countNodes(v.app.stage)).toBe(nodes); // sahneye yeni nesne eklenmez
    finishClear(g);
    H.step(2500);
    expectClean();
  });

  it('aktif efekt sırasında resize güvenli: Tetris ve sıklamen ortasında boyut değişimi', () => {
    const nodes = countNodes(v.app.stage);
    setupWell(g, 4);
    dropVerticalI(g);
    v.onRebound();
    H.step(100);
    H.resize(390, 844);
    const c = v.L.cell;
    expect(live()).toHaveLength(0); // eski ölçüdeki parçacıklar bırakıldı
    expect(v.flashes[0].width).toBeCloseTo(COLS * c, 6);
    expect(v.glow.s.width).toBeCloseTo(COLS * c, 6);
    expect(v.glow.s.height).toBeCloseTo(VIS * c, 6);
    H.step(100);
    expect(v.flashes[0].y).toBeLessThanOrEqual(v.anim!.rows[0] * c);
    finishClear(g);
    H.step(1500);
    expectClean();

    stackRows(g, 8);
    g.useCyc();
    H.step(300);
    H.resize(1920, 1080);
    H.step(16);
    expect(v.wave.width).toBeCloseTo(COLS * v.L.cell, 6);
    expect(v.wave.y + v.wave.height).toBeCloseTo(VIS * v.L.cell, 4);
    H.resize(844, 390);
    H.step(CFG.drainMs);
    finishClear(g);
    H.step(2000);
    expectClean();
    expect(countNodes(v.app.stage)).toBe(nodes);
  });
});
