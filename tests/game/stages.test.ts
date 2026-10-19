// NS4-09: sinüs haritası bölümleri: tıkaç yerleşimi, ilerleme, mikroplar, kazanma ve güç kısıtları.
import { describe, expect, it } from 'vitest';
import { CFG, COLS, ROWS } from '../../src/config/gameConfig';
import { Game } from '../../src/game/Game';
import { CLOG, GERM, buildClog } from '../../src/game/stages';
import { PIECE } from '../../src/game/pieces';
import { CARDS } from '../../src/content/cards';
import { STAGES } from '../../src/content/stages';
import type { StageRules } from '../../src/types/game';
import { finishClear, mockRandom, placePiece, recordEvents } from '../helpers/gameHelpers';

const RULES: StageRules = {
  rows: 4,
  holes: 1,
  germs: 2,
  speed: 3,
  par: 6,
  seed: 7,
  cyc: false,
  syn: false,
  charge: 0,
};

function adventure(r: StageRules = RULES): Game {
  mockRandom(1);
  const g = new Game();
  g.reset({ mode: 'adventure', stage: r });
  return g;
}

/** Satırdaki boş sütunlar. */
function holesOf(b: Uint8Array, y: number): number[] {
  const out: number[] = [];
  for (let x = 0; x < COLS; x++) if (b[y * COLS + x] === 0) out.push(x);
  return out;
}

/** Tıkaç satırlarındaki bütün boşlukları doldurur (satırlar tamamlanır). */
function fillHoles(g: Game): number[] {
  const rows: number[] = [];
  for (let y = 0; y < ROWS; y++) {
    const h = holesOf(g.board, y);
    let clog = false;
    for (let x = 0; x < COLS; x++) if (g.board[y * COLS + x] === CLOG || g.board[y * COLS + x] === GERM) clog = true;
    if (!clog) continue;
    for (const x of h) g.board[y * COLS + x] = PIECE.O;
    rows.push(y);
  }
  g.boardVer++;
  return rows;
}

describe('tıkaç yerleşimi (buildClog)', () => {
  it('alttan istenen sayıda satır; her satırda yan yana `holes` boşluk', () => {
    for (const holes of [1, 2]) {
      const b = new Uint8Array(COLS * ROWS);
      buildClog(b, { ...RULES, rows: 8, holes, germs: 0 });
      for (let k = 0; k < 8; k++) {
        const h = holesOf(b, ROWS - 1 - k);
        expect(h).toHaveLength(holes);
        expect(h[h.length - 1] - h[0]).toBe(holes - 1);
      }
      expect(holesOf(b, ROWS - 9)).toHaveLength(COLS); // tıkacın üstü boş
    }
  });

  it('boşluklar 2-4 satırlık kuyular oluşturur ve kuyu değişince sütun değişir', () => {
    const b = new Uint8Array(COLS * ROWS);
    buildClog(b, { ...RULES, rows: 12, germs: 0 });
    const cols = Array.from({ length: 12 }, (_, k) => holesOf(b, ROWS - 1 - k)[0]);
    const runs: number[] = [];
    let n = 1;
    for (let k = 1; k < cols.length; k++) {
      if (cols[k] === cols[k - 1]) n++;
      else {
        runs.push(n);
        n = 1;
      }
    }
    for (const r of runs) expect(r).toBeGreaterThanOrEqual(2);
    for (const r of runs) expect(r).toBeLessThanOrEqual(4);
  });

  it('mikroplar tıkacın içinde, satır başına en fazla 2; yerleşim tohumla aynıdır', () => {
    const a = new Uint8Array(COLS * ROWS),
      b = new Uint8Array(COLS * ROWS);
    buildClog(a, { ...RULES, rows: 6, germs: 5 });
    buildClog(b, { ...RULES, rows: 6, germs: 5 });
    expect(Array.from(a)).toEqual(Array.from(b));
    expect(a.filter((v) => v === GERM)).toHaveLength(5);
    for (let y = 0; y < ROWS; y++) {
      let n = 0;
      for (let x = 0; x < COLS; x++) if (a[y * COLS + x] === GERM) n++;
      expect(n).toBeLessThanOrEqual(2);
    }
    const c = new Uint8Array(COLS * ROWS);
    buildClog(c, { ...RULES, rows: 6, germs: 5, seed: 8 });
    expect(Array.from(c)).not.toEqual(Array.from(a));
  });
});

describe('bölüm modu', () => {
  it('reset: tıkaç kurulur, hız bölümden gelir, güç başlangıç şarjı bölümden', () => {
    const g = adventure({ ...RULES, charge: 0.75, cyc: true });
    expect(g.mode).toBe('adventure');
    expect(g.level).toBe(3);
    expect(g.clogTotal).toBe(4 * (COLS - 1));
    expect(g.clogLeft()).toBe(g.clogTotal);
    expect(g.germsLeft()).toBe(2);
    expect(g.progress()).toBe(0);
    expect(g.cycCharge).toBe(0.75);
    g.reset();
    expect(g.mode).toBe('endless');
    expect(g.stage).toBeNull();
    expect(g.clogLeft()).toBe(0);
  });

  it('kapalı güçler kullanılamaz ve şarj olmaz', () => {
    const g = adventure();
    g.cycCharge = 1;
    expect(g.canCyc()).toBe(false);
    for (let y = 2; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (!g.board[y * COLS + x]) g.board[y * COLS + x] = 8;
    g.boardVer++;
    expect(g.canSyn()).toBe(false);
    g.cycCharge = 0;
    g.charge(4);
    expect(g.cycCharge).toBe(0);
  });

  it('tıkaç satırı temizlenince ilerleme artar; mikroplar sayılır ve puan verir; seviye atlanmaz', () => {
    const g = adventure({ ...RULES, rows: 6, germs: 3 });
    const log = recordEvents(g, ['germs', 'levelup', 'stagecomplete']);
    // en üstteki iki tıkaç satırını tamamla (aktif parça yerine doğrudan doldurulur, sonra bir parça kilitlenir)
    const top = ROWS - 6;
    for (const y of [top, top + 1]) for (const x of holesOf(g.board, y)) g.board[y * COLS + x] = PIECE.O;
    g.boardVer++;
    const germsTop = Array.from(g.board.subarray(top * COLS, (top + 2) * COLS)).filter((v) => v === GERM).length;
    placePiece(g, PIECE.I, 0, 0, 0);
    g.lines = 99; // serbest oyunda seviye atlatırdı
    g.hardDrop();
    finishClear(g);
    expect(g.progress()).toBeCloseTo(2 / 6);
    expect(g.germsCleared).toBe(germsTop);
    if (germsTop > 0) expect(log.payloads('germs')).toEqual([germsTop]);
    expect(log.count('levelup')).toBe(0);
    expect(g.level).toBe(3);
  });

  it('bütün tıkaç temizlenince bölüm biter: won, yıldız par sınırına göre, parça doğmaz', () => {
    for (const [pieces, stars] of [
      [6, 3],
      [9, 2],
      [10, 1],
    ] as const) {
      const g = adventure();
      const log = recordEvents(g, ['stagecomplete', 'spawn']);
      fillHoles(g);
      g.pieces = pieces - 1;
      placePiece(g, PIECE.O, 0, 4, 0);
      g.hardDrop(); // kilit: pieces = par değeri; 4 tıkaç satırı tamam
      finishClear(g);
      expect(g.state).toBe('won');
      expect(g.type).toBe(0);
      expect(log.payloads('stagecomplete')[0]?.stars).toBe(stars);
      expect(log.count('spawn')).toBe(0);
      const t = g.elapsed;
      g.update(1000);
      expect(g.elapsed).toBe(t); // won durumunda zaman ilerlemez
    }
  });

  it('güç ile temizlenen son tıkaç da bölümü bitirir', () => {
    const g = adventure({ ...RULES, rows: 2, cyc: true, charge: 1 });
    const log = recordEvents(g, ['stagecomplete']);
    expect(g.useCyc()).toBe(true);
    g.update(CFG.drainMs);
    expect(g.state).toBe('won');
    expect(log.count('stagecomplete')).toBe(1);
  });
});

describe('bölüm içeriği (content/stages.ts)', () => {
  it('8 bölüm; dört sinüs, her biri 2 bölüm; kartlar benzersiz ve tanımlı', () => {
    expect(STAGES).toHaveLength(8);
    const cards = STAGES.map((s) => s.card);
    expect(new Set(cards).size).toBe(8);
    for (const c of cards) expect(CARDS[c]).toBeDefined();
    for (const s of STAGES) {
      expect(s.rules.rows).toBeGreaterThan(0);
      expect(s.rules.rows).toBeLessThanOrEqual(ROWS - 6);
      expect([1, 2]).toContain(s.rules.holes);
      expect(s.rules.par).toBeGreaterThan(0);
      expect(s.intro.length).toBeGreaterThan(10);
    }
    expect(new Set(STAGES.map((s) => s.rules.seed)).size).toBe(8);
  });

  it('güçler kademeli açılır: ilk bölümde kapalı, sentetik açıcı ancak 3. bölümden itibaren', () => {
    expect(STAGES[0].rules.cyc).toBe(false);
    expect(STAGES[1].rules.cyc).toBe(true);
    expect(STAGES.slice(0, 2).every((s) => !s.rules.syn)).toBe(true);
    expect(STAGES.slice(2).every((s) => s.rules.syn && s.rules.cyc)).toBe(true);
  });
});
