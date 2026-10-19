/* =====================================================================
   GAME (saf mantık, render'dan bağımsız)
   NS4-03: main.ts'ten taşındı. Bu sınıf DOM, PixiJS, localStorage, ses,
   titreşim, analitik ve CTA bilmez; dış dünyayla yalnızca on()/emit()
   olaylarıyla konuşur. Kurallar, süreler ve skor tabloları değişmedi.
   NS4-09: bölüm (sinüs) modu. Tahta alttan boşluklu tıkaç satırlarıyla
   başlar (içinde mikroplar); bütün tıkaç temizlenince bölüm biter ('won').
   Sıklamen gücü artık temizlenen satırlarla şarj olur ve tekrar kullanılır.
   ===================================================================== */
import { COLS, ROWS, HIDDEN, VIS, CFG } from '../config/gameConfig';
import { PIECE, SHAPES, KICK_JLSTZ, KICK_I, kickKey, nextRotation } from './pieces';
import { CLOG, GERM, buildClog } from './stages';
import type { GameEventArgs, GameEventListener, GameEventName, PendingClear } from '../types/events';
import type {
  GameMode,
  GameOverReason,
  GameState,
  PieceSlot,
  RotationDirection,
  RotationState,
  StageRules,
  Step,
  TSpinKind,
  TetrominoType,
} from '../types/game';

/** Tahta dışı hücre (yanlar ve taban) için cell() dönüş değeri. NS4-09: hücre değerleri 10'a çıktığı için 9 → 255. */
export const OUT = 255;

export interface ResetOptions {
  readonly mode?: GameMode;
  /** mode 'adventure' ise bölüm kuralları. */
  readonly stage?: StageRules;
}

export class Game {
  private readonly handlers: { [K in GameEventName]?: GameEventListener<K>[] };
  /** Hücre değerleri: CellValue (0 boş, 1-7 tetromino, 8 çöp). */
  readonly board: Uint8Array;
  mode: GameMode = 'endless';
  stage: StageRules | null = null;
  // reset() içinde atanan alanlar (reset() constructor'dan çağrılır)
  state!: GameState;
  type!: PieceSlot;
  rot!: RotationState;
  x!: number;
  y!: number;
  bag!: TetrominoType[];
  queue!: TetrominoType[];
  hold!: PieceSlot;
  canHold!: boolean;
  score!: number;
  lines!: number;
  level!: number;
  combo!: number;
  b2b!: boolean;
  maxCombo!: number;
  tetrises!: number;
  tspins!: number;
  stateT!: number;
  pending!: PendingClear | null;
  gAcc!: number;
  lockT!: number;
  lockResets!: number;
  lowestY!: number;
  softDrop!: boolean;
  lastRot!: boolean;
  lastKick!: number;
  /** Sıklamen gücü: şarj (0..1) ve kullanım sayısı. */
  cycCharge!: number;
  cycUses!: number;
  synUses!: number;
  /** Kilitlenen parça sayısı ve temizlenen mikrop sayısı. */
  pieces!: number;
  germsCleared!: number;
  /** Bölüm başındaki tıkaç hücresi sayısı (ilerleme çubuğu için). */
  clogTotal!: number;
  multT!: number;
  reboundT!: number;
  garbageT!: number;
  elapsed!: number;
  pieceVer!: number;
  boardVer!: number;
  queueVer!: number;
  private _cv?: number;
  private _c!: number;
  constructor() {
    this.handlers = {};
    this.board = new Uint8Array(COLS * ROWS);
    this.reset();
    this.state = 'idle';
    this.type = 0;
  }
  /** Dinleyici ekler (kayıt sırası çağrı sırasıdır). Dönen fonksiyon dinleyiciyi kaldırır. */
  on<K extends GameEventName>(ev: K, fn: GameEventListener<K>): () => void {
    let list = this.handlers[ev];
    if (!list) {
      list = [];
      this.handlers[ev] = list;
    }
    list.push(fn);
    return () => {
      const i = list.indexOf(fn);
      if (i >= 0) list.splice(i, 1);
    };
  }
  emit<K extends GameEventName>(ev: K, ...args: GameEventArgs<K>) {
    const h = this.handlers[ev];
    if (h) for (let i = 0; i < h.length; i++) h[i](...args);
  }

  /** Aktif parça. Yalnızca aktif parçanın olduğu yollarda çağrılır (orijinalde type=0 iken SHAPES[0] okunmuyordu). */
  private get piece(): TetrominoType {
    const t = this.type;
    if (t === 0) throw new Error('Game: aktif parça yok');
    return t;
  }

  reset(opts: ResetOptions = {}) {
    this.mode = opts.mode ?? 'endless';
    this.stage = this.mode === 'adventure' ? (opts.stage ?? null) : null;
    this.board.fill(0);
    this.bag = [];
    this.queue = [];
    this.fillQueue();
    this.hold = 0;
    this.canHold = true;
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.combo = -1;
    this.b2b = false;
    this.maxCombo = 0;
    this.tetrises = 0;
    this.tspins = 0;
    this.state = 'play'; // play | clearing | draining | over
    this.stateT = 0;
    this.pending = null;
    this.gAcc = 0;
    this.lockT = 0;
    this.lockResets = 0;
    this.lowestY = 0;
    this.softDrop = false;
    this.lastRot = false;
    this.lastKick = 0;
    this.cycCharge = this.stage ? this.stage.charge : CFG.cycStartCharge;
    this.cycUses = 0;
    this.synUses = 0;
    this.pieces = 0;
    this.germsCleared = 0;
    if (this.stage) {
      buildClog(this.board, this.stage);
      this.level = this.stage.speed;
    }
    this.clogTotal = this.clogLeft();
    this.multT = 0;
    this.reboundT = 0;
    this.garbageT = 0;
    this.elapsed = 0;
    this.pieceVer = 0;
    this.boardVer = 0;
    this.queueVer = 0;
    this.spawn();
  }

  fillQueue() {
    while (this.queue.length < 8) {
      if (this.bag.length === 0) {
        // 7-bag randomizer
        const b: TetrominoType[] = [1, 2, 3, 4, 5, 6, 7];
        for (let i = 6; i > 0; i--) {
          const j = (Math.random() * (i + 1)) | 0;
          const t = b[i];
          b[i] = b[j];
          b[j] = t;
        }
        this.bag = b;
      }
      this.queue.push(this.bag.pop()!); // NS4-02: bag boşsa üstte yeniden dolduruluyor
    }
  }

  cell(x: number, y: number) {
    return x < 0 || x >= COLS || y >= ROWS ? OUT : y < 0 ? 0 : this.board[y * COLS + x];
  }

  /** Tahtada kalan tıkaç (mikroplu dahil) hücresi. */
  clogLeft() {
    let n = 0;
    for (let i = 0; i < this.board.length; i++) if (this.board[i] === CLOG || this.board[i] === GERM) n++;
    return n;
  }
  germsLeft() {
    let n = 0;
    for (let i = 0; i < this.board.length; i++) if (this.board[i] === GERM) n++;
    return n;
  }
  /** Bölüm ilerlemesi (0..1); serbest oyunda 0. */
  progress() {
    return this.clogTotal > 0 ? 1 - this.clogLeft() / this.clogTotal : 0;
  }

  fits(type: TetrominoType, rot: RotationState, px: number, py: number) {
    const s = SHAPES[type][rot];
    for (let i = 0; i < 4; i++) if (this.cell(px + s[i][0], py + s[i][1])) return false;
    return true;
  }

  spawn(type?: TetrominoType) {
    if (!type) {
      type = this.queue.shift()!;
      this.fillQueue();
      this.queueVer++;
    } // NS4-02: kuyruk her zaman 8 elemanlı
    this.type = type;
    this.rot = 0;
    this.x = 3;
    this.y = 0;
    this.lastRot = false;
    this.lockT = 0;
    this.lockResets = 0;
    this.gAcc = 0;
    if (!this.fits(type, 0, this.x, this.y)) return this.gameOver('blockout');
    if (this.fits(type, 0, this.x, this.y + 1)) this.y++; // guideline: doğduğu anda bir sıra in
    this.lowestY = this.y;
    this.pieceVer++;
    this.emit('spawn');
  }

  grounded() {
    return !this.fits(this.piece, this.rot, this.x, this.y + 1);
  }

  onMoved() {
    if (this.y > this.lowestY) {
      this.lowestY = this.y;
      this.lockResets = 0;
    }
    if (this.grounded() && this.lockResets < CFG.maxLockResets) {
      this.lockT = 0;
      this.lockResets++;
    }
    this.pieceVer++;
  }

  move(dx: Step) {
    if (this.state !== 'play') return false;
    if (!this.fits(this.piece, this.rot, this.x + dx, this.y)) return false;
    this.x += dx;
    this.lastRot = false;
    this.onMoved();
    this.emit('move');
    return true;
  }

  rotate(dir: RotationDirection) {
    if (this.state !== 'play' || this.type === PIECE.O) return false;
    const from = this.rot,
      to = nextRotation(this.rot, dir);
    const kicks = (this.type === PIECE.I ? KICK_I : KICK_JLSTZ)[kickKey(from, to)];
    for (let i = 0; i < kicks.length; i++) {
      const nx = this.x + kicks[i][0],
        ny = this.y - kicks[i][1];
      if (this.fits(this.piece, to, nx, ny)) {
        this.x = nx;
        this.y = ny;
        this.rot = to;
        this.lastRot = true;
        this.lastKick = i;
        this.onMoved();
        this.emit('rotate');
        return true;
      }
    }
    return false;
  }

  softStep() {
    if (this.state !== 'play') return false;
    if (!this.fits(this.piece, this.rot, this.x, this.y + 1)) return false;
    this.y++;
    this.score += 1;
    this.lastRot = false;
    this.onMoved();
    return true;
  }

  ghostY() {
    let y = this.y;
    while (this.fits(this.piece, this.rot, this.x, y + 1)) y++;
    return y;
  }

  hardDrop() {
    if (this.state !== 'play') return;
    const gy = this.ghostY(),
      d = gy - this.y;
    if (d > 0) this.lastRot = false;
    this.y = gy;
    this.score += d * 2;
    this.pieceVer++;
    this.emit('harddrop', d);
    this.lock();
  }

  doHold() {
    if (this.state !== 'play' || !this.canHold) return false;
    const cur = this.type;
    this.canHold = false;
    if (this.hold) {
      const h = this.hold;
      this.hold = cur;
      this.spawn(h);
    } else {
      this.hold = cur;
      this.spawn();
    }
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

  tspinKind(): TSpinKind {
    if (this.type !== PIECE.T || !this.lastRot) return 0;
    const x = this.x,
      y = this.y;
    const c = [
      this.cell(x, y) ? 1 : 0,
      this.cell(x + 2, y) ? 1 : 0,
      this.cell(x + 2, y + 2) ? 1 : 0,
      this.cell(x, y + 2) ? 1 : 0,
    ]; // TL TR BR BL
    if (c[0] + c[1] + c[2] + c[3] < 3) return 0;
    const front = [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
    ][this.rot];
    return (c[front[0]] && c[front[1]]) || this.lastKick === 4 ? 2 : 1; // 2 tam, 1 mini
  }

  lock() {
    const s = SHAPES[this.piece][this.rot];
    const tspin = this.tspinKind();
    let allHidden = true;
    const cells: number[] = [];
    for (let i = 0; i < 4; i++) {
      const cx = this.x + s[i][0],
        cy = this.y + s[i][1];
      this.board[cy * COLS + cx] = this.type;
      cells.push(cy * COLS + cx);
      if (cy >= HIDDEN) allHidden = false;
    }
    this.boardVer++;
    this.canHold = true;
    this.pieces++;
    this.emit('lock', cells);
    if (allHidden) return this.gameOver('lockout');

    const full: number[] = [];
    for (let y = 0; y < ROWS; y++) {
      let f = true;
      for (let x = 0; x < COLS; x++)
        if (!this.board[y * COLS + x]) {
          f = false;
          break;
        }
      if (f) full.push(y);
    }
    this.scoreClear(full.length, tspin);
    if (full.length) {
      this.state = 'clearing';
      this.stateT = CFG.lineClearMs;
      this.pending = { kind: 'lines', rows: full };
      this.type = 0;
      this.pieceVer++;
      this.emit('clearstart', { rows: full, kind: 'lines' });
    } else {
      this.spawn();
    }
  }

  scoreClear(n: number, tspin: TSpinKind) {
    const base =
      tspin === 2 ? [400, 800, 1200, 1600][n] : tspin === 1 ? [100, 200, 400, 400][n] : [0, 100, 300, 500, 800][n];
    // NS4-06: tspin !== 0 ile ifade her zaman boolean (önceden T-spin'siz temizlemede 0 üretiyordu; doğruluk değeri aynı)
    const difficult = n === 4 || (tspin !== 0 && n > 0);
    let pts = base * this.level;
    let b2b = false;
    if (n > 0) {
      if (difficult && this.b2b) {
        pts = Math.floor(pts * 1.5);
        b2b = true;
      }
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
      this.charge(n);
      // bölüm modunda hız bölüm tanımında sabittir
      const lv = Math.min(CFG.maxLevel, 1 + Math.floor(this.lines / CFG.linesPerLevel));
      if (!this.stage && lv > this.level) {
        this.level = lv;
        this.emit('levelup', lv);
      }
    }
  }

  /** NS4-09: temizlenen satır sıklamen gücünü doldurur. */
  charge(lines: number) {
    if (this.cycCharge >= 1 || (this.stage && !this.stage.cyc)) return;
    this.cycCharge = Math.min(1, this.cycCharge + lines / CFG.cycChargeLines);
    if (this.cycCharge >= 1) this.emit('cycready');
  }

  removeRows(rows: readonly number[]) {
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
  congestion() {
    if (this._cv !== this.boardVer) {
      this._cv = this.boardVer;
      this._c = Math.min(1, this.stackHeight() / VIS);
    }
    return this._c;
  }

  nonEmptyBottomRows(maxCount: number, fromRow: number) {
    const out: number[] = [];
    for (let y = ROWS - 1; y >= fromRow && out.length < maxCount; y--) {
      let any = false;
      for (let x = 0; x < COLS; x++)
        if (this.board[y * COLS + x]) {
          any = true;
          break;
        }
      if (any) out.push(y);
    }
    return out.sort((a, b) => a - b);
  }

  canCyc() {
    return this.state === 'play' && this.cycCharge >= 1 && (!this.stage || this.stage.cyc);
  }
  canSyn() {
    return this.state === 'play' && this.congestion() >= CFG.powerThreshold && (!this.stage || this.stage.syn);
  }

  useCyc() {
    if (!this.canCyc()) return false;
    this.cycCharge = 0;
    this.cycUses++;
    const rows = this.nonEmptyBottomRows(CFG.cycRows, HIDDEN);
    this.state = 'draining';
    this.stateT = CFG.drainMs;
    this.pending = { kind: 'cyc', rows };
    this.emit('clearstart', { rows, kind: 'cyc' }); // NS4-03: powerup_use analitiği app/events.ts içinde bu olaydan gönderilir
    return true;
  }

  useSyn() {
    if (!this.canSyn()) return false;
    this.synUses++;
    const rows = this.nonEmptyBottomRows(3, HIDDEN);
    this.state = 'clearing';
    this.stateT = CFG.synClearMs;
    this.pending = { kind: 'syn', rows };
    this.emit('clearstart', { rows, kind: 'syn' }); // NS4-03: powerup_use analitiği app/events.ts içinde bu olaydan gönderilir
    return true;
  }

  /** Satırlardaki mikrop hücreleri. */
  private germsIn(rows: readonly number[]) {
    let n = 0;
    for (const y of rows) for (let x = 0; x < COLS; x++) if (this.board[y * COLS + x] === GERM) n++;
    return n;
  }

  finishPending() {
    const p = this.pending!;
    this.pending = null; // NS4-02: yalnızca clearing/draining sırasında çağrılır, pending doludur
    this.state = 'play';
    const germs = this.germsIn(p.rows);
    this.removeRows(p.rows);
    if (germs > 0) {
      this.germsCleared += germs;
      this.score += 100 * germs * this.level;
      this.emit('germs', germs);
    }
    if (p.kind === 'cyc') {
      this.score += 150 * p.rows.length * this.level;
      this.multT = CFG.cycMultMs;
      this.emit('powerdone', { kind: 'cyc', n: p.rows.length });
    } else if (p.kind === 'syn') {
      this.score += 50 * p.rows.length * this.level;
      if (this.synUses >= 2) {
        // tekrarlanan kullanım -> rebound
        this.reboundT = CFG.reboundMs * (this.synUses - 1);
        this.garbageT = CFG.reboundGarbageEvery * 0.5;
      }
      this.emit('powerdone', { kind: 'syn', n: p.rows.length, rebound: this.synUses >= 2 });
    }
    this.emit('clearend', p);
    if (this.stage && this.clogLeft() === 0) return this.win();
    if (p.kind === 'lines') this.spawn();
    else this.fixActiveOverlap();
  }

  /** Bölümün bütün tıkacı temizlendi: parça kalmaz, yıldızlar parça sayısına göre verilir. */
  win() {
    const par = this.stage ? this.stage.par : 0;
    const stars = this.pieces <= par ? 3 : this.pieces <= Math.ceil(par * 1.5) ? 2 : 1;
    this.state = 'won';
    this.type = 0;
    this.multT = 0;
    this.reboundT = 0;
    this.pieceVer++;
    this.emit('stagecomplete', { stars, pieces: this.pieces, score: this.score, germs: this.germsCleared });
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

  /**
   * Durumu yeniden okur. update() içinde addGarbage() durumu 'over' yapabilir; TypeScript yöntem çağrısından
   * sonra daraltmayı sıfırlamadığı için doğrudan karşılaştırma "imkansız" görünür (NS4-04).
   */
  private isOver(): boolean {
    return this.state === 'over';
  }

  gameOver(reason: GameOverReason) {
    if (this.state === 'over') return;
    this.state = 'over';
    this.pieceVer++;
    this.emit('gameover', reason);
  }

  update(dt: number) {
    if (this.state === 'over' || this.state === 'won') return;
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
      if (this.garbageT <= 0) {
        this.garbageT += CFG.reboundGarbageEvery;
        this.addGarbage();
        if (this.isOver()) return;
      }
    }
    // yerçekimi
    const interval = this.gravityMs();
    this.gAcc += this.softDrop ? dt * CFG.softDropFactor : dt;
    let guard = 0;
    while (this.gAcc >= interval && guard++ < ROWS) {
      this.gAcc -= interval;
      if (this.fits(this.piece, this.rot, this.x, this.y + 1)) {
        this.y++;
        if (this.softDrop) this.score += 1;
        this.lastRot = false;
        if (this.y > this.lowestY) {
          this.lowestY = this.y;
          this.lockResets = 0;
        }
        this.pieceVer++;
      } else {
        this.gAcc = 0;
        break;
      }
    }
    if (guard >= ROWS) this.gAcc = 0;
    // kilit gecikmesi
    if (this.grounded()) {
      this.lockT += dt;
      if (this.lockT >= CFG.lockDelay || (this.lockResets >= CFG.maxLockResets && this.lockT >= CFG.lockDelay * 0.2))
        this.lock();
    } else this.lockT = 0;
  }
}
