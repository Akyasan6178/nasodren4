// NS4-44: VirusView (Pixi, render olmadan): hücre havuzu, konumlar, görünürlük, kapsül yarısı dokuları.
import { beforeEach, describe, expect, it } from 'vitest';
import type * as PIXI from 'pixi.js';
import { stubCanvasDom } from '../helpers/pixiView';
import { computeLayout } from '../../src/rendering/layout';
import { COLS } from '../../src/config/gameConfig';

beforeEach(() => stubCanvasDom());

async function setup() {
  const { Container } = await import('pixi.js');
  const { VirusView } = await import('../../src/virus/VirusView');
  const { VirusGame } = await import('../../src/virus/VirusGame');
  const rules = await import('../../src/virus/rules');
  const game = new VirusGame();
  game.reset({ seed: 1 });
  const app = { stage: new Container(), renderer: { resolution: 1 } } as unknown as PIXI.Application<HTMLCanvasElement>;
  const view = new VirusView(app, game);
  const L = computeLayout(1366, 768);
  view.layout(L);
  return { view, game, rules, L };
}

describe('VirusView', () => {
  it('boş tahtada görünür hücre yok', async () => {
    const { view, game, rules } = await setup();
    rules.clearGrid(game.grid);
    view.syncAll();
    expect(view.cells.filter((s) => s.visible)).toHaveLength(0);
  });

  it('1 virüs + 2 kapsül yarısı → 3 görünür hücre, virüs doğru konumda', async () => {
    const { view, game, rules, L } = await setup();
    rules.clearGrid(game.grid);
    const at = (x: number, y: number) => y * COLS + x;
    game.grid.kind[at(3, 19)] = rules.VIRUS;
    game.grid.kind[at(4, 19)] = rules.CAPSULE;
    game.grid.link[at(4, 19)] = 1;
    game.grid.kind[at(5, 19)] = rules.CAPSULE;
    game.grid.link[at(5, 19)] = 3;
    view.syncAll();
    expect(view.cells.filter((s) => s.visible)).toHaveLength(3);
    const v = view.cells[at(3, 19)];
    expect(v.x).toBeCloseTo(L.board.x + 3.5 * L.cell);
    expect(v.y).toBeCloseTo(L.board.y + 19.5 * L.cell);
  });

  it('düşen kapsülün iki yarısı ve sıradaki kapsül görünür', async () => {
    const { view } = await setup();
    view.syncAll();
    expect(view.active.filter((s) => s.visible)).toHaveLength(2);
    expect(view.nextS.filter((s) => s.visible)).toHaveLength(2);
  });

  it('kök kap dışarıdan gizlenebilir', async () => {
    const { view } = await setup();
    view.root.visible = false;
    expect(view.root.visible).toBe(false);
  });

  it('kapsül yarısı dokusu dört yön için px×px canvas', async () => {
    const { createCapsuleHalfCanvas, CAPSULE_COLORS } = await import('../../src/virus/art');
    for (const side of [0, 1, 2, 3, -1] as const) {
      const cv = createCapsuleHalfCanvas(32, CAPSULE_COLORS[0], side);
      expect(cv.width).toBe(32);
      expect(cv.height).toBe(32);
    }
  });
});

describe('tahtadaki virüsler sade (kollu bacaklı olanlar yalnızca lenste)', () => {
  it('virüs hücresi tek kare, ortadan hizalı, hücrenin 1,18 katı', async () => {
    const { view, game, rules, L } = await setup();
    rules.clearGrid(game.grid);
    const i = 19 * COLS + 3;
    game.grid.kind[i] = rules.VIRUS;
    view.syncAll();
    const s = view.cells[i];
    expect(s.anchor.x).toBe(0.5);
    expect(s.anchor.y).toBe(0.5);
    expect(s.width).toBeCloseTo(L.cell * 1.18);
  });
  it('tahta görselleri sade virüs dosyalarından yüklenir', async () => {
    const art = await import('../../src/virus/art');
    expect(art.VIRUS_ART_URLS.every((u) => /virus-\d\.webp$/.test(u))).toBe(true);
    expect('virusFrame' in art).toBe(false);
  });
});
