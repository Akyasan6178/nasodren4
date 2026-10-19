/* =====================================================================
   SİNÜS BOŞLUĞU DEKORU (NS4-09)
   Oyun alanı bir sinüsün içi gibi görünür: kenarlarda mukoza kıvrımları,
   dalga gibi (metakronal) çırpınan siller, yükselen hava kabarcıkları ve
   tabanda ostium (sinüs ağzı). Bölüm bitince ostium açılır, ışık ve hava
   içeri dolar. Yalnızca görseldir; Game'i okumaz.
   ===================================================================== */
import * as PIXI from 'pixi.js';
import { COLS, VIS } from '../config/gameConfig';

const WALL = 0xb8476f,
  CILIA = 0xff9cc4,
  OSTIUM = 0x1c0814;

interface Bubble {
  x: number;
  y: number;
  r: number;
  v: number;
}

export class SinusDecor {
  readonly root: PIXI.Container;
  private readonly walls: PIXI.Graphics;
  private readonly cilia: PIXI.Graphics;
  private readonly bubbles: PIXI.Graphics;
  private readonly ostium: PIXI.Graphics;
  private readonly rays: PIXI.Graphics;
  private readonly bub: Bubble[] = [];
  private t = 0;
  private c = 0;
  /** Ostium açıklığı (0 kapalı, 1 açık) ve hedefi. */
  private open = 0;
  private openTarget = 0;

  constructor() {
    this.root = new PIXI.Container();
    this.walls = new PIXI.Graphics();
    this.cilia = new PIXI.Graphics();
    this.bubbles = new PIXI.Graphics();
    this.ostium = new PIXI.Graphics();
    this.rays = new PIXI.Graphics();
    this.rays.blendMode = PIXI.BLEND_MODES.ADD;
    this.root.addChild(this.walls, this.bubbles, this.cilia, this.ostium, this.rays);
  }

  layout(cell: number) {
    this.c = cell;
    const w = COLS * cell,
      h = VIS * cell;
    const g = this.walls;
    g.clear();
    // mukoza kıvrımları: kenarlarda yumuşak dalgalı bant
    g.beginFill(WALL, 0.55);
    const band = cell * 0.22;
    for (const side of [0, 1]) {
      const x0 = side ? w : 0,
        dir = side ? -1 : 1;
      g.moveTo(x0, 0);
      for (let y = 0; y <= h; y += cell * 0.5) g.lineTo(x0 + dir * (band + Math.sin(y / (cell * 1.3)) * band * 0.5), y);
      g.lineTo(x0, h);
      g.closePath();
    }
    g.endFill();
    this.bub.length = 0;
    for (let k = 0; k < 9; k++)
      this.bub.push({ x: Math.random() * w, y: Math.random() * h, r: cell * (0.06 + Math.random() * 0.1), v: 0 });
    for (const b of this.bub) b.v = cell * (0.6 + Math.random() * 0.8);
    this.drawOstium();
  }

  /** Bölüm başı / yeni oyun: ostium kapalı. */
  reset() {
    this.open = this.openTarget = 0;
    this.rays.clear();
    this.drawOstium();
  }

  /** Bölüm bitti: ostium açılır. */
  openOstium() {
    this.openTarget = 1;
  }

  private drawOstium() {
    const c = this.c,
      w = COLS * c,
      h = VIS * c;
    if (!c) return;
    const g = this.ostium,
      o = this.open;
    g.clear();
    const rw = c * (0.9 + o * 1.4),
      rh = c * (0.22 + o * 0.35);
    g.beginFill(WALL, 0.9);
    g.drawEllipse(w / 2, h, rw + c * 0.18, rh + c * 0.12);
    g.endFill();
    g.beginFill(o > 0.05 ? 0xfff3f8 : OSTIUM, o > 0.05 ? 0.35 + o * 0.5 : 0.95);
    g.drawEllipse(w / 2, h, rw, rh);
    g.endFill();
  }

  update(dt: number) {
    const c = this.c;
    if (!c) return;
    this.t += dt / 1000;
    const w = COLS * c,
      h = VIS * c,
      t = this.t;
    // siller: duvardan içe uzanan kısa tüyler, komşular arasında faz farkıyla (metakronal dalga)
    const g = this.cilia;
    g.clear();
    g.lineStyle(Math.max(1, c * 0.06), CILIA, 0.55);
    const len = c * 0.42,
      step = c * 0.55;
    let i = 0;
    for (let y = step / 2; y < h; y += step, i++) {
      const sway = Math.sin(t * 5 - i * 0.55) * c * 0.2;
      g.moveTo(c * 0.12, y);
      g.quadraticCurveTo(c * 0.12 + len * 0.6, y - sway * 0.4, c * 0.12 + len, y - sway);
      g.moveTo(w - c * 0.12, y);
      g.quadraticCurveTo(w - c * 0.12 - len * 0.6, y - sway * 0.4, w - c * 0.12 - len, y - sway);
    }
    // hava kabarcıkları
    const b = this.bubbles;
    b.clear();
    for (const p of this.bub) {
      p.y -= (p.v * dt) / 1000;
      if (p.y < -p.r) {
        p.y = h + p.r;
        p.x = Math.random() * w;
      }
      b.lineStyle(Math.max(1, c * 0.03), 0xffffff, 0.22);
      b.drawCircle(p.x + Math.sin(t * 1.5 + p.r) * c * 0.15, p.y, p.r);
    }
    // ostium açılışı ve ışık huzmeleri
    if (this.open !== this.openTarget) {
      this.open = Math.min(this.openTarget, this.open + dt / 900);
      this.drawOstium();
    }
    const r = this.rays;
    r.clear();
    if (this.open > 0.05) {
      const a = 0.18 * this.open * (0.75 + Math.sin(t * 3) * 0.25);
      for (let k = -2; k <= 2; k++) {
        r.beginFill(0xffe6f1, a);
        const x = w / 2 + k * c * 0.6;
        r.moveTo(x - c * 0.25, h);
        r.lineTo(x + c * 0.25, h);
        r.lineTo(x + k * c * 1.6 + c * 0.9, 0);
        r.lineTo(x + k * c * 1.6 - c * 0.9, 0);
        r.closePath();
        r.endFill();
      }
    }
  }
}
