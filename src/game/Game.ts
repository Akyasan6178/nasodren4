/* =====================================================================
   GAME (saf mantık, render'dan bağımsız)
   NS4-03: main.ts'ten taşındı. Bu sınıf DOM, PixiJS, localStorage, ses,
   titreşim, analitik ve CTA bilmez; dış dünyayla yalnızca on()/emit()
   olaylarıyla konuşur. Kurallar, süreler ve skor tabloları değişmedi.
   ===================================================================== */
import { COLS, ROWS, HIDDEN, VIS, CFG } from '../config/gameConfig';
import { PIECE, SHAPES, KICK_JLSTZ, KICK_I } from './pieces';
import type { Pending, GameEvents } from '../types/events';

export class Game {
  handlers: { [K in keyof GameEvents]?: Array<(a: never) => void> };   // NS4-02: on() çağrısı payload tipini K ile denetler
  board: Uint8Array;
  // reset() içinde atanan alanlar (reset() constructor'dan çağrılır)
  state!: string; type!: number; rot!: number; x!: number; y!: number;
  bag!: number[]; queue!: number[]; hold!: number; canHold!: boolean;
  score!: number; lines!: number; level!: number;
  combo!: number; b2b!: boolean | number; maxCombo!: number; tetrises!: number; tspins!: number;
  stateT!: number; pending!: Pending | null;
  gAcc!: number; lockT!: number; lockResets!: number; lowestY!: number; softDrop!: boolean;
  lastRot!: boolean; lastKick!: number; cycUsed!: boolean; synUses!: number;
  multT!: number; reboundT!: number; garbageT!: number; elapsed!: number;
  pieceVer!: number; boardVer!: number; queueVer!: number;
  _cv?: number; _c!: number;
  constructor() { this.handlers = {}; this.board = new Uint8Array(COLS * ROWS); this.reset(); this.state = 'idle'; this.type = 0; }
  on<K extends keyof GameEvents>(ev: K, fn: (a: GameEvents[K]) => void) { (this.handlers[ev] = this.handlers[ev] || [] as Array<(a: never) => void>).push(fn); }
  emit<K extends keyof GameEvents>(ev: K, a?: GameEvents[K]) { const h = this.handlers[ev]; if (h) for (let i = 0; i < h.length; i++) h[i](a as never); }

  reset() {
    this.board.fill(0);
    this.bag = []; this.queue = [];
    this.fillQueue();
    this.hold = 0; this.canHold = true;
    this.score = 0; this.lines = 0; this.level = 1;
    this.combo = -1; this.b2b = false; this.maxCombo = 0;
    this.tetrises = 0; this.tspins = 0;
    this.state = 'play';           // play | clearing | draining | over
    this.stateT = 0; this.pending = null;
    this.gAcc = 0; this.lockT = 0; this.lockResets = 0; this.lowestY = 0;
    this.softDrop = false;
    this.lastRot = false; this.lastKick = 0;
    this.cycUsed = false; this.synUses = 0;
    this.multT = 0; this.reboundT = 0; this.garbageT = 0;
    this.elapsed = 0;
    this.pieceVer = 0; this.boardVer = 0; this.queueVer = 0;
    this.spawn();
  }

  fillQueue() {
    while (this.queue.length < 8) {
      if (this.bag.length === 0) {                       // 7-bag randomizer
        const b = [1, 2, 3, 4, 5, 6, 7];
        for (let i = 6; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; const t = b[i]; b[i] = b[j]; b[j] = t; }
        this.bag = b;
      }
      this.queue.push(this.bag.pop()!);   // NS4-02: bag boşsa üstte yeniden dolduruluyor
    }
  }

  cell(x: number, y: number) { return (x < 0 || x >= COLS || y >= ROWS) ? 9 : (y < 0 ? 0 : this.board[y * COLS + x]); }

  fits(type: number, rot: number, px: number, py: number) {
    const s = SHAPES[type][rot];
    for (let i = 0; i < 4; i++) if (this.cell(px + s[i][0], py + s[i][1])) return false;
    return true;
  }

  spawn(type?: number) {
    if (!type) { type = this.queue.shift()!; this.fillQueue(); this.queueVer++; }   // NS4-02: kuyruk her zaman 8 elemanlı
    this.type = type; this.rot = 0; this.x = 3; this.y = 0;
    this.lastRot = false; this.lockT = 0; this.lockResets = 0; this.gAcc = 0;
    if (!this.fits(type, 0, this.x, this.y)) return this.gameOver('blockout');
    if (this.fits(type, 0, this.x, this.y + 1)) this.y++;      // guideline: doğduğu anda bir sıra in
    this.lowestY = this.y;
    this.pieceVer++;
    this.emit('spawn');
  }

  grounded() { return !this.fits(this.type, this.rot, this.x, this.y + 1); }

  onMoved() {
    if (this.y > this.lowestY) { this.lowestY = this.y; this.lockResets = 0; }
    if (this.grounded() && this.lockResets < CFG.maxLockResets) { this.lockT = 0; this.lockResets++; }
    this.pieceVer++;
  }

  move(dx: number) {
    if (this.state !== 'play') return false;
    if (!this.fits(this.type, this.rot, this.x + dx, this.y)) return false;
    this.x += dx; this.lastRot = false; this.onMoved(); this.emit('move'); return true;
  }

  rotate(dir: number) {
    if (this.state !== 'play' || this.type === PIECE.O) return false;
    const from = this.rot, to = (this.rot + dir + 4) & 3;
    const kicks = (this.type === PIECE.I ? KICK_I : KICK_JLSTZ)['' + from + to];
    for (let i = 0; i < kicks.length; i++) {
      const nx = this.x + kicks[i][0], ny = this.y - kicks[i][1];
      if (this.fits(this.type, to, nx, ny)) {
        this.x = nx; this.y = ny; this.rot = to;
        this.lastRot = true; this.lastKick = i;
        this.onMoved(); this.emit('rotate'); return true;
      }
    }
    return false;
  }

  softStep() {
    if (this.state !== 'play') return false;
    if (!this.fits(this.type, this.rot, this.x, this.y + 1)) return false;
    this.y++; this.score += 1; this.lastRot = false; this.onMoved(); return true;
  }

  ghostY() { let y = this.y; while (this.fits(this.type, this.rot, this.x, y + 1)) y++; return y; }

  hardDrop() {
    if (this.state !== 'play') return;
    const gy = this.ghostY(), d = gy - this.y;
    if (d > 0) this.lastRot = false;
    this.y = gy; this.score += d * 2; this.pieceVer++;
    this.emit('harddrop', d);
    this.lock();
  }

  doHold() {
    if (this.state !== 'play' || !this.canHold) return false;
    const cur = this.type;
    this.canHold = false;
    if (this.hold) { const h = this.hold; this.hold = cur; this.spawn(h); }
    else { this.hold = cur; this.spawn(); }
    this.queueVer++;
    this.emit('hold');
    return true;
  }

  gravityMs() {
    const l = Math.min(this.level, CFG.maxLevel) - 1;
    let ms = Math.pow(0.8 - l * 0.007, l) * 1000;
    if (this.reboundT > 0) ms /= CFG.reboundSpeed;
    return ms;
  }

  tspinKind() {
    if (this.type !== PIECE.T || !this.lastRot) return 0;
    const x = this.x, y = this.y;
    const c = [this.cell(x, y) ? 1 : 0, this.cell(x + 2, y) ? 1 : 0, this.cell(x + 2, y + 2) ? 1 : 0, this.cell(x, y + 2) ? 1 : 0]; // TL TR BR BL
    if (c[0] + c[1] + c[2] + c[3] < 3) return 0;
    const front = [[0, 1], [1, 2], [2, 3], [3, 0]][this.rot];
    return (c[front[0]] && c[front[1]]) || this.lastKick === 4 ? 2 : 1;   // 2 tam, 1 mini
  }

  lock() {
    const s = SHAPES[this.type][this.rot];
    const tspin = this.tspinKind();
    let allHidden = true;
    const cells: number[] = [];
    for (let i = 0; i < 4; i++) {
      const cx = this.x + s[i][0], cy = this.y + s[i][1];
      this.board[cy * COLS + cx] = this.type;
      cells.push(cy * COLS + cx);
      if (cy >= HIDDEN) allHidden = false;
    }
    this.boardVer++;
    this.canHold = true;
    this.emit('lock', cells);
    if (allHidden) return this.gameOver('lockout');

    const full: number[] = [];
    for (let y = 0; y < ROWS; y++) {
      let f = true;
      for (let x = 0; x < COLS; x++) if (!this.board[y * COLS + x]) { f = false; break; }
      if (f) full.push(y);
    }
    this.scoreClear(full.length, tspin);
    if (full.length) {
      this.state = 'clearing'; this.stateT = CFG.lineClearMs;
      this.pending = { kind: 'lines', rows: full };
      this.type = 0; this.pieceVer++;
      this.emit('clearstart', { rows: full, kind: 'lines' });
    } else {
      this.spawn();
    }
  }

  scoreClear(n: number, tspin: number) {
    const base = tspin === 2 ? [400, 800, 1200, 1600][n] : tspin === 1 ? [100, 200, 400, 400][n] : [0, 100, 300, 500, 800][n];
    const difficult = n === 4 || (tspin && n > 0);
    let pts = base * this.level;
    let b2b = false;
    if (n > 0) {
      if (difficult && this.b2b) { pts = Math.floor(pts * 1.5); b2b = true; }
      this.b2b = difficult;
      this.combo++;
      if (this.combo > 0) pts += 50 * this.combo * this.level;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
    } else this.combo = -1;
    if (this.multT > 0) pts *= CFG.cycMult;
    this.score += pts;
    if (n === 4) this.tetrises++;
    if (tspin && n > 0) this.tspins++;
    if (n > 0 || tspin) this.emit('scored', { n, tspin, b2b, combo: this.combo, pts });
    if (n > 0) {
      this.lines += n;
      const lv = Math.min(CFG.maxLevel, 1 + Math.floor(this.lines / CFG.linesPerLevel));
      if (lv > this.level) { this.level = lv; this.emit('levelup', lv); }
    }
  }

  removeRows(rows: number[]) {
    // rows sıralı (küçükten büyüğe); alttan yukarı sıkıştır
    const rm = new Uint8Array(ROWS);
    for (let i = 0; i < rows.length; i++) rm[rows[i]] = 1;
    let w = ROWS - 1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (rm[r]) continue;
      if (w !== r) this.board.copyWithin(w * COLS, r * COLS, r * COLS + COLS);
      w--;
    }
    for (; w >= 0; w--) this.board.fill(0, w * COLS, w * COLS + COLS);
    this.boardVer++;
  }

  stackHeight() {
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) if (this.board[y * COLS + x]) return ROWS - y;
    }
    return 0;
  }
  congestion() { if (this._cv !== this.boardVer) { this._cv = this.boardVer; this._c = Math.min(1, this.stackHeight() / VIS); } return this._c; }

  nonEmptyBottomRows(maxCount: number, fromRow: number) {
    const out: number[] = [];
    for (let y = ROWS - 1; y >= fromRow && out.length < maxCount; y--) {
      let any = false;
      for (let x = 0; x < COLS; x++) if (this.board[y * COLS + x]) { any = true; break; }
      if (any) out.push(y);
    }
    return out.sort((a, b) => a - b);
  }

  canCyc() { return this.state === 'play' && !this.cycUsed && this.congestion() >= CFG.powerThreshold; }
  canSyn() { return this.state === 'play' && this.congestion() >= CFG.powerThreshold; }

  useCyc() {
    if (!this.canCyc()) return false;
    this.cycUsed = true;
    const rows = this.nonEmptyBottomRows(10, ROWS - 10);
    this.state = 'draining'; this.stateT = CFG.drainMs;
    this.pending = { kind: 'cyc', rows };
    this.emit('clearstart', { rows, kind: 'cyc' });   // NS4-03: powerup_use analitiği app/events.ts içinde bu olaydan gönderilir
    return true;
  }

  useSyn() {
    if (!this.canSyn()) return false;
    this.synUses++;
    const rows = this.nonEmptyBottomRows(3, HIDDEN);
    this.state = 'clearing'; this.stateT = CFG.synClearMs;
    this.pending = { kind: 'syn', rows };
    this.emit('clearstart', { rows, kind: 'syn' });   // NS4-03: powerup_use analitiği app/events.ts içinde bu olaydan gönderilir
    return true;
  }

  finishPending() {
    const p = this.pending!; this.pending = null;   // NS4-02: yalnızca clearing/draining sırasında çağrılır, pending doludur
    this.state = 'play';
    this.removeRows(p.rows);
    if (p.kind === 'cyc') {
      this.score += 150 * p.rows.length * this.level;
      this.multT = CFG.cycMultMs;
      this.emit('powerdone', { kind: 'cyc', n: p.rows.length });
    } else if (p.kind === 'syn') {
      this.score += 50 * p.rows.length * this.level;
      if (this.synUses >= 2) {                              // tekrarlanan kullanım -> rebound
        this.reboundT = CFG.reboundMs * (this.synUses - 1);
        this.garbageT = CFG.reboundGarbageEvery * 0.5;
      }
      this.emit('powerdone', { kind: 'syn', n: p.rows.length, rebound: this.synUses >= 2 });
    }
    this.emit('clearend', p);
    if (p.kind === 'lines') this.spawn();
    else this.fixActiveOverlap();
  }

  fixActiveOverlap() {
    if (!this.type) return;
    for (let k = 0; k < 4 && !this.fits(this.type, this.rot, this.x, this.y); k++) this.y--;
    if (!this.fits(this.type, this.rot, this.x, this.y)) this.gameOver('overlap');
    this.pieceVer++;
  }

  addGarbage() {
    for (let x = 0; x < COLS; x++) if (this.board[x]) return this.gameOver('garbage');
    this.board.copyWithin(0, COLS);
    const hole = (Math.random() * COLS) | 0;
    const off = (ROWS - 1) * COLS;
    for (let x = 0; x < COLS; x++) this.board[off + x] = x === hole ? 0 : PIECE.GARBAGE;
    this.boardVer++;
    this.emit('garbage');
    this.fixActiveOverlap();
  }

  gameOver(reason: string) {
    if (this.state === 'over') return;
    this.state = 'over'; this.pieceVer++;
    this.emit('gameover', reason);
  }

  update(dt: number) {
    if (this.state === 'over') return;
    this.elapsed += dt;
    if (this.multT > 0) this.multT = Math.max(0, this.multT - dt);
    if (this.state === 'clearing' || this.state === 'draining') {
      this.stateT -= dt;
      if (this.stateT <= 0) this.finishPending();
      return;
    }
    if (this.reboundT > 0) {
      this.reboundT = Math.max(0, this.reboundT - dt);
      this.garbageT -= dt;
      if (this.garbageT <= 0) { this.garbageT += CFG.reboundGarbageEvery; this.addGarbage(); if (this.state === 'over') return; }
    }
    // yerçekimi
    const interval = this.gravityMs();
    this.gAcc += this.softDrop ? dt * CFG.softDropFactor : dt;
    let guard = 0;
    while (this.gAcc >= interval && guard++ < ROWS) {
      this.gAcc -= interval;
      if (this.fits(this.type, this.rot, this.x, this.y + 1)) {
        this.y++; if (this.softDrop) this.score += 1;
        this.lastRot = false;
        if (this.y > this.lowestY) { this.lowestY = this.y; this.lockResets = 0; }
        this.pieceVer++;
      } else { this.gAcc = 0; break; }
    }
    if (guard >= ROWS) this.gAcc = 0;
    // kilit gecikmesi
    if (this.grounded()) {
      this.lockT += dt;
      if (this.lockT >= CFG.lockDelay || this.lockResets >= CFG.maxLockResets && this.lockT >= CFG.lockDelay * 0.2) this.lock();
    } else this.lockT = 0;
  }
}
