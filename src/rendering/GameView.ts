/* =====================================================================
   VIEW (PixiJS): sprite havuzları, texture yaşam döngüsü, efektler
   NS4-03: main.ts'ten taşındı. Game'i yalnızca okur; oyun kuralı, skor,
   storage, CTA veya içerik seçimi yapmaz.
   ===================================================================== */
import * as PIXI from 'pixi.js';
import { COLS, HIDDEN, VIS, CFG } from '../config/gameConfig';
import { PIECE, SHAPES } from '../game/pieces';
import { ATLAS_ROWS, COLORS, blockRecord, createBlockAtlas, createDropCanvas, createWaveCanvas } from './textures';
import type { Game } from '../game/Game';
import type { PendingClear } from '../types/events';
import type { BlockId, PendingClearKind, PieceSlot } from '../types/game';
import type { Layout, Pt } from '../types/layout';
import type { Settings } from '../types/settings';

type TextureMap = Readonly<Record<BlockId, PIXI.Texture>>;
interface Particle {
  readonly s: PIXI.Sprite;
  vx: number;
  vy: number;
  life: number;
  max: number;
  g: number;
  base: number;
}
interface ClearAnim {
  readonly kind: PendingClearKind;
  readonly rows: number[];
  t: number;
  readonly dur: number;
  recede?: number;
}
interface BounceState {
  readonly s: PIXI.Sprite;
  t: number;
}
/** View'in en son senkronladığı Game sürüm sayaçları (kirli bayrak). */
interface SeenVersions {
  piece: number;
  board: number;
  queue: number;
  ghost: boolean;
}

/** Tahta hücresi → BlockId. Tahtaya yalnızca Game yazar ve yalnızca 0..8 saklar; buraya 0 olmayan değerler gelir. */
const asBlock = (v: number): BlockId => v as BlockId;

export class View {
  readonly app: PIXI.Application<HTMLCanvasElement>;
  readonly game: Game;
  readonly settings: Readonly<Pick<Settings, 'ghost'>>; // NS4-03: ayar nesnesi dışarıdan verilir (yalnızca ghost okunur)
  readonly root: PIXI.Container;
  readonly boardC: PIXI.Container;
  readonly cellLayer: PIXI.Container;
  readonly ghostLayer: PIXI.Container;
  readonly activeLayer: PIXI.Container;
  readonly fxLayer: PIXI.Container;
  // buildTextures() içinde atanır; ilk çağrıya kadar tanımsızdır (bkz. NS4-02-VITE-MIGRATION.md)
  tex!: TextureMap;
  ghostTex!: TextureMap;
  /** NS4-14: düşen (aktif) parça karoları (aynı atlas, ayrı satır). */
  activeTex!: TextureMap;
  dropTex!: PIXI.Texture;
  waveTex!: PIXI.Texture;
  atlasBase?: PIXI.BaseTexture;
  wave!: PIXI.TilingSprite;
  readonly cells: PIXI.Sprite[];
  readonly active: PIXI.Sprite[];
  readonly ghost: PIXI.Sprite[];
  readonly holdC: PIXI.Container;
  readonly nextC: PIXI.Container;
  readonly holdS: PIXI.Sprite[];
  readonly nextS: PIXI.Sprite[][];
  readonly flashes: PIXI.Sprite[];
  readonly pc: PIXI.ParticleContainer;
  readonly parts: Particle[];
  partIdx: number;
  readonly bounce: BounceState[];
  shake: number;
  anim: ClearAnim | null;
  overT: number;
  readonly seen: SeenVersions;
  /** layout() ilk kez çağrılana kadar yoktur; sync*() yalnızca layout() sonrasında çağrılır, update() kendi kontrolünü yapar. */
  L!: Layout;
  constructor(app: PIXI.Application<HTMLCanvasElement>, game: Game, settings: Readonly<Pick<Settings, 'ghost'>>) {
    this.app = app;
    this.game = game;
    this.settings = settings;
    this.root = new PIXI.Container();
    app.stage.addChild(this.root);
    this.boardC = new PIXI.Container(); // sarsıntı için ayrı konteyner
    this.root.addChild(this.boardC);
    this.cellLayer = new PIXI.Container();
    this.ghostLayer = new PIXI.Container();
    this.activeLayer = new PIXI.Container();
    this.fxLayer = new PIXI.Container();
    this.boardC.addChild(this.ghostLayer, this.cellLayer, this.activeLayer, this.fxLayer);
    // NS4-02: orijinaldeki "this.tex = this.ghostTex = this.dropTex = this.waveTex = null" ataması kaldırıldı;
    // alanlar ilk buildTextures() çağrısına kadar undefined kalır (yalnızca truthiness ile kontrol ediliyorlar).

    // 200 görünür hücre sprite'ı (havuz) — her karede yeniden oluşturma yok
    this.cells = [];
    for (let i = 0; i < COLS * VIS; i++) {
      const s = new PIXI.Sprite();
      s.anchor.set(0.5);
      s.visible = false;
      this.cellLayer.addChild(s);
      this.cells.push(s);
    }
    this.active = [];
    this.ghost = [];
    for (let i = 0; i < 4; i++) {
      const a = new PIXI.Sprite();
      a.anchor.set(0.5);
      this.activeLayer.addChild(a);
      this.active.push(a);
      const g = new PIXI.Sprite();
      g.anchor.set(0.5);
      this.ghostLayer.addChild(g);
      this.ghost.push(g);
    }
    // önizlemeler
    this.holdC = new PIXI.Container();
    this.nextC = new PIXI.Container();
    this.root.addChild(this.holdC, this.nextC);
    this.holdS = this.mkMini(this.holdC);
    this.nextS = [];
    for (let k = 0; k < 5; k++) this.nextS.push(this.mkMini(this.nextC));

    // satır flaşları
    this.flashes = [];
    for (let i = 0; i < 10; i++) {
      const f = new PIXI.Sprite(PIXI.Texture.WHITE);
      f.blendMode = PIXI.BLEND_MODES.ADD;
      f.visible = false;
      this.fxLayer.addChild(f);
      this.flashes.push(f);
    }
    // sıvı dalga (sıklamen): buildTextures() içinde oluşturulur (NS4-02: "this.wave = null" ataması kaldırıldı, bkz. yukarı)
    // parçacıklar
    this.pc = new PIXI.ParticleContainer(420, { vertices: true, position: true, tint: true });
    this.fxLayer.addChild(this.pc);
    this.parts = [];
    for (let i = 0; i < 420; i++) {
      const s = new PIXI.Sprite();
      s.anchor.set(0.5);
      s.alpha = 0;
      s.position.set(-999, -999);
      this.pc.addChild(s);
      this.parts.push({ s, vx: 0, vy: 0, life: 0, max: 1, g: 0, base: 0 });
    } // base: emitDrop atar (yalnızca life > 0 iken okunur)
    this.partIdx = 0;

    this.bounce = []; // kilitlenen hücrelerin "oturma" yaylanması
    this.shake = 0;
    this.anim = null; // aktif temizleme animasyonu
    this.overT = -1;
    this.seen = { piece: -1, board: -1, queue: -1, ghost: settings.ghost };
  }

  mkMini(parent: PIXI.Container): PIXI.Sprite[] {
    const arr: PIXI.Sprite[] = [];
    for (let i = 0; i < 4; i++) {
      const s = new PIXI.Sprite();
      s.anchor.set(0.5);
      parent.addChild(s);
      arr.push(s);
    }
    return arr;
  }

  buildTextures(cell: number) {
    const res = this.app.renderer.resolution;
    const px = Math.max(8, Math.round(cell * res));
    const oldBase = this.atlasBase,
      oldTex = [this.tex, this.ghostTex, this.activeTex];
    const oldDrop = this.dropTex,
      oldWave = this.waveTex;
    const { atlas, P } = createBlockAtlas(px); // NS4-03: çizim rendering/textures.ts içinde
    const base = (this.atlasBase = PIXI.BaseTexture.from(atlas));
    // i: atlas sütunu (BLOCK_IDS sırası). NS4-04: önce bütün blok, sonra bütün hayalet karoları oluşturulur.
    this.tex = blockRecord((_id, i) => new PIXI.Texture(base, new PIXI.Rectangle(i * P + 2, 2, px, px)));
    this.ghostTex = blockRecord(
      (_id, i) => new PIXI.Texture(base, new PIXI.Rectangle(i * P + 2, ATLAS_ROWS.ghost * P + 2, px, px)),
    );
    this.activeTex = blockRecord(
      (_id, i) => new PIXI.Texture(base, new PIXI.Rectangle(i * P + 2, ATLAS_ROWS.active * P + 2, px, px)),
    );
    // damlacık
    this.dropTex = PIXI.Texture.from(createDropCanvas(cell, res));
    // sıvı dalga dokusu (yatay döşenir)
    this.waveTex = PIXI.Texture.from(createWaveCanvas());
    if (this.wave) {
      this.wave.texture = this.waveTex;
    } else {
      this.wave = new PIXI.TilingSprite(this.waveTex, 10, 10);
      this.wave.visible = false;
      this.fxLayer.addChildAt(this.wave, 0);
    }
    for (const p of this.parts) p.s.texture = this.dropTex;
    // eski dokuları güvenle serbest bırak (sprite'lar sync ile yenisine geçer)
    this.seen.piece = this.seen.board = this.seen.queue = -1;
    this.syncAll();
    for (const o of oldTex) if (o) for (const t of Object.values(o)) t.destroy(false);
    if (oldBase) oldBase.destroy();
    if (oldDrop) oldDrop.destroy(true);
    if (oldWave) oldWave.destroy(true);
  }

  layout(L: Layout) {
    this.L = L;
    const c = L.cell;
    this.boardC.position.set(L.board.x, L.board.y);
    for (const b of this.bounce) b.s.scale.set(1);
    this.bounce.length = 0;
    for (let i = 0; i < 10; i++) {
      this.flashes[i].width = COLS * c;
      this.flashes[i].height = c;
    }
    this.buildTextures(c);
  }

  setSize(s: PIXI.Sprite, size: number) {
    s.scale.set(size / s.texture.orig.width);
  }

  syncAll() {
    this.syncBoard();
    this.syncPiece();
    this.syncQueue();
  }

  syncBoard() {
    const g = this.game,
      b = g.board,
      c = this.L.cell;
    for (let r = 0; r < VIS; r++)
      for (let col = 0; col < COLS; col++) {
        const v = b[(r + HIDDEN) * COLS + col],
          s = this.cells[r * COLS + col];
        if (v) {
          s.texture = this.tex[asBlock(v)];
          s.visible = true;
          s.alpha = 1;
          s.tint = 0xffffff;
          this.setSize(s, c);
          s.position.set(col * c + c / 2, r * c + c / 2);
        } else s.visible = false;
      }
    this.seen.board = g.boardVer;
  }

  syncPiece() {
    const g = this.game,
      c = this.L.cell,
      type = g.type;
    const has = type !== 0 && g.state === 'play';
    const gy = has && this.settings.ghost ? g.ghostY() : -1;
    for (let i = 0; i < 4; i++) {
      const a = this.active[i],
        gh = this.ghost[i];
      if (!has) {
        a.visible = gh.visible = false;
        continue;
      }
      const sh = SHAPES[type][g.rot]; // NS4-04: has → type 1..7 (daraltma); döngü boyunca g.rot değişmez
      const cx = g.x + sh[i][0],
        cy = g.y + sh[i][1] - HIDDEN;
      a.texture = this.activeTex[type]; // NS4-14: aktif parça sabit bloklardan açık iç kenarla ayrılır
      this.setSize(a, c);
      a.position.set(cx * c + c / 2, cy * c + c / 2);
      a.visible = cy >= 0;
      if (gy >= 0 && gy !== g.y) {
        const gyy = gy + sh[i][1] - HIDDEN;
        gh.texture = this.ghostTex[type];
        this.setSize(gh, c);
        gh.position.set(cx * c + c / 2, gyy * c + c / 2);
        gh.visible = gyy >= 0;
      } else gh.visible = false;
    }
    this.seen.piece = g.pieceVer;
    this.seen.ghost = this.settings.ghost;
  }

  placeMini(sprites: readonly PIXI.Sprite[], type: PieceSlot, cx = 0, cy = 0, mc = 0, alpha = 1) {
    // NS4-02: varsayılanlar yalnızca type=0 çağrısı için (erken dönüş)
    if (!type) {
      for (const s of sprites) s.visible = false;
      return;
    }
    const sh = SHAPES[type][0];
    let minx = 9,
      maxx = -1,
      miny = 9,
      maxy = -1;
    for (const p of sh) {
      minx = Math.min(minx, p[0]);
      maxx = Math.max(maxx, p[0]);
      miny = Math.min(miny, p[1]);
      maxy = Math.max(maxy, p[1]);
    }
    const ox = cx - ((maxx - minx + 1) * mc) / 2,
      oy = cy - ((maxy - miny + 1) * mc) / 2;
    for (let i = 0; i < 4; i++) {
      const s = sprites[i];
      s.texture = this.tex[type];
      this.setSize(s, mc);
      s.position.set(ox + (sh[i][0] - minx) * mc + mc / 2, oy + (sh[i][1] - miny) * mc + mc / 2);
      s.visible = true;
      s.alpha = alpha;
    }
  }

  syncQueue() {
    const g = this.game,
      L = this.L;
    this.placeMini(this.holdS, g.hold, L.holdSlot.x, L.holdSlot.y, L.mini, g.canHold ? 1 : 0.35);
    for (let k = 0; k < 5; k++) {
      const slot: Pt | undefined = L.nextSlots[k]; // portrede 2, yatayda 5 slot var
      if (!slot) {
        this.placeMini(this.nextS[k], 0);
        continue;
      }
      this.placeMini(this.nextS[k], g.queue[k], slot.x, slot.y, k === 0 ? L.miniBig : L.mini, 1);
    }
    this.seen.queue = g.queueVer;
  }

  // ---- efektler ----
  emitDrop(x: number, y: number, tint: number, vx: number, vy: number, life: number, g: number, scale: number) {
    const p = this.parts[this.partIdx];
    this.partIdx = (this.partIdx + 1) % this.parts.length;
    p.s.position.set(x, y);
    p.s.tint = tint;
    p.s.alpha = 1;
    p.s.scale.set(scale);
    p.base = scale;
    p.vx = vx;
    p.vy = vy;
    p.life = life;
    p.max = life;
    p.g = g;
  }

  onLock(cells: readonly number[]) {
    for (const idx of cells) {
      const r = ((idx / COLS) | 0) - HIDDEN;
      if (r < 0) continue;
      const s = this.cells[r * COLS + (idx % COLS)];
      this.bounce.push({ s, t: 0 });
    }
  }

  onHard(d: number) {
    this.shake = Math.min(1, 0.25 + d * 0.04);
  }

  onClearStart(e: PendingClear) {
    const c = this.L.cell,
      g = this.game;
    this.syncBoard();
    this.anim = {
      kind: e.kind,
      rows: e.rows.map((r) => r - HIDDEN).filter((r) => r >= 0),
      t: 0,
      dur: e.kind === 'cyc' ? CFG.drainMs : e.kind === 'syn' ? CFG.synClearMs : CFG.lineClearMs,
    };
    const rows = this.anim.rows;
    if (e.kind !== 'cyc') {
      rows.forEach((r, i) => {
        const f = this.flashes[i];
        f.visible = true;
        f.alpha = 1;
        f.y = r * c;
        f.tint = e.kind === 'syn' ? 0xff6070 : 0xffffff;
      });
      // drenaj damlacıkları: hücre başına 2 adet, aşağı akar
      for (const r of rows)
        for (let col = 0; col < COLS; col++) {
          const v = asBlock(g.board[(r + HIDDEN) * COLS + col] || 1);
          // NS4-02: utils.string2hex(x) npm paketinde her oturumda bir deprecation uyarısı basıyor (CDN pixi.min.js basmıyordu).
          // Aynı hesaplamanın kendisi (string2hex = Color.shared.setValue(x).toNumber()) doğrudan çağrılıyor; sonuç birebir aynı.
          const tint = e.kind === 'syn' ? 0xff8a95 : PIXI.Color.shared.setValue(COLORS[v]).toNumber();
          for (let k = 0; k < 2; k++)
            this.emitDrop(
              col * c + c / 2 + (Math.random() - 0.5) * c * 0.6,
              r * c + c / 2,
              k ? 0xffffff : tint,
              (Math.random() - 0.5) * c * 3,
              (Math.random() * 0.5 - 0.9) * c * 6,
              500 + Math.random() * 350,
              c * 38,
              (((0.45 + Math.random() * 0.5) * c) / this.dropTex.orig.width) * 1.2,
            );
        }
    } else {
      this.wave.visible = true;
      this.wave.width = COLS * c;
      this.wave.height = 1;
      this.wave.y = VIS * c;
      this.wave.tileScale.set((c * 2.6) / 256, (VIS * 0.6 * c) / 128);
      this.wave.tilePosition.y = 0;
    }
  }

  onClearEnd() {
    for (const f of this.flashes) f.visible = false;
    this.anim = this.anim && this.anim.kind === 'cyc' ? Object.assign(this.anim, { recede: 0 }) : null;
    this.syncAll();
  }

  onGameOver() {
    this.overT = 0;
    this.syncPiece();
    this.shake = 0.8;
  }

  update(dt: number) {
    const g = this.game,
      L = this.L;
    if (!L) return;
    const c = L.cell;
    if (g.boardVer !== this.seen.board && !this.anim) this.syncBoard();
    if (g.pieceVer !== this.seen.piece || this.settings.ghost !== this.seen.ghost) this.syncPiece();
    if (g.queueVer !== this.seen.queue) this.syncQueue();

    // oturma yaylanması
    for (let i = this.bounce.length - 1; i >= 0; i--) {
      const b = this.bounce[i];
      b.t += dt;
      const p = Math.min(1, b.t / 140),
        k = 1 + Math.sin(p * Math.PI) * 0.09;
      const base = c / b.s.texture.orig.width;
      b.s.scale.set(base * k, base * (2 - k));
      if (p >= 1) {
        b.s.scale.set(base);
        this.bounce.splice(i, 1);
      }
    }

    // temizleme animasyonu
    const a = this.anim;
    if (a) {
      a.t += dt;
      if (a.recede != null) {
        a.recede += dt;
        const p = Math.min(1, a.recede / 520);
        this.wave.alpha = 1 - p;
        this.wave.tilePosition.x -= dt * 0.12;
        if (p >= 1) {
          this.wave.visible = false;
          this.wave.alpha = 1;
          this.anim = null;
        }
      } else if (a.kind === 'cyc') {
        const p = Math.min(1, a.t / a.dur),
          e = 1 - Math.pow(1 - p, 3);
        const top = a.rows.length ? Math.min(...a.rows) : VIS;
        const h = (VIS - top) * c * e + c * 0.6;
        this.wave.height = h;
        this.wave.y = VIS * c - h;
        this.wave.tilePosition.x -= dt * 0.12;
        for (const r of a.rows)
          for (let col = 0; col < COLS; col++) {
            const s = this.cells[r * COLS + col];
            if (!s.visible) continue;
            if (s.y > this.wave.y) {
              s.alpha = Math.max(0, s.alpha - dt / 260);
              s.scale.set((c / s.texture.orig.width) * (0.6 + 0.4 * s.alpha));
            }
          }
        if (Math.random() < dt / 16)
          this.emitDrop(
            Math.random() * COLS * c,
            VIS * c - Math.random() * h,
            0xffffff,
            (Math.random() - 0.5) * c,
            -c * (2 + Math.random() * 3),
            700,
            -c * 2,
            ((0.25 + Math.random() * 0.3) * c) / this.dropTex.orig.width,
          );
      } else {
        const p = Math.min(1, a.t / a.dur);
        for (let i = 0; i < a.rows.length; i++) this.flashes[i].alpha = Math.max(0, 1 - p * 1.6);
        const k = 1 - Math.pow(p, 1.6);
        for (const r of a.rows)
          for (let col = 0; col < COLS; col++) {
            const s = this.cells[r * COLS + col];
            if (!s.visible) continue;
            const base = c / s.texture.orig.width;
            s.scale.set(base * Math.max(0.001, k), base * Math.max(0.001, k * 0.7));
            s.alpha = k;
            s.y = r * c + c / 2 + p * c * 0.35;
          }
      }
    }

    // parçacıklar
    for (let i = 0; i < this.parts.length; i++) {
      const p = this.parts[i];
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.s.alpha = 0;
        continue;
      }
      const sec = dt / 1000;
      p.vy += p.g * sec;
      p.s.x += p.vx * sec;
      p.s.y += p.vy * sec;
      const f = p.life / p.max;
      p.s.alpha = f;
      p.s.scale.set(p.base * (0.5 + 0.5 * f)); // life > 0 ise emitDrop base atamıştır
    }

    // oyun sonu: yığını alttan yukarı griye çevir
    if (this.overT >= 0) {
      this.overT += dt;
      const n = Math.min(VIS, Math.floor(this.overT / 32));
      for (let r = VIS - 1; r >= VIS - n; r--)
        for (let col = 0; col < COLS; col++) {
          const s = this.cells[r * COLS + col];
          if (s.visible && s.texture !== this.tex[PIECE.GARBAGE]) {
            s.texture = this.tex[PIECE.GARBAGE];
            s.alpha = 0.75;
          }
        }
    }

    // sarsıntı
    if (this.shake > 0.01) {
      this.shake *= Math.pow(0.0015, dt / 1000);
      const m = this.shake * c * 0.18;
      this.boardC.position.set(L.board.x + (Math.random() - 0.5) * m, L.board.y + Math.random() * m);
    } else if (this.shake !== 0) {
      this.shake = 0;
      this.boardC.position.set(L.board.x, L.board.y);
    }
  }
}
