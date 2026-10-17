import * as PIXI from 'pixi.js';
import './styles.css';

// NS4-02: orijinal IIFE sarmalayıcısı kaldırıldı; ES modülü zaten strict ve kendi kapsamına sahip.
declare global {
  interface Window {
    __fn?: { game: Game; view: View; app: PIXI.Application<HTMLCanvasElement> };
    dataLayer?: unknown[];
    webkitAudioContext?: typeof AudioContext;
  }
}

/* =====================================================================
   CONFIG
   ===================================================================== */
const COLS = 10, ROWS = 22, HIDDEN = 2, VIS = 20;
const CFG = {
  lockDelay: 500, maxLockResets: 15,
  lineClearMs: 300, synClearMs: 260, drainMs: 800,
  softDropFactor: 20,
  maxLevel: 20, linesPerLevel: 10,
  powerThreshold: 0.35,          // tıkanıklık oranı: destekler bu seviyede açılır
  cycMultMs: 30000, cycMult: 2,
  reboundMs: 40000, reboundSpeed: 1.5, reboundGarbageEvery: 10000,
  cta: 'https://www.yasasinsaglik.com/'
};

/* =====================================================================
   STORAGE + SETTINGS
   ===================================================================== */
const store = {
  get<T>(k: string, d: T): T { try { const v = localStorage.getItem('fn_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k: string, v: unknown) { try { localStorage.setItem('fn_' + k, JSON.stringify(v)); } catch (e) {} }
};
const settings = Object.assign({ sound: true, music: true, haptics: true, ghost: true, fps: false, das: 167, arr: 33 }, store.get('settings', {}));
const meta = Object.assign({ best: 0, totalLines: 0, badges: [] as string[] }, store.get('meta', {}));

/* =====================================================================
   ANALYTICS (stub: dataLayer varsa oraya, yoksa console.debug)
   ===================================================================== */
function track(name: string, data?: Record<string, unknown>) {
  const ev = Object.assign({ event: 'fn_' + name, t: Date.now() }, data || {});
  if (Array.isArray(window.dataLayer)) window.dataLayer.push(ev);
  else if (window.console && console.debug) console.debug('[track]', ev);
}
function ctaUrl(placement: string) {
  const u = new URL(CFG.cta);
  u.searchParams.set('utm_source', 'ferah_nefes_oyun');
  u.searchParams.set('utm_medium', 'advergame');
  u.searchParams.set('utm_campaign', 'sinus_bulmaca');
  u.searchParams.set('utm_content', placement);
  return u.toString();
}

/* =====================================================================
   PIECES + SRS
   ===================================================================== */
// type ids: 1 I, 2 O, 3 T, 4 S, 5 Z, 6 J, 7 L, 8 garbage (inflamasyon)
const SHAPES: Record<number, number[][][]> = {
  1: [[[0,1],[1,1],[2,1],[3,1]], [[2,0],[2,1],[2,2],[2,3]], [[0,2],[1,2],[2,2],[3,2]], [[1,0],[1,1],[1,2],[1,3]]],
  2: [[[1,0],[2,0],[1,1],[2,1]], [[1,0],[2,0],[1,1],[2,1]], [[1,0],[2,0],[1,1],[2,1]], [[1,0],[2,0],[1,1],[2,1]]],
  3: [[[1,0],[0,1],[1,1],[2,1]], [[1,0],[1,1],[2,1],[1,2]], [[0,1],[1,1],[2,1],[1,2]], [[1,0],[0,1],[1,1],[1,2]]],
  4: [[[1,0],[2,0],[0,1],[1,1]], [[1,0],[1,1],[2,1],[2,2]], [[1,1],[2,1],[0,2],[1,2]], [[0,0],[0,1],[1,1],[1,2]]],
  5: [[[0,0],[1,0],[1,1],[2,1]], [[2,0],[1,1],[2,1],[1,2]], [[0,1],[1,1],[1,2],[2,2]], [[1,0],[0,1],[1,1],[0,2]]],
  6: [[[0,0],[0,1],[1,1],[2,1]], [[1,0],[2,0],[1,1],[1,2]], [[0,1],[1,1],[2,1],[2,2]], [[1,0],[1,1],[0,2],[1,2]]],
  7: [[[2,0],[0,1],[1,1],[2,1]], [[1,0],[1,1],[1,2],[2,2]], [[0,1],[1,1],[2,1],[0,2]], [[0,0],[1,0],[1,1],[1,2]]]
};
// SRS kick tabloları (wiki: +y yukarı). Uygularken y ters çevrilir.
const KICK_JLSTZ: Record<string, number[][]> = {
  '01': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]], '10': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
  '12': [[0,0],[1,0],[1,-1],[0,2],[1,2]],     '21': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
  '23': [[0,0],[1,0],[1,1],[0,-2],[1,-2]],    '32': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
  '30': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],  '03': [[0,0],[1,0],[1,1],[0,-2],[1,-2]]
};
const KICK_I: Record<string, number[][]> = {
  '01': [[0,0],[-2,0],[1,0],[-2,-1],[1,2]], '10': [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
  '12': [[0,0],[-1,0],[2,0],[-1,2],[2,-1]], '21': [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
  '23': [[0,0],[2,0],[-1,0],[2,1],[-1,-2]], '32': [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
  '30': [[0,0],[1,0],[-2,0],[1,-2],[-2,1]], '03': [[0,0],[-1,0],[2,0],[-1,2],[2,-1]]
};

/* =====================================================================
   GAME (saf mantık, render'dan bağımsız)
   ===================================================================== */
// NS4-02: Game olay payload tipleri (yalnızca derleme için; çalışma davranışı aynı)
type Pending = { kind: string; rows: number[] };
type GameEvents = {
  spawn: undefined; move: undefined; rotate: undefined; hold: undefined; garbage: undefined;
  lock: number[]; harddrop: number; levelup: number; gameover: string;
  clearstart: Pending; clearend: Pending;
  scored: { n: number; tspin: number; b2b: boolean; combo: number; pts: number };
  powerdone: { kind: string; n: number; rebound?: boolean };
};

class Game {
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
    if (this.state !== 'play' || this.type === 2) return false;
    const from = this.rot, to = (this.rot + dir + 4) & 3;
    const kicks = (this.type === 1 ? KICK_I : KICK_JLSTZ)['' + from + to];
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
    if (this.type !== 3 || !this.lastRot) return 0;
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
    this.emit('clearstart', { rows, kind: 'cyc' });
    track('powerup_use', { kind: 'siklamen', level: this.level, congestion: +this.congestion().toFixed(2) });
    return true;
  }

  useSyn() {
    if (!this.canSyn()) return false;
    this.synUses++;
    const rows = this.nonEmptyBottomRows(3, HIDDEN);
    this.state = 'clearing'; this.stateT = CFG.synClearMs;
    this.pending = { kind: 'syn', rows };
    this.emit('clearstart', { rows, kind: 'syn' });
    track('powerup_use', { kind: 'sentetik', uses: this.synUses, level: this.level });
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
    for (let x = 0; x < COLS; x++) this.board[off + x] = x === hole ? 0 : 8;
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

/* =====================================================================
   AUDIO (WebAudio sentezi; harici dosya yok)
   ===================================================================== */
class Sound {
  ctx: AudioContext | null; musicOn: boolean;
  master!: GainNode; sfx!: GainNode; mus!: GainNode; noise!: AudioBuffer;
  wantMusic?: boolean; musNodes?: boolean; padLP!: BiquadFilterNode; chordIdx!: number; musTimer?: number;
  constructor() { this.ctx = null; this.musicOn = false; }
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = this.ctx = new AC();
      this.master = ctx.createGain(); this.master.gain.value = 0.8; this.master.connect(ctx.destination);
      this.sfx = ctx.createGain(); this.sfx.connect(this.master);
      this.mus = ctx.createGain(); this.mus.gain.value = 0; this.mus.connect(this.master);
      const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noise = buf;
      this.applySettings();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }
  applySettings() {
    if (!this.ctx) return;
    this.sfx.gain.value = settings.sound ? 1 : 0;
    if (settings.music && this.wantMusic) this.startMusic(); else this.stopMusic();
  }
  tone(f: number, dur: number, type: OscillatorType, gain: number, f2?: number, delay?: number) {
    if (!this.ctx || !settings.sound) return;
    const t = this.ctx.currentTime + (delay || 0);
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + Math.min(0.012, dur * 0.3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.sfx);
    o.start(t); o.stop(t + dur + 0.02);
  }
  breath(dur: number, f0: number, f1: number, gain: number, q?: number, delay?: number) {
    if (!this.ctx || !settings.sound) return;
    const t = this.ctx.currentTime + (delay || 0);
    const s = this.ctx.createBufferSource(); s.buffer = this.noise;
    const bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = q || 1;
    bp.frequency.setValueAtTime(f0, t); bp.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + dur * 0.55);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(bp); bp.connect(g); g.connect(this.sfx);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }
  move() { this.tone(540, 0.035, 'sine', 0.035); }
  rotate() { this.tone(660, 0.06, 'triangle', 0.05, 880); }
  hold() { this.tone(420, 0.08, 'sine', 0.06, 300); }
  lock() { this.tone(160, 0.11, 'sine', 0.16, 80); }
  hard() { this.tone(120, 0.16, 'sine', 0.24, 48); this.breath(0.09, 1400, 300, 0.06, 0.8); }
  clear(n: number, tspin: number) {
    // içeri derin nefes + damlacıklar
    this.breath(0.38 + 0.12 * n, 300, 1300 + 350 * n, 0.1 + 0.025 * n, 1.1);
    for (let i = 0; i < 2 + n * 2; i++) this.tone(800 + Math.random() * 700, 0.09, 'sine', 0.045, 260, 0.06 + i * 0.045);
    if (n >= 4 || tspin) {
      const ch = tspin ? [587, 740, 880] : [523, 659, 784, 1047];
      ch.forEach((f, i) => this.tone(f, 0.9, 'sine', 0.05, 0, 0.12 + i * 0.05));
    }
  }
  cyc() {
    this.breath(1.3, 180, 2200, 0.12, 0.9);
    for (let i = 0; i < 10; i++) this.tone(500 + Math.random() * 900, 0.12, 'sine', 0.035, 1400, 0.1 + i * 0.07);
    [392, 523, 659, 784].forEach((f, i) => this.tone(f, 1.3, 'sine', 0.04, 0, 0.3 + i * 0.08));
  }
  syn() { this.breath(0.35, 3000, 900, 0.14, 2.5); this.tone(900, 0.12, 'square', 0.03, 1800); }
  warn() { this.tone(220, 0.25, 'triangle', 0.08, 180); this.tone(208, 0.25, 'triangle', 0.08, 170, 0.2); }
  level() { [523, 659, 784].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.05, 0, i * 0.07)); }
  over() { this.tone(330, 0.7, 'triangle', 0.12, 82); this.breath(0.9, 900, 160, 0.06, 0.7); }

  startMusic() {
    if (!this.ctx || this.musicOn) return;
    this.musicOn = true;
    const ctx = this.ctx, t = ctx.currentTime;
    this.mus.gain.cancelScheduledValues(t);
    this.mus.gain.setTargetAtTime(0.32, t, 1.2);
    if (!this.musNodes) {
      // rüzgâr / nefes: filtrelenmiş gürültü + yavaş LFO
      const n = ctx.createBufferSource(); n.buffer = this.noise; n.loop = true;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 500; bp.Q.value = 0.6;
      const ng = ctx.createGain(); ng.gain.value = 0.05;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.09;
      const lg = ctx.createGain(); lg.gain.value = 260; lfo.connect(lg); lg.connect(bp.frequency);
      const lfo2 = ctx.createOscillator(); lfo2.frequency.value = 0.07;
      const lg2 = ctx.createGain(); lg2.gain.value = 0.035; lfo2.connect(lg2); lg2.connect(ng.gain);
      n.connect(bp); bp.connect(ng); ng.connect(this.mus);
      n.start(); lfo.start(); lfo2.start();
      // yumuşak pad
      this.padLP = ctx.createBiquadFilter(); this.padLP.type = 'lowpass'; this.padLP.frequency.value = 900;
      this.padLP.connect(this.mus);
      this.musNodes = true;
      this.chordIdx = 0;
    }
    const chords = [[220, 277.2, 329.6], [196, 246.9, 293.7], [174.6, 220, 261.6], [196, 246.9, 329.6]];
    const play = () => {
      if (!this.musicOn) return;
      const c = chords[this.chordIdx++ % chords.length], t0 = ctx.currentTime;
      c.forEach((f) => {
        for (let d = -1; d <= 1; d += 2) {
          const o = ctx.createOscillator(), g = ctx.createGain();
          o.type = 'sine'; o.frequency.value = f; o.detune.value = d * 6;
          g.gain.setValueAtTime(0.0001, t0);
          g.gain.linearRampToValueAtTime(0.03, t0 + 2.5);
          g.gain.linearRampToValueAtTime(0.0001, t0 + 8.5);
          o.connect(g); g.connect(this.padLP); o.start(t0); o.stop(t0 + 8.6);
        }
      });
    };
    play();
    this.musTimer = setInterval(play, 7000);
  }
  stopMusic() {
    if (!this.ctx || !this.musicOn) return;
    this.musicOn = false;
    clearInterval(this.musTimer);
    this.mus.gain.cancelScheduledValues(this.ctx.currentTime);
    this.mus.gain.setTargetAtTime(0, this.ctx.currentTime, 0.4);
  }
  setMusic(want: boolean) { this.wantMusic = want; this.applySettings(); }
}

/* =====================================================================
   HAPTICS (navigator.vibrate: Android Chrome. iOS Safari desteklemez.)
   ===================================================================== */
const canVibrate = typeof navigator.vibrate === 'function';
function buzz(p: number | number[]) { if (settings.haptics && canVibrate) { try { navigator.vibrate(p); } catch (e) {} } }
const HAPTIC = {
  lock: 12, hard: 24,
  clear: (n: number) => n >= 4 ? [10, 30, 16, 26, 24, 22, 34, 18, 60] : n === 3 ? [10, 30, 18, 26, 36] : n === 2 ? [12, 30, 24] : [18],
  over: [70, 60, 140, 80, 260],
  syn: [40, 30, 40], cyc: [10, 40, 14, 40, 18, 40, 24, 40, 40]
};

/* =====================================================================
   VIEW (PixiJS)
   ===================================================================== */
const COLORS: Record<string, string> = { 1: '#3fd2de', 2: '#ffcf5a', 3: '#e44d97', 4: '#55d08a', 5: '#ff7868', 6: '#5d8bff', 7: '#ffa14a', 8: '#8e93a6' };

function hexToRgb(h: string) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function shade(h: string, amt: number) {
  const [r, g, b] = hexToRgb(h);
  const f = (c: number) => Math.round(amt >= 0 ? c + (255 - c) * amt : c * (1 + amt));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}
function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

// NS4-02: layout ve görünüm tipleri (yalnızca derleme için)
type Rect = { x: number; y: number; w: number; h: number };
type Pt = { x: number; y: number };
interface Layout {
  W: number; H: number; portrait: boolean; cell: number; mini: number; miniBig: number;
  board: Rect; meter: Rect; hold: Rect; next: Rect; stats: Rect;
  btnHold: Rect; btnCyc: Rect; btnSyn: Rect; btnPause: Rect;
  holdSlot: Pt; nextSlots: Pt[]; compactBtns: boolean; compactStats: boolean;
}
type Particle = { s: PIXI.Sprite; vx: number; vy: number; life: number; max: number; g: number; base?: number };
type ClearAnim = { kind: string; rows: number[]; t: number; dur: number; recede?: number };

class View {
  app: PIXI.Application<HTMLCanvasElement>; game: Game;
  root: PIXI.Container; boardC: PIXI.Container;
  cellLayer: PIXI.Container; ghostLayer: PIXI.Container; activeLayer: PIXI.Container; fxLayer: PIXI.Container;
  // buildTextures() içinde atanır; ilk çağrıya kadar tanımsızdır (bkz. NS4-02-VITE-MIGRATION.md)
  tex!: Record<string, PIXI.Texture>; ghostTex!: Record<string, PIXI.Texture>;
  dropTex!: PIXI.Texture; waveTex!: PIXI.Texture; atlasBase?: PIXI.BaseTexture; wave!: PIXI.TilingSprite;
  cells: PIXI.Sprite[]; active: PIXI.Sprite[]; ghost: PIXI.Sprite[];
  holdC: PIXI.Container; nextC: PIXI.Container; holdS: PIXI.Sprite[]; nextS: PIXI.Sprite[][];
  flashes: PIXI.Sprite[]; pc: PIXI.ParticleContainer; parts: Particle[]; partIdx: number;
  bounce: { s: PIXI.Sprite; t: number }[]; shake: number; anim: ClearAnim | null; overT: number;
  seen: { piece: number; board: number; queue: number; ghost: boolean };
  L!: Layout; pendingBoardSync?: boolean;
  constructor(app: PIXI.Application<HTMLCanvasElement>, game: Game) {
    this.app = app; this.game = game;
    this.root = new PIXI.Container();
    app.stage.addChild(this.root);
    this.boardC = new PIXI.Container();             // sarsıntı için ayrı konteyner
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
    for (let i = 0; i < COLS * VIS; i++) { const s = new PIXI.Sprite(); s.anchor.set(0.5); s.visible = false; this.cellLayer.addChild(s); this.cells.push(s); }
    this.active = []; this.ghost = [];
    for (let i = 0; i < 4; i++) {
      const a = new PIXI.Sprite(); a.anchor.set(0.5); this.activeLayer.addChild(a); this.active.push(a);
      const g = new PIXI.Sprite(); g.anchor.set(0.5); this.ghostLayer.addChild(g); this.ghost.push(g);
    }
    // önizlemeler
    this.holdC = new PIXI.Container(); this.nextC = new PIXI.Container();
    this.root.addChild(this.holdC, this.nextC);
    this.holdS = this.mkMini(this.holdC);
    this.nextS = []; for (let k = 0; k < 5; k++) this.nextS.push(this.mkMini(this.nextC));

    // satır flaşları
    this.flashes = [];
    for (let i = 0; i < 10; i++) { const f = new PIXI.Sprite(PIXI.Texture.WHITE); f.blendMode = PIXI.BLEND_MODES.ADD; f.visible = false; this.fxLayer.addChild(f); this.flashes.push(f); }
    // sıvı dalga (sıklamen): buildTextures() içinde oluşturulur (NS4-02: "this.wave = null" ataması kaldırıldı, bkz. yukarı)
    // parçacıklar
    this.pc = new PIXI.ParticleContainer(420, { vertices: true, position: true, tint: true });
    this.fxLayer.addChild(this.pc);
    this.parts = [];
    for (let i = 0; i < 420; i++) { const s = new PIXI.Sprite(); s.anchor.set(0.5); s.alpha = 0; s.position.set(-999, -999); this.pc.addChild(s); this.parts.push({ s, vx: 0, vy: 0, life: 0, max: 1, g: 0 }); }
    this.partIdx = 0;

    this.bounce = [];          // kilitlenen hücrelerin "oturma" yaylanması
    this.shake = 0;
    this.anim = null;          // aktif temizleme animasyonu
    this.overT = -1;
    this.seen = { piece: -1, board: -1, queue: -1, ghost: settings.ghost };
  }

  mkMini(parent: PIXI.Container) { const arr: PIXI.Sprite[] = []; for (let i = 0; i < 4; i++) { const s = new PIXI.Sprite(); s.anchor.set(0.5); parent.addChild(s); arr.push(s); } return arr; }

  buildTextures(cell: number) {
    const res = this.app.renderer.resolution;
    const px = Math.max(8, Math.round(cell * res));
    const oldBase = this.atlasBase, oldTex = [this.tex, this.ghostTex];
    const oldDrop = this.dropTex, oldWave = this.waveTex;
    // Tek atlas: 8 blok + 8 hayalet karo -> tahtanın tamamı tek draw call
    const P = px + 4, keys = Object.keys(COLORS);
    const atlas = document.createElement('canvas'); atlas.width = P * keys.length; atlas.height = P * 2;
    const x = atlas.getContext('2d')!;
    keys.forEach((k, i) => {
      const c = COLORS[k], ox = i * P + 2;
      x.save(); x.translate(ox, 2);
      const ins = px * 0.045, r = px * 0.26, w = px - ins * 2;
      let g = x.createLinearGradient(0, 0, 0, px);
      g.addColorStop(0, shade(c, 0.28)); g.addColorStop(0.55, c); g.addColorStop(1, shade(c, -0.22));
      rr(x, ins, ins, w, w, r); x.fillStyle = g; x.fill();
      x.lineWidth = Math.max(1, px * 0.035); x.strokeStyle = shade(c, -0.32); x.globalAlpha = 0.55; x.stroke(); x.globalAlpha = 1;
      g = x.createRadialGradient(px * 0.34, px * 0.3, 0, px * 0.34, px * 0.3, px * 0.5);
      g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      rr(x, ins, ins, w, w, r); x.fillStyle = g; x.fill();
      x.fillStyle = 'rgba(255,255,255,.75)';
      x.beginPath(); x.ellipse(px * 0.3, px * 0.24, px * 0.11, px * 0.06, -0.5, 0, Math.PI * 2); x.fill();
      x.restore();
      x.save(); x.translate(ox, P + 2);
      rr(x, px * 0.09, px * 0.09, px * 0.82, px * 0.82, px * 0.24);
      x.fillStyle = c; x.globalAlpha = 0.14; x.fill(); x.globalAlpha = 0.7;
      x.lineWidth = Math.max(1.5, px * 0.06); x.strokeStyle = c; x.stroke();
      x.restore();
    });
    const base = this.atlasBase = PIXI.BaseTexture.from(atlas);
    this.tex = {}; this.ghostTex = {};
    keys.forEach((k, i) => {
      this.tex[k] = new PIXI.Texture(base, new PIXI.Rectangle(i * P + 2, 2, px, px));
      this.ghostTex[k] = new PIXI.Texture(base, new PIXI.Rectangle(i * P + 2, P + 2, px, px));
    });
    // damlacık
    let cv = document.createElement('canvas'); const ds = Math.max(8, Math.round(cell * 0.5 * res)); cv.width = cv.height = ds;
    let y = cv.getContext('2d')!;
    let g = y.createRadialGradient(ds * 0.42, ds * 0.4, 0, ds / 2, ds / 2, ds / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.55, 'rgba(255,255,255,.8)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    y.fillStyle = g; y.fillRect(0, 0, ds, ds);
    this.dropTex = PIXI.Texture.from(cv);
    // sıvı dalga dokusu (yatay döşenir)
    cv = document.createElement('canvas'); cv.width = 256; cv.height = 128;
    y = cv.getContext('2d')!; { const x = y;
    g = x.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, 'rgba(255,170,210,.95)'); g.addColorStop(0.25, 'rgba(230,77,151,.75)'); g.addColorStop(1, 'rgba(53,216,200,.55)');
    x.fillStyle = g; x.beginPath(); x.moveTo(0, 128);
    for (let i = 0; i <= 256; i += 4) x.lineTo(i, 6 + Math.sin(i / 256 * Math.PI * 4) * 3);
    x.lineTo(256, 128); x.closePath(); x.fill();
    x.strokeStyle = 'rgba(255,255,255,.8)'; x.lineWidth = 1.5; x.beginPath();
    for (let i = 0; i <= 256; i += 4) { const yy = 6 + Math.sin(i / 256 * Math.PI * 4) * 3; i ? x.lineTo(i, yy) : x.moveTo(i, yy); }
    x.stroke(); }
    this.waveTex = PIXI.Texture.from(cv);
    if (this.wave) { this.wave.texture = this.waveTex; } else {
      this.wave = new PIXI.TilingSprite(this.waveTex, 10, 10); this.wave.visible = false; this.fxLayer.addChildAt(this.wave, 0);
    }
    for (const p of this.parts) p.s.texture = this.dropTex;
    // eski dokuları güvenle serbest bırak (sprite'lar sync ile yenisine geçer)
    this.seen.piece = this.seen.board = this.seen.queue = -1;
    this.syncAll();
    for (const o of oldTex) if (o) for (const k in o) o[k].destroy(false);
    if (oldBase) oldBase.destroy();
    if (oldDrop) oldDrop.destroy(true);
    if (oldWave) oldWave.destroy(true);
  }

  layout(L: Layout) {
    this.L = L;
    const c = L.cell;
    this.boardC.position.set(L.board.x, L.board.y);
    for (const b of this.bounce) b.s.scale.set(1); this.bounce.length = 0;
    for (let i = 0; i < 10; i++) { this.flashes[i].width = COLS * c; this.flashes[i].height = c; }
    this.buildTextures(c);
  }

  setSize(s: PIXI.Sprite, size: number) { s.scale.set(size / s.texture.orig.width); }

  syncAll() { this.syncBoard(); this.syncPiece(); this.syncQueue(); }

  syncBoard() {
    const g = this.game, b = g.board, c = this.L.cell;
    for (let r = 0; r < VIS; r++) for (let col = 0; col < COLS; col++) {
      const v = b[(r + HIDDEN) * COLS + col], s = this.cells[r * COLS + col];
      if (v) { s.texture = this.tex[v]; s.visible = true; s.alpha = 1; s.tint = 0xffffff; this.setSize(s, c); s.position.set(col * c + c / 2, r * c + c / 2); }
      else s.visible = false;
    }
    this.seen.board = g.boardVer;
  }

  syncPiece() {
    const g = this.game, c = this.L.cell;
    const has = g.type && g.state === 'play';
    const sh = has ? SHAPES[g.type][g.rot] : null;
    const gy = has && settings.ghost ? g.ghostY() : -1;
    for (let i = 0; i < 4; i++) {
      const a = this.active[i], gh = this.ghost[i];
      if (!has) { a.visible = gh.visible = false; continue; }
      const cx = g.x + sh![i][0], cy = g.y + sh![i][1] - HIDDEN;   // NS4-02: has ise sh doludur
      a.texture = this.tex[g.type]; this.setSize(a, c);
      a.position.set(cx * c + c / 2, cy * c + c / 2); a.visible = cy >= 0;
      if (gy >= 0 && gy !== g.y) {
        const gyy = gy + sh![i][1] - HIDDEN;
        gh.texture = this.ghostTex[g.type]; this.setSize(gh, c);
        gh.position.set(cx * c + c / 2, gyy * c + c / 2); gh.visible = gyy >= 0;
      } else gh.visible = false;
    }
    this.seen.piece = g.pieceVer; this.seen.ghost = settings.ghost;
  }

  placeMini(sprites: PIXI.Sprite[], type: number, cx = 0, cy = 0, mc = 0, alpha = 1) {   // NS4-02: varsayılanlar yalnızca type=0 çağrısı için (erken dönüş)
    if (!type) { for (const s of sprites) s.visible = false; return; }
    const sh = SHAPES[type][0];
    let minx = 9, maxx = -1, miny = 9, maxy = -1;
    for (const p of sh) { minx = Math.min(minx, p[0]); maxx = Math.max(maxx, p[0]); miny = Math.min(miny, p[1]); maxy = Math.max(maxy, p[1]); }
    const ox = cx - ((maxx - minx + 1) * mc) / 2, oy = cy - ((maxy - miny + 1) * mc) / 2;
    for (let i = 0; i < 4; i++) {
      const s = sprites[i]; s.texture = this.tex[type]; this.setSize(s, mc);
      s.position.set(ox + (sh[i][0] - minx) * mc + mc / 2, oy + (sh[i][1] - miny) * mc + mc / 2);
      s.visible = true; s.alpha = alpha;
    }
  }

  syncQueue() {
    const g = this.game, L = this.L;
    this.placeMini(this.holdS, g.hold, L.holdSlot.x, L.holdSlot.y, L.mini, g.canHold ? 1 : 0.35);
    for (let k = 0; k < 5; k++) {
      const slot = L.nextSlots[k];
      if (!slot) { this.placeMini(this.nextS[k], 0); continue; }
      this.placeMini(this.nextS[k], g.queue[k], slot.x, slot.y, k === 0 ? L.miniBig : L.mini, 1);
    }
    this.seen.queue = g.queueVer;
  }

  // ---- efektler ----
  emitDrop(x: number, y: number, tint: number, vx: number, vy: number, life: number, g: number, scale: number) {
    const p = this.parts[this.partIdx]; this.partIdx = (this.partIdx + 1) % this.parts.length;
    p.s.position.set(x, y); p.s.tint = tint; p.s.alpha = 1;
    p.s.scale.set(scale); p.base = scale;
    p.vx = vx; p.vy = vy; p.life = life; p.max = life; p.g = g;
  }

  onLock(cells: number[]) {
    const c = this.L.cell;
    for (const idx of cells) {
      const r = ((idx / COLS) | 0) - HIDDEN; if (r < 0) continue;
      const s = this.cells[r * COLS + (idx % COLS)];
      this.bounce.push({ s, t: 0 });
    }
    this.pendingBoardSync = true;
  }

  onHard(d: number) { this.shake = Math.min(1, 0.25 + d * 0.04); }

  onClearStart(e: Pending) {
    const c = this.L.cell, g = this.game;
    this.syncBoard();
    this.anim = { kind: e.kind, rows: e.rows.map((r) => r - HIDDEN).filter((r) => r >= 0), t: 0, dur: e.kind === 'cyc' ? CFG.drainMs : e.kind === 'syn' ? CFG.synClearMs : CFG.lineClearMs };
    const rows = this.anim.rows;
    if (e.kind !== 'cyc') {
      rows.forEach((r, i) => { const f = this.flashes[i]; f.visible = true; f.alpha = 1; f.y = r * c; f.tint = e.kind === 'syn' ? 0xff6070 : 0xffffff; });
      // drenaj damlacıkları: hücre başına 2 adet, aşağı akar
      for (const r of rows) for (let col = 0; col < COLS; col++) {
        const v = g.board[(r + HIDDEN) * COLS + col] || 1;
        // NS4-02: utils.string2hex(x) npm paketinde her oturumda bir deprecation uyarısı basıyor (CDN pixi.min.js basmıyordu).
        // Aynı hesaplamanın kendisi (string2hex = Color.shared.setValue(x).toNumber()) doğrudan çağrılıyor; sonuç birebir aynı.
        const tint = e.kind === 'syn' ? 0xff8a95 : PIXI.Color.shared.setValue(COLORS[v]).toNumber();
        for (let k = 0; k < 2; k++) this.emitDrop(col * c + c / 2 + (Math.random() - 0.5) * c * 0.6, r * c + c / 2, k ? 0xffffff : tint,
          (Math.random() - 0.5) * c * 3, (Math.random() * 0.5 - 0.9) * c * 6, 500 + Math.random() * 350, c * 38, (0.45 + Math.random() * 0.5) * c / this.dropTex.orig.width * 1.2);
      }
    } else {
      this.wave.visible = true; this.wave.width = COLS * c; this.wave.height = 1; this.wave.y = VIS * c;
      this.wave.tileScale.set(c * 2.6 / 256, (VIS * 0.6) * c / 128); this.wave.tilePosition.y = 0;
    }
  }

  onClearEnd() { for (const f of this.flashes) f.visible = false; this.anim = this.anim && this.anim.kind === 'cyc' ? Object.assign(this.anim, { recede: 0 }) : null; this.syncAll(); }

  onGameOver() { this.overT = 0; this.syncPiece(); this.shake = 0.8; }

  update(dt: number) {
    const g = this.game, L = this.L; if (!L) return;
    const c = L.cell;
    if (g.boardVer !== this.seen.board && !this.anim) this.syncBoard();
    if (g.pieceVer !== this.seen.piece || settings.ghost !== this.seen.ghost) this.syncPiece();
    if (g.queueVer !== this.seen.queue) this.syncQueue();

    // oturma yaylanması
    for (let i = this.bounce.length - 1; i >= 0; i--) {
      const b = this.bounce[i]; b.t += dt;
      const p = Math.min(1, b.t / 140), k = 1 + Math.sin(p * Math.PI) * 0.09;
      const base = c / b.s.texture.orig.width;
      b.s.scale.set(base * k, base * (2 - k));
      if (p >= 1) { b.s.scale.set(base); this.bounce.splice(i, 1); }
    }

    // temizleme animasyonu
    const a = this.anim;
    if (a) {
      a.t += dt;
      if (a.recede != null) {
        a.recede += dt;
        const p = Math.min(1, a.recede / 520);
        this.wave.alpha = 1 - p; this.wave.tilePosition.x -= dt * 0.12;
        if (p >= 1) { this.wave.visible = false; this.wave.alpha = 1; this.anim = null; }
      } else if (a.kind === 'cyc') {
        const p = Math.min(1, a.t / a.dur), e = 1 - Math.pow(1 - p, 3);
        const top = a.rows.length ? Math.min(...a.rows) : VIS;
        const h = (VIS - top) * c * e + c * 0.6;
        this.wave.height = h; this.wave.y = VIS * c - h; this.wave.tilePosition.x -= dt * 0.12;
        for (const r of a.rows) for (let col = 0; col < COLS; col++) {
          const s = this.cells[r * COLS + col]; if (!s.visible) continue;
          if (s.y > this.wave.y) { s.alpha = Math.max(0, s.alpha - dt / 260); s.scale.set(c / s.texture.orig.width * (0.6 + 0.4 * s.alpha)); }
        }
        if (Math.random() < dt / 16) this.emitDrop(Math.random() * COLS * c, VIS * c - Math.random() * h, 0xffffff, (Math.random() - 0.5) * c, -c * (2 + Math.random() * 3), 700, -c * 2, (0.25 + Math.random() * 0.3) * c / this.dropTex.orig.width);
      } else {
        const p = Math.min(1, a.t / a.dur);
        for (let i = 0; i < a.rows.length; i++) this.flashes[i].alpha = Math.max(0, 1 - p * 1.6);
        const k = 1 - Math.pow(p, 1.6);
        for (const r of a.rows) for (let col = 0; col < COLS; col++) {
          const s = this.cells[r * COLS + col]; if (!s.visible) continue;
          const base = c / s.texture.orig.width;
          s.scale.set(base * Math.max(0.001, k), base * Math.max(0.001, k * 0.7));
          s.alpha = k;
          s.y = r * c + c / 2 + p * c * 0.35;
        }
      }
    }

    // parçacıklar
    for (let i = 0; i < this.parts.length; i++) {
      const p = this.parts[i]; if (p.life <= 0) continue;
      p.life -= dt;
      if (p.life <= 0) { p.s.alpha = 0; continue; }
      const sec = dt / 1000;
      p.vy += p.g * sec;
      p.s.x += p.vx * sec; p.s.y += p.vy * sec;
      const f = p.life / p.max;
      p.s.alpha = f;
      p.s.scale.set(p.base! * (0.5 + 0.5 * f));   // NS4-02: life > 0 ise emitDrop base atamıştır
    }

    // oyun sonu: yığını alttan yukarı griye çevir
    if (this.overT >= 0) {
      this.overT += dt;
      const n = Math.min(VIS, Math.floor(this.overT / 32));
      for (let r = VIS - 1; r >= VIS - n; r--) for (let col = 0; col < COLS; col++) {
        const s = this.cells[r * COLS + col]; if (s.visible && s.texture !== this.tex[8]) { s.texture = this.tex[8]; s.alpha = 0.75; }
      }
    }

    // sarsıntı
    if (this.shake > 0.01) {
      this.shake *= Math.pow(0.0015, dt / 1000);
      const m = this.shake * c * 0.18;
      this.boardC.position.set(L.board.x + (Math.random() - 0.5) * m, L.board.y + Math.random() * m);
    } else if (this.shake !== 0) { this.shake = 0; this.boardC.position.set(L.board.x, L.board.y); }
  }
}

/* =====================================================================
   LAYOUT (portre / yatay uyarlamalı)
   ===================================================================== */
function computeLayout(W: number, H: number): Layout {
  const pad = 12;
  const portrait = W / H < 0.95 || W < 600;
  const L = { W, H, portrait } as Layout;   // NS4-02: alanlar aşağıda kademeli dolduruluyor
  if (portrait) {
    const topH = Math.round(Math.max(64, Math.min(96, H * 0.11)));
    const botH = 70;
    const meterW = 10;
    let cell = Math.floor(Math.min((W - pad * 2 - (meterW + 8) * 2) / COLS, (H - topH - botH - pad * 3) / VIS));
    cell = Math.max(12, Math.min(44, cell));
    const bw = cell * COLS, bh = cell * VIS;
    const bx = Math.round((W - bw) / 2);
    const freeV = H - topH - botH - bh - pad * 2;
    const by = Math.round(pad + topH + Math.max(0, freeV / 2));
    L.cell = cell; L.board = { x: bx, y: by, w: bw, h: bh };
    L.meter = { x: bx - meterW - 8, y: by, w: meterW, h: bh };
    const hb = topH - 6, hw = hb;
    L.hold = { x: pad, y: pad, w: hw, h: hb };
    L.mini = Math.max(8, Math.floor(hb * 0.18)); L.miniBig = L.mini;
    L.holdSlot = { x: L.hold.x + hw / 2, y: L.hold.y + hb / 2 + 7 };
    const nw = Math.round(hb * 1.6);
    L.next = { x: W - pad - nw, y: pad, w: nw, h: hb };
    L.nextSlots = [0, 1].map((k) => ({ x: L.next.x + nw * (k + 0.5) / 2, y: L.next.y + hb / 2 + 7 }));
    L.stats = { x: L.hold.x + hw + 6, y: pad, w: L.next.x - (L.hold.x + hw) - 12, h: hb };
    const by2 = H - pad - 56;
    const gap = 8, pw = 48;
    const bw3 = Math.floor((W - pad * 2 - pw - gap * 3) / 3);
    L.btnHold = { x: pad, y: by2, w: bw3, h: 56 };
    L.btnCyc = { x: pad + bw3 + gap, y: by2, w: bw3, h: 56 };
    L.btnSyn = { x: pad + (bw3 + gap) * 2, y: by2, w: bw3, h: 56 };
    L.btnPause = { x: W - pad - 46, y: by2 + 5, w: 46, h: 46 };
    L.compactBtns = bw3 < 150; L.compactStats = true;
  } else {
    const side = 6;
    let cell = Math.floor(Math.min((H - pad * 2) / VIS, (W - pad * 2 - 56) / (COLS + side * 2)));
    cell = Math.max(12, Math.min(40, cell));
    const bw = cell * COLS, bh = cell * VIS, sw = cell * side;
    const bx = Math.round((W - bw) / 2), by = Math.round((H - bh) / 2);
    L.cell = cell; L.board = { x: bx, y: by, w: bw, h: bh };
    L.meter = { x: bx - 16, y: by, w: 8, h: bh };
    const lx = bx - 40 - sw, rx = bx + bw + 16;
    L.hold = { x: lx, y: by, w: sw, h: cell * 4 };
    L.mini = Math.round(cell * 0.62); L.miniBig = Math.round(cell * 0.8);
    L.holdSlot = { x: lx + sw / 2, y: by + cell * 2.2 };
    L.stats = { x: lx + 4, y: by + cell * 4.6, w: sw - 4, h: cell * 3 };
    const bh2 = Math.max(52, cell * 1.6);
    L.btnHold = { x: lx, y: by + bh - bh2 * 3 - 16, w: sw, h: bh2 };
    L.btnCyc = { x: lx, y: by + bh - bh2 * 2 - 8, w: sw, h: bh2 };
    L.btnSyn = { x: lx, y: by + bh - bh2, w: sw, h: bh2 };
    L.next = { x: rx, y: by, w: sw, h: cell * 13 };
    L.nextSlots = [0, 1, 2, 3, 4].map((k) => ({ x: rx + sw / 2, y: by + cell * (k === 0 ? 2.6 : 2.6 + 0.4 + k * 2.4) }));
    L.btnPause = { x: rx, y: by + bh - 46, w: 46, h: 46 };
    L.compactBtns = sw < 150; L.compactStats = sw < 150;
  }
  return L;
}

/* =====================================================================
   BOOT
   ===================================================================== */
// NS4-02: typed DOM yardımcısı; eleman yoksa açık hata verir (bütün id'ler index.html'de mevcut)
const $ = <T extends HTMLElement = HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} bulunamadı`);
  return el as T;
};
const stageEl = $('stage');
const game = new Game();
const sound = new Sound();

const app = new PIXI.Application<HTMLCanvasElement>({
  backgroundAlpha: 0, antialias: false, autoDensity: true,
  resolution: Math.min(window.devicePixelRatio || 1, 2),
  powerPreference: 'high-performance',
  width: stageEl.clientWidth, height: stageEl.clientHeight
});
stageEl.appendChild(app.view);
// Not: ticker.maxFPS bilerek ayarlanmıyor; Pixi'nin kare atlama mantığı 60Hz ekranda
// rAF jitter'ı yüzünden kare düşürebiliyor. Mantık zaman tabanlı, 120Hz'de de doğru çalışır.
const view = new View(app, game);
let appState = 'menu';  // menu | playing | paused | over
let L: Layout | null = null;

function place(el: HTMLElement, r: Rect) { el.style.left = r.x + 'px'; el.style.top = r.y + 'px'; el.style.width = r.w + 'px'; el.style.height = r.h + 'px'; }

function doLayout() {
  const W = stageEl.clientWidth, H = stageEl.clientHeight;
  if (!W || !H) return;
  app.renderer.resize(W, H);
  L = computeLayout(W, H);
  place($('board-bg'), L.board);
  $('board-bg').style.backgroundSize = L.cell + 'px ' + L.cell + 'px';
  place($('meter'), L.meter);
  const ml = $('meter-lbl');
  ml.style.left = (L.meter.x - 18) + 'px'; ml.style.top = (L.meter.y + L.meter.h - 80) + 'px';
  ml.style.display = L.portrait ? 'none' : '';
  place($('hold-bg'), L.hold); place($('next-bg'), L.next);
  const lh = $('lbl-hold'), ln = $('lbl-next');
  lh.style.left = (L.hold.x + 12) + 'px'; lh.style.top = (L.hold.y + 6) + 'px';
  ln.style.left = (L.next.x + 12) + 'px'; ln.style.top = (L.next.y + 6) + 'px';
  place($('stats'), L.stats);
  $('stats').classList.toggle('compact', !!L.compactStats);
  place($('btn-hold'), L.btnHold); place($('btn-cyc'), L.btnCyc); place($('btn-syn'), L.btnSyn); place($('btn-pause'), L.btnPause);
  ['btn-hold', 'btn-cyc', 'btn-syn'].forEach((id) => $(id).classList.toggle('compact-btn', L!.compactBtns));
  const pop = $('popups'); place(pop, { x: L.board.x, y: L.board.y + L.board.h * 0.22, w: L.board.w, h: L.board.h * 0.4 });
  $('toast').style.top = (L.board.y + 8) + 'px';
  $('toast').style.left = (L.board.x + L.board.w / 2) + 'px';
  $('toast').style.maxWidth = Math.max(180, L.board.w - 16) + 'px';
  const br = $('badge-rebound'), bm = $('badge-mult');
  br.style.left = bm.style.left = (L.board.x + L.board.w / 2) + 'px';
  br.style.top = (L.board.y + L.board.h - 40) + 'px';
  bm.style.top = (L.board.y + L.board.h - 74) + 'px';
  view.layout(L);
  app.render();
}
let layoutQueued = false;
function queueLayout() { if (layoutQueued) return; layoutQueued = true; requestAnimationFrame(() => { layoutQueued = false; doLayout(); }); }
window.addEventListener('resize', queueLayout);
if (window.ResizeObserver) new ResizeObserver(queueLayout).observe(stageEl);

/* =====================================================================
   HUD
   ===================================================================== */
const hud: { score: number; level: number; lines: number; cong: number; cyc: boolean | null; syn: boolean | null; mult: number; reb: number; danger: boolean | null; cycAnnounced?: boolean } = { score: -1, level: -1, lines: -1, cong: -1, cyc: null, syn: null, mult: -1, reb: -1, danger: null };
function fmt(n: number) { return n.toLocaleString('tr-TR'); }
function updateHud() {
  const g = game;
  if (g.score !== hud.score) { hud.score = g.score; $('hud-score').textContent = fmt(g.score); }
  if (g.level !== hud.level) { hud.level = g.level; $('hud-level').textContent = String(g.level); }
  if (g.lines !== hud.lines) { hud.lines = g.lines; $('hud-lines').textContent = String(g.lines); }
  const cg = Math.round(g.congestion() * 100) / 100;
  if (cg !== hud.cong) {
    hud.cong = cg; $('meter-cover').style.transform = `scaleY(${1 - cg})`;
    const d = cg >= 0.7 && appState === 'playing';
    if (d !== hud.danger) { hud.danger = d; $('danger').classList.toggle('on', d); }
  }
  const cyc = g.canCyc(), syn = g.canSyn();
  if (cyc !== hud.cyc) {
    hud.cyc = cyc; $<HTMLButtonElement>('btn-cyc').disabled = !cyc; $('btn-cyc').classList.toggle('ready', cyc);
    $('cyc-sub').textContent = g.cycUsed ? 'Bu oyunda kullanıldı' : cyc ? 'Hazır' : 'Tıkanıklık %35\u2019te açılır';
    if (cyc && !hud.cycAnnounced) { hud.cycAnnounced = true; toast('Sinüslerin dolmaya başladı. Sıklamen özütü hazır.'); }
  }
  if (syn !== hud.syn) { hud.syn = syn; $<HTMLButtonElement>('btn-syn').disabled = !syn; $('btn-syn').classList.toggle('ready', syn && g.synUses === 0); }
  const m = Math.ceil(g.multT / 1000);
  if (m !== hud.mult) { hud.mult = m; const el = $('badge-mult'); el.style.display = m > 0 ? 'block' : 'none'; if (m > 0) el.textContent = `Ferah nefes ×2 · ${m} sn`; }
  const rb = Math.ceil(g.reboundT / 1000);
  if (rb !== hud.reb) { hud.reb = rb; const el = $('badge-rebound'); el.style.display = rb > 0 ? 'block' : 'none'; if (rb > 0) el.textContent = `Rebound: tıkanıklık geri tepiyor · ${rb} sn`; }
}
function resetHud() { for (const k in hud) (hud as Record<string, unknown>)[k] = k === 'cycAnnounced' ? false : null; hud.score = hud.level = hud.lines = hud.cong = hud.mult = hud.reb = -1; }

let toastTimer = 0;
function toast(msg: string, ms?: number) {
  const t = $('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), ms || 2600);
}
function popup(big: string, sub?: string, cls?: string) {
  const box = $('popups');
  while (box.childElementCount > 2) box.firstChild!.remove();
  const d = document.createElement('div'); d.className = 'pop ' + (cls || '');
  d.innerHTML = `<span class="big"></span>${sub ? '<span class="sub"></span>' : ''}`;
  d.querySelector('.big')!.textContent = big; if (sub) d.querySelector('.sub')!.textContent = sub;
  box.appendChild(d);
  d.addEventListener('animationend', () => d.remove());
}

/* =====================================================================
   BADGES
   ===================================================================== */
const BADGES: Record<string, { name: string; desc: string }> = {
  ozmotik: { name: 'Ozmotik usta', desc: 'İlk 4 satırlık drenaj' },
  noro: { name: 'Nörorefleks uzmanı', desc: 'İlk T-spin temizliği' },
  akis: { name: 'Akış hali', desc: '5\u2019li kombo' },
  dogal: { name: 'Doğal yol', desc: 'Sentetik açıcısız 5. seviye' },
  derin: { name: 'Derin nefes', desc: 'Toplam 100 satır drenaj' }
};
let newBadges: string[] = [];
function award(id: string) {
  if (meta.badges.includes(id)) return;
  meta.badges.push(id); newBadges.push(id); store.set('meta', meta);
  toast(`Rozet kazandın: ${BADGES[id].name}`, 3000);
  track('badge', { id });
}

/* =====================================================================
   GAME EVENTS -> view/audio/haptics
   ===================================================================== */
game.on('move', () => sound.move());
game.on('rotate', () => sound.rotate());
game.on('hold', () => sound.hold());
game.on('lock', (cells) => { view.onLock(cells); sound.lock(); buzz(HAPTIC.lock); });
game.on('harddrop', (d) => { view.onHard(d); sound.hard(); buzz(HAPTIC.hard); });
game.on('clearstart', (e) => {
  view.onClearStart(e);
  if (e.kind === 'cyc') { sound.cyc(); buzz(HAPTIC.cyc); popup('Sıklamen özütü', 'Ozmotik drenaj başladı', 'cyc'); }
  else if (e.kind === 'syn') { sound.syn(); buzz(HAPTIC.syn); }
});
game.on('clearend', () => view.onClearEnd());
game.on('scored', (e) => {
  sound.clear(e.n, e.tspin); if (e.n) buzz(HAPTIC.clear(e.n));
  const names = ['', 'Tek', 'Çift', 'Üçlü', 'TETRİS'];
  let big = '', sub = '', cls = '';
  if (e.tspin) { big = (e.tspin === 1 ? 'Mini ' : '') + 'T-spin' + (e.n ? ' ' + names[e.n].toLowerCase() : ''); sub = 'Nörorefleks etki'; cls = 'cyc'; }
  else if (e.n === 4) { big = 'TETRİS'; sub = 'Ozmotik etki: dört satır birden'; cls = 'cyc'; }
  else if (e.n >= 2) { big = names[e.n] + ' drenaj'; }
  if (e.b2b) sub = 'Art arda · ' + sub;
  if (e.combo >= 2) { if (!big) big = `Kombo ×${e.combo}`; else sub = (sub ? sub + ' · ' : '') + `kombo ×${e.combo}`; }
  if (big) popup(big, sub, cls);
  if (e.n === 4) award('ozmotik');
  if (e.tspin && e.n) award('noro');
  if (e.combo >= 5) award('akis');
});
game.on('levelup', (lv) => {
  sound.level(); popup(`Nefes seviyesi ${lv}`, 'Mukus daha hızlı birikiyor');
  track('level_up', { level: lv });
  if (lv >= 5 && game.synUses === 0) award('dogal');
});
game.on('powerdone', (e) => {
  if (e.kind === 'syn') {
    if (e.rebound) { sound.warn(); popup('Rebound', 'Sık kullanım tıkanıklığı geri getirdi', 'warn'); toast('Dekonjestanların uzun süreli kullanımı tıkanıklığın geri dönmesine yol açabilir.', 3600); }
    else { popup('3 satır açıldı', 'Tekrarlarsan geri tepebilir', 'warn'); }
    $('syn-sub').textContent = `Kullanım: ${game.synUses}`;
  } else if (e.kind === 'cyc') { $('cyc-sub').textContent = 'Bu oyunda kullanıldı'; }
});
game.on('garbage', () => { view.shake = 0.35; sound.warn(); buzz(30); });
game.on('gameover', (reason) => {
  view.onGameOver(); sound.over(); buzz(HAPTIC.over); sound.setMusic(false);
  input.reset();
  appState = 'over'; $('danger').classList.remove('on');
  meta.totalLines += game.lines;
  if (meta.totalLines >= 100) award('derin');
  const isBest = game.score > meta.best; if (isBest) meta.best = game.score;
  store.set('meta', meta);
  track('game_over', { reason, score: game.score, level: game.level, lines: game.lines, dur_s: Math.round(game.elapsed / 1000), cyc_used: game.cycUsed, syn_uses: game.synUses, tetrises: game.tetrises });
  setTimeout(() => showOver(isBest), 950);
});

/* =====================================================================
   INPUT: klavye (DAS/ARR) + dokunmatik jestler
   ===================================================================== */
const input = {
  dir: 0, left: false, right: false, dasT: 0, arrT: 0,
  reset() { this.dir = 0; this.left = this.right = false; game.softDrop = false; gesture = null; },
  press(d: number) { this.dir = d; this.dasT = 0; this.arrT = 0; game.move(d); },
  update(dt: number) {
    if (!this.dir || game.state !== 'play') return;
    this.dasT += dt;
    if (this.dasT < settings.das) return;
    if (settings.arr === 0) { while (game.move(this.dir)); return; }
    this.arrT += dt;
    while (this.arrT >= settings.arr) { this.arrT -= settings.arr; if (!game.move(this.dir)) { this.arrT = 0; break; } }
  }
};
const KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' ', 'Space']);
window.addEventListener('keydown', (e) => {
  if (KEYS.has(e.key) && appState === 'playing') e.preventDefault();
  if (appState === 'paused' && (e.key === 'Escape' || e.key === 'p' || e.key === 'P')) { resume(); return; }
  if (appState !== 'playing') return;
  if (e.repeat && e.key !== 'ArrowDown') return;
  sound.unlock();
  switch (e.key) {
    case 'ArrowLeft': input.left = true; input.press(-1); break;
    case 'ArrowRight': input.right = true; input.press(1); break;
    case 'ArrowDown': game.softDrop = true; break;
    case 'ArrowUp': case 'x': case 'X': game.rotate(1); break;
    case 'z': case 'Z': case 'Control': game.rotate(-1); break;
    case ' ': game.hardDrop(); break;
    case 'c': case 'C': case 'Shift': game.doHold(); break;
    case '1': game.useCyc(); break;
    case '2': game.useSyn(); break;
    case 'Escape': case 'p': case 'P': pause(); break;
  }
});
window.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowLeft') { input.left = false; input.dir = input.right ? 1 : 0; input.dasT = 0; }
  else if (e.key === 'ArrowRight') { input.right = false; input.dir = input.left ? -1 : 0; input.dasT = 0; }
  else if (e.key === 'ArrowDown') game.softDrop = false;
});

type Gesture = { id: number; x0: number; y0: number; t0: number; cols: number; rows: number; axis: number; hist: number[][] };
let gesture: Gesture | null = null;
const cv = app.view;
cv.addEventListener('pointerdown', (e) => {
  if (appState !== 'playing') return;
  sound.unlock();
  try { cv.setPointerCapture(e.pointerId); } catch (_) {}
  gesture = { id: e.pointerId, x0: e.clientX, y0: e.clientY, t0: performance.now(), cols: 0, rows: 0, axis: 0, hist: [[e.clientX, e.clientY, performance.now()]] };
});
cv.addEventListener('pointermove', (e) => {
  const g = gesture; if (!g || e.pointerId !== g.id || appState !== 'playing') return;
  const now = performance.now();
  g.hist.push([e.clientX, e.clientY, now]); if (g.hist.length > 6) g.hist.shift();
  const dx = e.clientX - g.x0, dy = e.clientY - g.y0, c = L!.cell;
  if (!g.axis) {
    if (Math.abs(dx) > c * 0.45 || Math.abs(dy) > c * 0.45) g.axis = Math.abs(dx) >= Math.abs(dy) ? 1 : 2;
    else return;
  }
  if (g.axis === 1) {
    const step = c * 0.9;
    const want = Math.trunc(dx / step);
    while (g.cols < want) { if (!game.move(1)) { g.cols = want; break; } g.cols++; }
    while (g.cols > want) { if (!game.move(-1)) { g.cols = want; break; } g.cols--; }
  } else if (dy > 0) {
    const want = Math.floor(dy / (c * 0.9));
    while (g.rows < want) { if (!game.softStep()) { g.rows = want; break; } g.rows++; }
  }
});
function endGesture(e: PointerEvent) {
  const g = gesture; if (!g || e.pointerId !== g.id) return;
  gesture = null;
  if (appState !== 'playing') return;
  const now = performance.now(), dx = e.clientX - g.x0, dy = e.clientY - g.y0, c = L!.cell;
  let ref = g.hist[0]; for (const h of g.hist) if (now - h[2] <= 90) { ref = h; break; }
  const vdt = Math.max(1, now - ref[2]), vy = (e.clientY - ref[1]) / vdt;
  if (!g.axis && now - g.t0 < 320) {
    const r = cv.getBoundingClientRect();
    game.rotate(e.clientX - r.left < r.width / 3 ? -1 : 1);
  } else if (g.axis === 2) {
    if (vy > 0.75 && dy > c * 1.2) game.hardDrop();
    else if (vy < -0.6 && dy < -c * 1.4) game.doHold();
  }
}
cv.addEventListener('pointerup', endGesture);
cv.addEventListener('pointercancel', (e) => { if (gesture && e.pointerId === gesture.id) gesture = null; });

function bindBtn(id: string, fn: () => unknown) {
  $(id).addEventListener('pointerdown', (e) => { e.preventDefault(); sound.unlock(); fn(); });
  $(id).addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); fn(); } });
}
bindBtn('btn-hold', () => appState === 'playing' && game.doHold());
bindBtn('btn-cyc', () => appState === 'playing' && game.useCyc());
bindBtn('btn-syn', () => appState === 'playing' && game.useSyn());
bindBtn('btn-pause', () => appState === 'playing' && pause());

/* =====================================================================
   SCREENS
   ===================================================================== */
const TIPS = [
  ['Paranazal sinüsler', 'Kafatasındaki hava dolu boşluklardır: maksiller (yanak), frontal (alın), etmoid (gözler arası) ve sfenoid (kafa tabanı).'],
  ['Tıkanıklık nasıl olur?', 'Sinüzitte mukoza zarı iltihaplanır ve sinüs ağızları (ostiumlar) tıkanabilir. Yüzde baskı, baş ağrısı ve koku kaybı görülebilir.'],
  ['Sıklamen', 'Cyclamen europaeum L., Primulaceae familyasından yumrulu bir bitkidir. Yumrusu saponin içerir; ekstresinin burun mukozasında ozmotik etkiyle mukus akışını artırdığı bildirilmektedir.'],
  ['Kullanım süresine dikkat', 'Dekonjestan burun spreylerinin önerilenden uzun kullanımı, tıkanıklığın daha şiddetli geri dönmesine (rinitis medikamentoza) yol açabilir. Prospektüsteki süreye uyun.'],
  ['Ne zaman hekime gitmeli?', '10 günü aşan, ateşle seyreden, göz çevresinde şişlik yapan ya da giderek kötüleşen şikâyetlerde bir hekime başvurun.'],
  ['Sıvı tüketimi', 'Gün içinde yeterli sıvı almak ve burnu tuzlu suyla yıkamak mukusun akışkan kalmasına yardımcı olabilir.']
];
let tipIdx = (Math.random() * TIPS.length) | 0;
function setTip(id: string) { const t = TIPS[tipIdx++ % TIPS.length]; $(id).innerHTML = '<b></b><span></span>'; $(id).querySelector('b')!.textContent = t[0]; $(id).querySelector('span')!.textContent = t[1]; }

let screenStack: (string | undefined)[] = [];
function show(id: string | null | undefined) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('on'));
  const ae = document.activeElement as HTMLElement | null;
  if (ae && ae.blur) ae.blur();
  if (id) { $(id).classList.add('on'); const f = $(id).querySelector<HTMLElement>('[data-focus]') || $(id).querySelector<HTMLElement>('button,a'); if (f) setTimeout(() => f.focus({ preventScroll: true }), 30); }
}
function openSub(id: string) { screenStack.push(document.querySelector('.screen.on')?.id); show(id); }
document.querySelectorAll('[data-back]').forEach((b) => b.addEventListener('click', () => { show(screenStack.pop() || 'scr-start'); }));

function start() {
  sound.unlock();
  game.reset(); resetHud(); newBadges = [];
  view.overT = -1; view.anim = null; view.wave && (view.wave.visible = false);
  for (const f of view.flashes) f.visible = false;
  view.syncAll();
  $('syn-sub').textContent = 'Hızlı ama geri tepebilir';
  input.reset();
  appState = 'playing'; show(null);
  sound.setMusic(true);
  track('game_start', { best: meta.best });
}
function pause() { if (appState !== 'playing') return; appState = 'paused'; requestAnimationFrame(() => { if (appState === 'paused') app.ticker.stop(); }); input.reset(); setTip('tip-pause'); show('scr-pause'); sound.setMusic(false); $('danger').classList.remove('on'); hud.danger = null; }
function resume() { if (appState !== 'paused') return; app.ticker.start(); appState = 'playing'; show(null); sound.setMusic(true); }
function toMenu() { app.ticker.start(); appState = 'menu'; setTip('tip-start'); show('scr-start'); sound.setMusic(false); $('danger').classList.remove('on'); }
function showOver(isBest: boolean) {
  $('o-score').textContent = fmt(game.score); $('o-lines').textContent = String(game.lines); $('o-best').textContent = fmt(meta.best);
  $('newbest').style.display = isBest ? 'block' : 'none';
  const bx = $('o-badges'); bx.innerHTML = '';
  for (const id in BADGES) {
    const s = document.createElement('span');
    const has = meta.badges.includes(id);
    s.className = newBadges.includes(id) ? 'new' : has ? '' : 'locked';
    s.textContent = BADGES[id].name; s.title = BADGES[id].desc;
    bx.appendChild(s);
  }
  setTip('tip-over');
  show('scr-over');
}

$('b-play').addEventListener('click', start);
$('b-again').addEventListener('click', start);
$('b-menu').addEventListener('click', toMenu);
$('b-quit').addEventListener('click', toMenu);
$('b-resume').addEventListener('click', resume);
$('b-how').addEventListener('click', () => openSub('scr-how'));
$('b-set1').addEventListener('click', () => openSub('scr-set'));
$('b-set2').addEventListener('click', () => openSub('scr-set'));
$<HTMLAnchorElement>('cta-over').href = ctaUrl('game_over');
$<HTMLAnchorElement>('cta-pause').href = ctaUrl('pause_menu');
$('cta-over').addEventListener('click', () => track('cta_click', { placement: 'game_over', score: game.score }));
$('cta-pause').addEventListener('click', () => track('cta_click', { placement: 'pause_menu' }));

// ayarlar
if (!canVibrate) { $('hap-note').textContent = 'Bu cihaz/tarayıcı titreşimi desteklemiyor'; }
document.querySelectorAll<HTMLInputElement>('#scr-set [data-k]').forEach((inp) => {
  const k = inp.dataset.k as keyof typeof settings;
  if (inp.type === 'checkbox') inp.checked = !!settings[k]; else inp.value = String(settings[k]);
  const lbl = () => { $('v-das').textContent = String(settings.das); $('v-arr').textContent = String(settings.arr); };
  lbl();
  inp.addEventListener('input', () => {
    (settings as Record<string, boolean | number>)[k] = inp.type === 'checkbox' ? inp.checked : +inp.value;
    store.set('settings', settings); lbl();
    if (k === 'sound' || k === 'music') sound.applySettings();
    if (k === 'fps') $('fps').style.display = settings.fps ? 'block' : 'none';
  });
});
$('fps').style.display = settings.fps ? 'block' : 'none';

// sekme gizlenince/odak kaybında otomatik mola
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
window.addEventListener('blur', () => pause());

/* =====================================================================
   MAIN LOOP
   ===================================================================== */
let fpsAcc = 0, fpsFrames = 0, fpsWorst = 0;
app.ticker.add(() => {
  const raw = app.ticker.deltaMS;
  const dt = Math.min(raw, 100);       // sekme dönüşü gibi uzun boşluklarda patlama yok
  if (appState === 'playing') { input.update(dt); game.update(dt); }
  view.update(dt);
  if (appState === 'playing' || appState === 'over') updateHud();
  if (settings.fps) {
    fpsAcc += raw; fpsFrames++; if (raw > fpsWorst) fpsWorst = raw;
    if (fpsAcc >= 500) {
      $('fps').textContent = `${Math.round(fpsFrames * 1000 / fpsAcc)} fps · en kötü ${fpsWorst.toFixed(1)} ms`;
      fpsAcc = 0; fpsFrames = 0; fpsWorst = 0;
    }
  }
});

setTip('tip-start');
const fontsReady = document.fonts && document.fonts.ready ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1200))]) : Promise.resolve();
doLayout();
fontsReady.then(queueLayout);
// hata ayıklama (NS4-02: yalnızca development; production build'de global debug erişimi yok)
if (import.meta.env.DEV) {
  window.__fn = { game, view, app };
}
