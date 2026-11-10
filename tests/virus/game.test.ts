// NS4-44: VirusGame motoru: doğma, döndürme, kilit, zincir ve puan, bölüm sonu, süre, öğretici tahtası.
import { describe, expect, it } from 'vitest';
import { COLS } from '../../src/config/gameConfig';
import { VIRUS_CFG } from '../../src/virus/config';
import { CAPSULE, VIRUS, clearGrid, type Grid } from '../../src/virus/rules';
import { VirusGame, capsuleCells } from '../../src/virus/VirusGame';

const at = (x: number, y: number) => y * COLS + x;
function put(g: Grid, x: number, y: number, kind: number, tint = 0) {
  g.kind[at(x, y)] = kind;
  g.tint[at(x, y)] = tint;
  g.link[at(x, y)] = -1;
}
function run(game: VirusGame, ms: number, step = 16) {
  for (let t = 0; t < ms && game.state !== 'over'; t += step) game.update(step);
}
function virusCount(g: Grid) {
  return g.kind.reduce((n, k) => n + (k === VIRUS ? 1 : 0), 0);
}

describe('doğma ve kaybetme', () => {
  it('reset: 1. bölüm, kapsül üst ortada yatay', () => {
    const g = new VirusGame();
    g.reset({ seed: 1 });
    expect(g.level).toBe(1);
    expect(g.state).toBe('play');
    expect(g.cap).toMatchObject({ x: 4, y: 0, rot: 0 });
    expect(virusCount(g.grid)).toBe(6);
  });
  it('doğma hücresi doluysa blockout', () => {
    const g = new VirusGame();
    g.reset({ seed: 1 });
    clearGrid(g.grid);
    put(g.grid, 9, 5, VIRUS);
    put(g.grid, 4, 0, CAPSULE);
    const over: string[] = [];
    g.on('gameover', (e) => over.push(e.reason));
    g.cap = { x: 7, y: 0, rot: 0, a: 0, b: 1 };
    g.hardDrop();
    run(g, 200);
    expect(over).toEqual(['blockout']);
  });
  it('tahtanın üstünde kilitlenirse lockout', () => {
    const g = new VirusGame();
    g.reset({ seed: 1 });
    clearGrid(g.grid);
    put(g.grid, 9, 5, VIRUS);
    put(g.grid, 0, 1, CAPSULE);
    const over: string[] = [];
    g.on('gameover', (e) => over.push(e.reason));
    g.cap = { x: 0, y: 0, rot: 1, a: 0, b: 1 };
    g.hardDrop();
    expect(over).toEqual(['lockout']);
  });
});

describe('döndürme', () => {
  it('yataydan dikeye: üst yarı tahtanın üstünde olabilir', () => {
    const g = new VirusGame();
    g.reset({ seed: 1 });
    expect(g.rotate(1)).toBe(true);
    expect(g.cap?.rot).toBe(1);
    expect(capsuleCells(g.cap!)).toEqual([
      [4, 0],
      [4, -1],
    ]);
  });
  it('sağ duvarda dikeyden yataya bir hücre sola kayarak döner', () => {
    const g = new VirusGame();
    g.reset({ seed: 1 });
    clearGrid(g.grid);
    g.cap = { x: 9, y: 5, rot: 1, a: 0, b: 1 };
    expect(g.rotate(1)).toBe(true);
    expect(g.cap.x).toBe(8);
    expect(g.cap.rot).toBe(2);
  });
  it('iki yan da doluysa dönmez', () => {
    const g = new VirusGame();
    g.reset({ seed: 1 });
    clearGrid(g.grid);
    put(g.grid, 4, 5, VIRUS);
    put(g.grid, 6, 5, VIRUS);
    put(g.grid, 6, 4, VIRUS);
    put(g.grid, 4, 4, VIRUS);
    g.cap = { x: 5, y: 5, rot: 1, a: 0, b: 1 };
    expect(g.rotate(1)).toBe(false);
    expect(g.rotate(-1)).toBe(false);
  });
});

describe('zincir ve puan', () => {
  function setup() {
    const g = new VirusGame();
    g.reset({ seed: 3 });
    clearGrid(g.grid);
    put(g.grid, 0, 19, VIRUS, 0);
    put(g.grid, 1, 19, CAPSULE);
    put(g.grid, 2, 19, CAPSULE);
    put(g.grid, 5, 17, CAPSULE);
    put(g.grid, 6, 19, VIRUS, 1);
    put(g.grid, 7, 19, CAPSULE);
    put(g.grid, 8, 19, CAPSULE);
    put(g.grid, 9, 10, VIRUS, 2);
    g.cap = { x: 3, y: 0, rot: 0, a: 0, b: 1 };
    return g;
  }
  it("düşme ikinci 4'lüyü tetikler: zincir 1 ve 2, puanlar 100 ve 200", () => {
    const g = setup();
    const clears: { chain: number; points: number; viruses: number }[] = [];
    g.on('clear', (e) => clears.push({ chain: e.chain, points: e.points, viruses: e.viruses.length }));
    g.hardDrop();
    run(g, 3000);
    expect(clears).toEqual([
      { chain: 1, points: 100, viruses: 1 },
      { chain: 2, points: 200, viruses: 1 },
    ]);
    expect(g.score).toBe(300);
    expect(g.virusesCleared).toBe(2);
    expect(g.state).toBe('play');
  });
  it('temizleme sürerken giriş etkisiz', () => {
    const g = setup();
    g.hardDrop();
    expect(g.state).toBe('resolve');
    expect(g.move(1)).toBe(false);
    expect(g.rotate(1)).toBe(false);
    expect(g.softStep()).toBe(false);
  });
});

describe('bölüm sonu', () => {
  function lastVirus(level = 1) {
    const g = new VirusGame();
    g.reset({ seed: 5, level });
    clearGrid(g.grid);
    put(g.grid, 0, 19, VIRUS, 0);
    put(g.grid, 1, 19, CAPSULE);
    put(g.grid, 2, 19, CAPSULE);
    g.cap = { x: 3, y: 0, rot: 0, a: 0, b: 1 };
    return g;
  }
  it('son virüs gidince bonuslu levelclear, sonra 2. bölüm', () => {
    const g = lastVirus();
    const ev: { name: string; level: number; bonus?: number }[] = [];
    g.on('levelclear', (e) => ev.push({ name: 'clear', level: e.level, bonus: e.bonus }));
    g.on('levelstart', (e) => ev.push({ name: 'start', level: e.level }));
    g.hardDrop();
    run(g, VIRUS_CFG.clearMs + 50);
    expect(g.state).toBe('levelclear');
    const t = g.timeLeftMs;
    expect(ev[0]).toEqual({ name: 'clear', level: 1, bonus: 500 + 10 * Math.floor(t / 1000) });
    run(g, 500);
    expect(g.timeLeftMs).toBe(t); // geçişte süre durur
    run(g, VIRUS_CFG.levelClearMs);
    expect(ev[1]).toEqual({ name: 'start', level: 2 });
    expect(g.state).toBe('play');
  });
  it('20. bölüm bitince complete', () => {
    const g = lastVirus(20);
    const over: string[] = [];
    g.on('gameover', (e) => over.push(e.reason));
    g.hardDrop();
    run(g, VIRUS_CFG.clearMs + VIRUS_CFG.levelClearMs + 200);
    expect(over).toEqual(['complete']);
  });
});

describe('süre', () => {
  it('oynarken azalır, bitince time', () => {
    const g = new VirusGame();
    g.reset({ seed: 2 });
    expect(g.timeLeftMs).toBe(75_000);
    const over: string[] = [];
    g.on('gameover', (e) => over.push(e.reason));
    g.timeLeftMs = 100;
    g.update(150);
    expect(over).toEqual(['time']);
    expect(g.timeLeftMs).toBe(0);
  });
});

describe('öğretici tahtası', () => {
  it('bölüm 0, sabit üç virüs, süre akmaz', () => {
    const g = new VirusGame();
    g.reset({ seed: 1, tutorial: true });
    expect(g.level).toBe(0);
    expect(g.grid.kind[at(2, 19)]).toBe(VIRUS);
    expect(g.grid.tint[at(2, 19)]).toBe(0);
    expect(g.grid.tint[at(5, 19)]).toBe(1);
    expect(g.grid.tint[at(7, 18)]).toBe(2);
    expect(virusCount(g.grid)).toBe(3);
    const t = g.timeLeftMs;
    run(g, 2000);
    expect(g.timeLeftMs).toBe(t);
  });
  it('doğma tıkanınca oyun bitmez: kapsüller silinir, virüsler kalır', () => {
    const g = new VirusGame();
    g.reset({ seed: 1, tutorial: true });
    put(g.grid, 4, 0, CAPSULE);
    const over: string[] = [];
    g.on('gameover', (e) => over.push(e.reason));
    g.cap = { x: 8, y: 0, rot: 0, a: 0, b: 1 };
    g.hardDrop();
    run(g, 200);
    expect(over).toEqual([]);
    expect(g.grid.kind.some((k) => k === CAPSULE)).toBe(false);
    expect(virusCount(g.grid)).toBe(3);
    expect(g.state).toBe('play');
  });
  it('üç virüs de gidince tahta yeniden kurulur', () => {
    const g = new VirusGame();
    g.reset({ seed: 1, tutorial: true });
    clearGrid(g.grid);
    put(g.grid, 2, 19, VIRUS, 0);
    put(g.grid, 3, 19, CAPSULE);
    put(g.grid, 4, 19, CAPSULE);
    let rebuilt = 0;
    g.on('tutorialboard', () => rebuilt++);
    g.cap = { x: 0, y: 0, rot: 0, a: 0, b: 1 };
    g.hardDrop();
    run(g, 1500);
    expect(rebuilt).toBe(1);
    expect(virusCount(g.grid)).toBe(3);
    expect(g.grid.kind[at(7, 18)]).toBe(VIRUS);
  });
});
