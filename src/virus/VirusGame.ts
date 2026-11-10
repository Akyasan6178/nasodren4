/* =====================================================================
   NS4-44 · VİRÜS AVI motoru. Klasik Game.ts'ten bağımsızdır; yalnızca
   tahta boyutu, kilit gecikmesi ve yavaş indirme çarpanını paylaşır.
   Durumlar: play (kapsül düşüyor) → resolve (silme + düşme zinciri) →
   play | levelclear (geçiş, süre durur) → sonraki bölüm | over.
   Öğretici tahtası (bölüm 0): sabit üç virüs, süre yok, oyun bitmez.
   Girişler klasik Controls arayüzüyle aynı adlardadır (InputController).
   ===================================================================== */
import { CFG, COLS, VIS } from '../config/gameConfig';
import { seeded } from '../game/Game';
import type { RotationDirection, Step } from '../types/game';
import { VIRUS_CFG, levelParams } from './config';
import {
  CAPSULE,
  EMPTY,
  VIRUS,
  clearGrid,
  fallStep,
  findRuns,
  newGrid,
  placeViruses,
  removeCells,
  type Grid,
} from './rules';

export type VirusState = 'idle' | 'play' | 'resolve' | 'levelclear' | 'over';
export type VirusOverReason = 'blockout' | 'lockout' | 'time' | 'complete';

/** İki yarılı kapsül; a ilk hücre, b eşi. rot: 0 yatay (b sağda), 1 dikey (b üstte), 2 yatay (b solda), 3 dikey (b altta). */
export interface Capsule {
  x: number;
  y: number;
  rot: 0 | 1 | 2 | 3;
  a: number;
  b: number;
}

export type CellXY = readonly [number, number];

export function capsuleCells(c: Pick<Capsule, 'x' | 'y' | 'rot'>): readonly [CellXY, CellXY] {
  const { x, y } = c;
  switch (c.rot) {
    case 0:
      return [
        [x, y],
        [x + 1, y],
      ];
    case 1:
      return [
        [x, y],
        [x, y - 1],
      ];
    case 2:
      return [
        [x + 1, y],
        [x, y],
      ];
    case 3:
      return [
        [x, y - 1],
        [x, y],
      ];
  }
}
/** a hücresinden b'ye yön (rules.ts link kodu): rot0 sağ, rot1 yukarı, rot2 sol, rot3 aşağı. */
const LINK_A: readonly number[] = [1, 0, 3, 2];

/** Öğretici tahtasının sabit virüsleri: [x, y, tür]. */
export const TUTORIAL_VIRUSES: readonly (readonly [number, number, number])[] = [
  [2, 19, 0],
  [5, 19, 1],
  [7, 18, 2],
];
/** Kapsül yarıları için görünüş renkleri (0..3; kural değil). */
export const CAPSULE_TINTS = 4;

export interface VirusEvents {
  spawn: Record<string, never>;
  move: Record<string, never>;
  rotate: Record<string, never>;
  harddrop: Record<string, never>;
  lock: { cells: number[] };
  clear: { cells: number[]; viruses: { i: number; type: number }[]; chain: number; points: number };
  levelstart: { level: number; count: number; timeMs: number };
  levelclear: { level: number; bonus: number };
  tutorialboard: Record<string, never>;
  gameover: { reason: VirusOverReason };
}
type Listener<K extends keyof VirusEvents> = (e: VirusEvents[K]) => void;

export class VirusGame {
  readonly grid: Grid = newGrid();
  state: VirusState = 'idle';
  cap: Capsule | null = null;
  next = { a: 0, b: 0 };
  score = 0;
  level = 1;
  virusesCleared = 0;
  elapsedMs = 0;
  timeLeftMs = 0;
  chain = 0;
  tutorial = false;
  softDrop = false;

  private rnd: () => number = seeded(1);
  private gravT = 0;
  private lockT = 0;
  private lockResets = 0;
  private phase: 'clearing' | 'falling' = 'clearing';
  private phaseT = 0;
  private pending: number[] = [];
  private levelT = 0;
  private readonly handlers: { [K in keyof VirusEvents]?: Listener<K>[] } = {};

  on<K extends keyof VirusEvents>(name: K, fn: Listener<K>): void {
    const list = (this.handlers[name] ??= []) as Listener<K>[];
    list.push(fn);
  }
  private emit<K extends keyof VirusEvents>(name: K, e: VirusEvents[K]): void {
    for (const fn of this.handlers[name] ?? []) fn(e);
  }

  reset(opts: { readonly seed: number; readonly tutorial?: boolean; readonly level?: number }): void {
    this.rnd = seeded(opts.seed);
    this.score = 0;
    this.virusesCleared = 0;
    this.elapsedMs = 0;
    this.chain = 0;
    this.softDrop = false;
    this.next = this.pair();
    if (opts.tutorial) {
      clearGrid(this.grid);
      this.tutorial = true;
      this.level = 0;
      this.timeLeftMs = 0;
      this.placeTutorial();
      this.state = 'play';
      this.emit('levelstart', { level: 0, count: TUTORIAL_VIRUSES.length, timeMs: 0 });
      this.spawn();
    } else this.startLevel(opts.level ?? 1);
  }

  /** Temiz tahtada bölüm başlatır (öğretici bitince oturum 1. bölümü buradan açar). */
  startLevel(level: number): void {
    clearGrid(this.grid);
    this.tutorial = false;
    this.level = level;
    const p = levelParams(level);
    const count = placeViruses(this.grid, level, this.rnd);
    this.timeLeftMs = p.timeMs;
    this.chain = 0;
    this.cap = null;
    this.state = 'play';
    this.emit('levelstart', { level, count, timeMs: p.timeMs });
    this.spawn();
  }

  gameOver(reason: VirusOverReason): void {
    if (this.state === 'over') return;
    this.state = 'over';
    this.cap = null;
    this.softDrop = false;
    this.emit('gameover', { reason });
  }

  /** Türlere göre kalan virüs sayısı. */
  remaining(): [number, number, number] {
    const out: [number, number, number] = [0, 0, 0];
    for (let i = 0; i < this.grid.kind.length; i++)
      if (this.grid.kind[i] === VIRUS) {
        const t = this.grid.tint[i] ?? 0;
        out[t as 0 | 1 | 2]++;
      }
    return out;
  }
  /** Dolu hücre oranı (0..1): müzik ve lensin gülmesi için. */
  fill(): number {
    let n = 0;
    for (const k of this.grid.kind) if (k !== EMPTY) n++;
    return n / this.grid.kind.length;
  }

  /* ---- girişler (Controls) ---- */
  move(d: Step): boolean {
    const c = this.cap;
    if (this.state !== 'play' || !c) return false;
    if (!this.fits(c.x + d, c.y, c.rot)) return false;
    c.x += d;
    this.onMoved();
    this.emit('move', {});
    return true;
  }
  rotate(dir: RotationDirection): boolean {
    const c = this.cap;
    if (this.state !== 'play' || !c) return false;
    const rot = ((c.rot + dir + 4) % 4) as Capsule['rot'];
    for (const dx of [0, -1, 1]) {
      if (this.fits(c.x + dx, c.y, rot)) {
        c.x += dx;
        c.rot = rot;
        this.onMoved();
        this.emit('rotate', {});
        return true;
      }
    }
    return false;
  }
  softStep(): boolean {
    const c = this.cap;
    if (this.state !== 'play' || !c || !this.fits(c.x, c.y + 1, c.rot)) return false;
    c.y++;
    this.gravT = 0;
    return true;
  }
  hardDrop(): void {
    const c = this.cap;
    if (this.state !== 'play' || !c) return;
    while (this.fits(c.x, c.y + 1, c.rot)) c.y++;
    this.emit('harddrop', {});
    this.lock();
  }
  /** Bu modda Beklet ve güçler yok. */
  doHold(): boolean {
    return false;
  }
  useCyc(): boolean {
    return false;
  }
  useSneeze(): boolean {
    return false;
  }
  useSpray(): boolean {
    return false;
  }

  update(dt: number): void {
    if (this.state === 'idle' || this.state === 'over') return;
    this.elapsedMs += dt;
    if (!this.tutorial && (this.state === 'play' || this.state === 'resolve')) {
      this.timeLeftMs -= dt;
      if (this.timeLeftMs <= 0) {
        this.timeLeftMs = 0;
        this.gameOver('time');
        return;
      }
    }
    if (this.state === 'play') this.updatePlay(dt);
    else if (this.state === 'resolve') this.updateResolve(dt);
    else if (this.state === 'levelclear') {
      this.levelT -= dt;
      if (this.levelT <= 0) {
        if (this.level >= VIRUS_CFG.maxLevel) this.gameOver('complete');
        else this.startLevel(this.level + 1);
      }
    }
  }

  /* ---- iç işleyiş ---- */
  private pair(): { a: number; b: number } {
    return { a: Math.floor(this.rnd() * CAPSULE_TINTS), b: Math.floor(this.rnd() * CAPSULE_TINTS) };
  }
  private gravityMs(): number {
    const g = this.tutorial ? VIRUS_CFG.tutorialGravityMs : levelParams(this.level).gravityMs;
    return this.softDrop ? g / CFG.softDropFactor : g;
  }
  private fits(x: number, y: number, rot: Capsule['rot']): boolean {
    for (const [cx, cy] of capsuleCells({ x, y, rot })) {
      if (cx < 0 || cx >= COLS || cy >= VIS) return false;
      if (cy >= 0 && this.grid.kind[cy * COLS + cx] !== EMPTY) return false;
    }
    return true;
  }
  private grounded(): boolean {
    const c = this.cap;
    return !!c && !this.fits(c.x, c.y + 1, c.rot);
  }
  private onMoved(): void {
    if (this.grounded() && this.lockResets < CFG.maxLockResets) {
      this.lockT = 0;
      this.lockResets++;
    }
  }
  private spawn(): void {
    this.cap = { x: 4, y: 0, rot: 0, a: this.next.a, b: this.next.b };
    this.next = this.pair();
    this.gravT = 0;
    this.lockT = 0;
    this.lockResets = 0;
    if (!this.fits(4, 0, 0)) {
      if (this.tutorial) {
        this.clearCapsules();
        return this.spawn();
      }
      this.cap = null;
      return this.gameOver('blockout');
    }
    this.emit('spawn', {});
  }
  private updatePlay(dt: number): void {
    const c = this.cap;
    if (!c) return;
    if (this.grounded()) {
      this.lockT += dt;
      if (this.lockT >= CFG.lockDelay) this.lock();
      return;
    }
    this.gravT += dt;
    const g = this.gravityMs();
    while (this.gravT >= g) {
      this.gravT -= g;
      if (!this.fits(c.x, c.y + 1, c.rot)) break;
      c.y++;
    }
  }
  private lock(): void {
    const c = this.cap;
    if (!c) return;
    const cells = capsuleCells(c);
    if (cells.some(([, y]) => y < 0)) {
      if (this.tutorial) {
        this.clearCapsules();
        return this.spawn();
      }
      this.cap = null;
      return this.gameOver('lockout');
    }
    const [[ax, ay], [bx, by]] = cells;
    const ia = ay * COLS + ax,
      ib = by * COLS + bx;
    const la = LINK_A[c.rot] ?? 1;
    this.grid.kind[ia] = CAPSULE;
    this.grid.tint[ia] = c.a;
    this.grid.link[ia] = la;
    this.grid.kind[ib] = CAPSULE;
    this.grid.tint[ib] = c.b;
    this.grid.link[ib] = (la + 2) % 4;
    this.cap = null;
    this.softDrop = false;
    this.emit('lock', { cells: [ia, ib] });
    this.chain = 0;
    this.checkRuns();
  }
  /** 4'lü varsa silme aşamasını başlatır; yoksa sıradaki kapsül. */
  private checkRuns(): void {
    const runs = findRuns(this.grid);
    if (!runs.length) {
      this.state = 'play';
      this.spawn();
      return;
    }
    this.chain++;
    const viruses: { i: number; type: number }[] = [];
    for (const i of runs) if (this.grid.kind[i] === VIRUS) viruses.push({ i, type: this.grid.tint[i] ?? 0 });
    const mult = VIRUS_CFG.chainMult[Math.min(this.chain, 4) - 1] ?? 1;
    const points = this.tutorial ? 0 : viruses.length * VIRUS_CFG.virusPts * this.level * mult;
    this.score += points;
    this.virusesCleared += this.tutorial ? 0 : viruses.length;
    this.pending = runs;
    this.state = 'resolve';
    this.phase = 'clearing';
    this.phaseT = VIRUS_CFG.clearMs;
    this.emit('clear', { cells: runs, viruses, chain: this.chain, points });
  }
  private updateResolve(dt: number): void {
    this.phaseT -= dt;
    if (this.phaseT > 0) return;
    if (this.phase === 'clearing') {
      removeCells(this.grid, this.pending);
      this.pending = [];
      if (!this.remaining().some((n) => n > 0)) {
        if (this.tutorial) {
          this.placeTutorial();
          this.emit('tutorialboard', {});
        } else return this.levelClear();
      }
      this.phase = 'falling';
      this.phaseT = VIRUS_CFG.fallStepMs;
      return;
    }
    if (fallStep(this.grid)) this.phaseT = VIRUS_CFG.fallStepMs;
    else this.checkRuns();
  }
  private levelClear(): void {
    const bonus =
      VIRUS_CFG.levelBonus * this.level + VIRUS_CFG.timeBonus * Math.floor(this.timeLeftMs / 1000) * this.level;
    this.score += bonus;
    this.state = 'levelclear';
    this.levelT = VIRUS_CFG.levelClearMs;
    this.cap = null;
    this.emit('levelclear', { level: this.level, bonus });
  }
  private placeTutorial(): void {
    for (const [x, y, t] of TUTORIAL_VIRUSES) {
      const i = y * COLS + x;
      if (this.grid.kind[i] === CAPSULE) removeCells(this.grid, [i]); // eşinin bağı da kopar
      this.grid.kind[i] = VIRUS;
      this.grid.tint[i] = t;
      this.grid.link[i] = -1;
    }
  }
  private clearCapsules(): void {
    for (let i = 0; i < this.grid.kind.length; i++)
      if (this.grid.kind[i] === CAPSULE) {
        this.grid.kind[i] = EMPTY;
        this.grid.tint[i] = 0;
        this.grid.link[i] = -1;
      }
  }
}
