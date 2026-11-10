// NS4-44: Virüs Avı saf kuralları: bölüm parametreleri, renksiz 4'lü, düşme, virüs yerleşimi.
import { describe, expect, it } from 'vitest';
import { COLS, VIS } from '../../src/config/gameConfig';
import { seeded } from '../../src/game/Game';
import { levelParams } from '../../src/virus/config';
import {
  CAPSULE,
  EMPTY,
  VIRUS,
  fallStep,
  findRuns,
  newGrid,
  placeViruses,
  removeCells,
  type Grid,
} from '../../src/virus/rules';

const at = (x: number, y: number) => y * COLS + x;
function put(g: Grid, x: number, y: number, kind: number, tint = 0, link = -1) {
  const i = at(x, y);
  g.kind[i] = kind;
  g.tint[i] = tint;
  g.link[i] = link;
}

describe('levelParams', () => {
  it('1. bölüm', () => {
    expect(levelParams(1)).toEqual({ count: 6, maxHeight: 8, timeMs: 75_000, gravityMs: 800 });
  });
  it('14. bölüm 58 virüs, 20. bölüm sınırları', () => {
    expect(levelParams(14).count).toBe(58);
    expect(levelParams(20)).toMatchObject({ count: 60, maxHeight: 13, timeMs: 300_000 });
  });
  it('düşme aralığı 120 ms altına inmez', () => {
    for (let l = 1; l <= 20; l++) expect(levelParams(l).gravityMs).toBeGreaterThanOrEqual(120);
  });
});

describe('findRuns (renk fark etmez)', () => {
  it('yatay karışık 4 bulunur', () => {
    const g = newGrid();
    put(g, 2, 19, CAPSULE, 0);
    put(g, 3, 19, VIRUS, 1);
    put(g, 4, 19, CAPSULE, 3);
    put(g, 5, 19, CAPSULE, 2);
    expect(findRuns(g)).toEqual([at(2, 19), at(3, 19), at(4, 19), at(5, 19)]);
  });
  it('yatay 3 bulunmaz', () => {
    const g = newGrid();
    for (const x of [0, 1, 2]) put(g, x, 19, CAPSULE);
    expect(findRuns(g)).toEqual([]);
  });
  it('dikey 5 → 5 indeks', () => {
    const g = newGrid();
    for (let y = 15; y < 20; y++) put(g, 7, y, CAPSULE);
    expect(findRuns(g)).toHaveLength(5);
  });
  it('kesişen T şekli → 7 tekil indeks', () => {
    const g = newGrid();
    for (let x = 2; x < 6; x++) put(g, x, 16, CAPSULE);
    for (let y = 16; y < 20; y++) put(g, 4, y, CAPSULE);
    const r = findRuns(g);
    expect(r).toHaveLength(7);
    expect(new Set(r).size).toBe(7);
  });
});

describe('fallStep', () => {
  it('virüs düşmez', () => {
    const g = newGrid();
    put(g, 3, 5, VIRUS, 1);
    expect(fallStep(g)).toBe(false);
    expect(g.kind[at(3, 5)]).toBe(VIRUS);
  });
  it('tek yarı düşer', () => {
    const g = newGrid();
    put(g, 3, 5, CAPSULE, 2);
    expect(fallStep(g)).toBe(true);
    expect(g.kind[at(3, 6)]).toBe(CAPSULE);
    expect(g.tint[at(3, 6)]).toBe(2);
    expect(g.kind[at(3, 5)]).toBe(EMPTY);
  });
  it('yatay çiftin bir yarısının altı doluysa ikisi de durur', () => {
    const g = newGrid();
    put(g, 3, 5, CAPSULE, 0, 1);
    put(g, 4, 5, CAPSULE, 1, 3);
    put(g, 4, 6, VIRUS, 0);
    expect(fallStep(g)).toBe(false);
  });
  it('yatay çift iki yarının altı boşsa birlikte düşer, bağı korunur', () => {
    const g = newGrid();
    put(g, 3, 5, CAPSULE, 0, 1);
    put(g, 4, 5, CAPSULE, 1, 3);
    expect(fallStep(g)).toBe(true);
    expect(g.link[at(3, 6)]).toBe(1);
    expect(g.link[at(4, 6)]).toBe(3);
  });
  it('dikey çift alt yarının altı boşsa birlikte düşer', () => {
    const g = newGrid();
    put(g, 3, 4, CAPSULE, 0, 2);
    put(g, 3, 5, CAPSULE, 1, 0);
    expect(fallStep(g)).toBe(true);
    expect(g.kind[at(3, 4)]).toBe(EMPTY);
    expect(g.link[at(3, 5)]).toBe(2);
    expect(g.link[at(3, 6)]).toBe(0);
  });
  it('removeCells eşi koparır, kalan yarı tek başına düşer', () => {
    const g = newGrid();
    put(g, 3, 5, CAPSULE, 0, 1);
    put(g, 4, 5, CAPSULE, 1, 3);
    put(g, 4, 6, VIRUS, 2);
    put(g, 3, 6, VIRUS, 0);
    const r = removeCells(g, [at(3, 6), at(3, 5)]);
    expect(r.viruses).toEqual([{ i: at(3, 6), type: 0 }]);
    expect(g.link[at(4, 5)]).toBe(-1);
    // 4,5 virüs üstünde durur; düşecek bir şey yok
    expect(fallStep(g)).toBe(false);
  });
  it('düşecek bir şey yokken false', () => {
    expect(fallStep(newGrid())).toBe(false);
  });
  it('alt sıradaki kapsül düşmez', () => {
    const g = newGrid();
    put(g, 0, VIS - 1, CAPSULE);
    expect(fallStep(g)).toBe(false);
  });
});

describe('placeViruses', () => {
  for (let l = 1; l <= 20; l++) {
    it(`bölüm ${l}: sayı, 4'lü yok, alt bölgede, türler dengeli`, () => {
      const g = newGrid();
      const n = placeViruses(g, l, seeded(42 + l));
      const p = levelParams(l);
      expect(n).toBe(p.count);
      expect(findRuns(g)).toEqual([]);
      const types = [0, 0, 0];
      for (let i = 0; i < g.kind.length; i++) {
        if (g.kind[i] !== VIRUS) continue;
        expect(Math.floor(i / COLS)).toBeGreaterThanOrEqual(VIS - p.maxHeight);
        types[g.tint[i] ?? 0] = (types[g.tint[i] ?? 0] ?? 0) + 1;
      }
      expect(Math.max(...types) - Math.min(...types)).toBeLessThanOrEqual(1);
    });
  }
  it('aynı tohum aynı tahta', () => {
    const a = newGrid(),
      b = newGrid();
    placeViruses(a, 7, seeded(9));
    placeViruses(b, 7, seeded(9));
    expect([...a.kind]).toEqual([...b.kind]);
    expect([...a.tint]).toEqual([...b.tint]);
  });
});
