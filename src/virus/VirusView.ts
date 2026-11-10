/* =====================================================================
   NS4-44 · VİRÜS AVI tahta çizimi (Pixi). Klasik View'den bağımsız kendi
   kabında çalışır; bootstrap moda göre iki kabın görünürlüğünü değiştirir.
   Tahta zemini ve çerçeve DOM'da ortaktır (#board-bg).
   - 200 hücre havuzu: kapsül yarıları (eş yönünde düz kenar) ve virüsler
   - düşen kapsül (2 sprite) ve Sıradaki (2 sprite)
   - silme: hücreler büyüyüp söner; virüslerde küçük parçacık patlaması;
     zincir ≥ 2'de hafif sarsıntı (hareketi azaltta yok)
   ===================================================================== */
import * as PIXI from 'pixi.js';
import { COLS, VIS } from '../config/gameConfig';
import { PETAL_TINTS } from '../rendering/effects';
import { createDropCanvas } from '../rendering/textures';
import type { Layout, Pt } from '../types/layout';
import { FLIGHT_IN_MS, FLIGHT_OUT_MS } from './stage';
import { CAPSULE_COLORS, createCapsuleHalfCanvas, createVirusFallbackCanvas, loadVirusArt } from './art';
import { VIRUS_CFG } from './config';
import { CAPSULE, VIRUS } from './rules';
import { capsuleCells, type VirusGame } from './VirusGame';

/** Virüs görseli dikenleriyle birlikte hücreden biraz taşar (gövde hücreyi doldursun). Tahtada kol/bacak yok. */
const VIRUS_SCALE = 1.18;
const SIDES = [-1, 0, 1, 2, 3] as const;
type Side = (typeof SIDES)[number];
/** a hücresinden b'ye yön (rot'a göre); VirusGame ile aynı kod. */
const LINK_A: readonly Side[] = [1, 0, 3, 2];

/** NS4-44 ek: sıradaki kapsülün parmak ucu ve damlalığın ağzı/ucu (ekran koordinatı; stage.ts hesaplar). */
export interface VirusAnchors {
  readonly finger: Pt;
  readonly dropperTop: Pt;
  readonly dropperTip: Pt;
}

const ease = (p: number) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

interface Spark {
  readonly s: PIXI.Sprite;
  vx: number;
  vy: number;
  life: number;
}

export class VirusView {
  readonly root = new PIXI.Container();
  readonly boardC = new PIXI.Container();
  readonly cells: PIXI.Sprite[] = [];
  readonly active: PIXI.Sprite[] = [];
  readonly nextS: PIXI.Sprite[] = [];
  /** Parmaktan damlalığa, oradan tahtaya uçan kapsülün iki yarısı (yalnızca görsel). */
  readonly flight: PIXI.Sprite[] = [];
  reducedMotion = false;
  L: Layout | null = null;

  private readonly game: VirusGame;
  private readonly app: PIXI.Application<HTMLCanvasElement>;
  private capTex: PIXI.Texture[][] = [];
  private virusTex: PIXI.Texture[] = [];
  private dotTex: PIXI.Texture | null = null;
  private art: HTMLImageElement[] | null = null;
  private cellPx = 0;
  /** Silinen hücreler: indeks → kalan süre (ms). */
  private readonly clearing = new Map<number, number>();
  private readonly sparks: Spark[] = [];
  private shake = 0;
  private over = false;
  private anchors: VirusAnchors | null = null;
  /** Uçuş saati (ms; -1 uçuş yok) ve uçan kapsülün renkleri. */
  private flyT = -1;
  private flyTints: [number, number] = [0, 0];

  constructor(app: PIXI.Application<HTMLCanvasElement>, game: VirusGame) {
    this.app = app;
    this.game = game;
    app.stage.addChild(this.root);
    this.root.addChild(this.boardC);
    const cellLayer = new PIXI.Container(),
      activeLayer = new PIXI.Container(),
      fxLayer = new PIXI.Container(),
      nextC = new PIXI.Container();
    this.boardC.addChild(cellLayer, activeLayer, fxLayer);
    this.root.addChild(nextC);
    const mk = (parent: PIXI.Container) => {
      const s = new PIXI.Sprite();
      s.anchor.set(0.5);
      s.visible = false;
      parent.addChild(s);
      return s;
    };
    for (let i = 0; i < COLS * VIS; i++) this.cells.push(mk(cellLayer));
    for (let i = 0; i < 2; i++) this.active.push(mk(activeLayer));
    for (let i = 0; i < 2; i++) this.nextS.push(mk(nextC));
    for (let i = 0; i < 2; i++) this.flight.push(mk(nextC));
    for (let i = 0; i < 48; i++) {
      const s = mk(fxLayer);
      this.sparks.push({ s, vx: 0, vy: 0, life: 0 });
    }
    game.on('clear', (e) => {
      for (const i of e.cells) this.clearing.set(i, VIRUS_CFG.clearMs);
      for (const v of e.viruses) this.burst(v.i);
      if (e.chain >= 2 && !this.reducedMotion) this.shake = Math.min(1, 0.4 + e.chain * 0.15);
    });
    game.on('levelstart', () => this.resetFx());
    // NS4-44 ek: yeni kapsül parmaktan damlalığa zıplar, ucundan tahtaya girer (hareketi azaltta yok)
    game.on('spawn', () => {
      const c = game.cap;
      if (!c || this.reducedMotion || !this.anchors) {
        this.flyT = -1;
        return;
      }
      this.flyT = 0;
      this.flyTints = [c.a, c.b];
    });
    void loadVirusArt().then((art) => {
      if (!art) return;
      this.art = art;
      if (this.L) this.buildTextures(this.L.cell);
    });
  }

  /** Parmak ucu ve damlalık noktaları (her yerleşimde stage.ts'ten). */
  setAnchors(a: VirusAnchors): void {
    this.anchors = a;
    this.syncAll();
  }

  layout(L: Layout): void {
    this.L = L;
    if (L.cell !== this.cellPx) this.buildTextures(L.cell);
    this.syncAll();
  }

  private buildTextures(cell: number): void {
    const res = Math.max(1, this.app.renderer.resolution);
    const px = Math.max(8, Math.round(cell * res));
    this.cellPx = cell;
    for (const row of this.capTex) for (const t of row) t.destroy(true);
    for (const t of this.virusTex) t.destroy(true);
    this.capTex = CAPSULE_COLORS.map((c) =>
      SIDES.map((side) => PIXI.Texture.from(createCapsuleHalfCanvas(px, c, side))),
    );
    this.virusTex = [0, 1, 2].map((t) => PIXI.Texture.from(this.art?.[t] ?? createVirusFallbackCanvas(px, t)));
    this.dotTex ??= PIXI.Texture.from(createDropCanvas(cell, res));
  }

  private capsuleTex(color: number, side: Side): PIXI.Texture | undefined {
    return this.capTex[color]?.[SIDES.indexOf(side)];
  }
  private place(s: PIXI.Sprite, x: number, y: number, size: number): void {
    const L = this.L;
    if (!L) return;
    s.position.set(L.board.x + (x + 0.5) * L.cell, L.board.y + (y + 0.5) * L.cell);
    s.width = s.height = size;
  }

  syncAll(): void {
    const L = this.L;
    if (!L) return;
    const g = this.game.grid;
    for (let i = 0; i < this.cells.length; i++) {
      const s = this.cells[i];
      const kind = g.kind[i];
      const fading = this.clearing.get(i);
      if (kind === CAPSULE) {
        const tex = this.capsuleTex(g.tint[i] ?? 0, (g.link[i] ?? -1) as Side);
        if (tex) s.texture = tex;
      } else if (kind === VIRUS) {
        const tex = this.virusTex[g.tint[i] ?? 0];
        if (tex) s.texture = tex;
      }
      s.visible = kind === CAPSULE || kind === VIRUS;
      if (!s.visible) continue;
      const k = fading === undefined ? 0 : 1 - fading / VIRUS_CFG.clearMs;
      const size = L.cell * (kind === VIRUS ? VIRUS_SCALE : 1) * (1 + k * 0.25);
      this.place(s, i % COLS, Math.floor(i / COLS), size);
      s.alpha = (1 - k) * (this.over ? 0.55 : 1);
    }
    // düşen kapsül
    const c = this.game.cap;
    if (c) {
      const cells = capsuleCells(c);
      const la = LINK_A[c.rot] ?? 1;
      const sides: [Side, Side] = [la, ((la + 2) % 4) as Side];
      const tints = [c.a, c.b];
      cells.forEach(([x, y], k) => {
        const s = this.active[k];
        s.visible = y >= 0;
        if (!s.visible) return;
        const tex = this.capsuleTex(tints[k] ?? 0, sides[k] ?? -1);
        if (tex) s.texture = tex;
        this.place(s, x, y, L.cell);
        s.alpha = this.flyT >= 0 ? 0 : 1; // uçuş sürerken gerçek kapsül görünmez
      });
    } else for (const s of this.active) s.visible = false;
    // sıradaki kapsül (yatay): Elif'in parmak ucunda (yoksa eski Sıradaki yuvası); yenisi küçükten büyür
    const n = this.game.next;
    const mini = L.miniBig;
    const at = this.anchors ? { x: this.anchors.finger.x, y: this.anchors.finger.y - mini / 2 } : L.nextSlot;
    const pop = this.flyT >= 0 ? Math.min(1, this.flyT / FLIGHT_IN_MS) : 1;
    const show = this.game.state !== 'over' && this.game.state !== 'levelclear';
    [n.a, n.b].forEach((t, k) => {
      const s = this.nextS[k];
      const tex = this.capsuleTex(t, k === 0 ? 1 : 3);
      if (tex) s.texture = tex;
      s.position.set(at.x + (k - 0.5) * mini * pop, at.y);
      s.width = s.height = mini * pop;
      s.visible = show;
    });
    this.syncFlight();
  }

  /** Uçan kapsül: parmak → damlalık ağzı (yay, küçülerek), damlalık ucu → tahtadaki yeri (büyüyerek). */
  private syncFlight(): void {
    const L = this.L,
      a = this.anchors,
      c = this.game.cap;
    if (!L || !a || !c || this.flyT < 0) {
      for (const s of this.flight) s.visible = false;
      return;
    }
    const mini = L.miniBig;
    const cells = capsuleCells(c);
    const target = {
      x: L.board.x + ((cells[0][0] + cells[1][0]) / 2 + 0.5) * L.cell,
      y: L.board.y + (Math.max(cells[0][1], cells[1][1], 0) + 0.5) * L.cell,
    };
    let x: number, y: number, size: number, alpha: number;
    if (this.flyT < FLIGHT_IN_MS) {
      const p = ease(this.flyT / FLIGHT_IN_MS);
      const from = { x: a.finger.x, y: a.finger.y - mini / 2 };
      x = lerp(from.x, a.dropperTop.x, p);
      // zıplama yayı: yukarıda yer kadar (ekranın üstünden taşmasın)
      const arc = Math.max(0, Math.min(L.cell * 2.2, Math.min(from.y, a.dropperTop.y) - mini * 0.6));
      y = lerp(from.y, a.dropperTop.y, p) - Math.sin(Math.PI * p) * arc;
      size = lerp(mini, L.cell * 0.5, p);
      alpha = 1;
    } else {
      const p = ease(Math.min(1, (this.flyT - FLIGHT_IN_MS) / FLIGHT_OUT_MS));
      x = lerp(a.dropperTip.x, target.x, p);
      y = lerp(a.dropperTip.y, target.y, p);
      size = lerp(L.cell * 0.5, L.cell, p);
      alpha = Math.min(1, 0.4 + p);
    }
    this.flyTints.forEach((t, k) => {
      const s = this.flight[k];
      const tex = this.capsuleTex(t, k === 0 ? 1 : 3);
      if (tex) s.texture = tex;
      s.position.set(x + (k - 0.5) * size, y);
      s.width = s.height = size;
      s.alpha = alpha;
      s.visible = true;
    });
  }

  private burst(i: number): void {
    const L = this.L;
    if (!L || !this.dotTex) return;
    const n = this.reducedMotion ? 3 : 8;
    const cx = L.board.x + ((i % COLS) + 0.5) * L.cell,
      cy = L.board.y + (Math.floor(i / COLS) + 0.5) * L.cell;
    let made = 0;
    for (const p of this.sparks) {
      if (p.life > 0) continue;
      const a = (made / n) * Math.PI * 2;
      const sp = L.cell * (this.reducedMotion ? 0.002 : 0.006);
      p.vx = Math.cos(a) * sp;
      p.vy = Math.sin(a) * sp;
      p.life = 420;
      p.s.texture = this.dotTex;
      p.s.tint = PETAL_TINTS[made % PETAL_TINTS.length] ?? 0xffffff;
      p.s.position.set(cx, cy);
      p.s.width = p.s.height = L.cell * 0.35;
      p.s.visible = true;
      if (++made >= n) break;
    }
  }

  update(dt: number): void {
    if (this.flyT >= 0) {
      this.flyT += dt;
      if (this.flyT >= FLIGHT_IN_MS + FLIGHT_OUT_MS || this.reducedMotion) this.flyT = -1;
    }
    for (const [i, t] of this.clearing) {
      const left = t - dt;
      if (left <= 0) this.clearing.delete(i);
      else this.clearing.set(i, left);
    }
    for (const p of this.sparks) {
      if (p.life <= 0) continue;
      p.life -= dt;
      p.s.x += p.vx * dt;
      p.s.y += p.vy * dt;
      p.s.alpha = Math.max(0, p.life / 420);
      if (p.life <= 0) p.s.visible = false;
    }
    if (this.shake > 0 && this.L) {
      this.shake = Math.max(0, this.shake - dt / 260);
      const m = this.L.cell * 0.12 * this.shake;
      this.boardC.position.set((Math.random() - 0.5) * m, (Math.random() - 0.5) * m);
    } else this.boardC.position.set(0, 0);
    this.syncAll();
  }

  resetFx(): void {
    this.flyT = -1;
    this.clearing.clear();
    for (const p of this.sparks) {
      p.life = 0;
      p.s.visible = false;
    }
    this.shake = 0;
    this.over = false;
    this.boardC.position.set(0, 0);
  }

  onGameOver(): void {
    this.over = true;
  }
}
