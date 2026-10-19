import { describe, expect, it, vi } from 'vitest';
import { CFG, COLS } from '../../src/config/gameConfig';
import { PIECE } from '../../src/game/pieces';
import {
  createGame,
  dropVerticalI,
  finishClear,
  getCell,
  placePiece,
  recordEvents,
  rowCells,
  setCell,
  setupWell,
  stackRows,
} from '../helpers/gameHelpers';

/** İki sentetik kullanımla rebound'u başlatır (her kullanımdan önce tıkanıklık yeniden kurulur). */
function startRebound(g: ReturnType<typeof createGame>) {
  for (let i = 0; i < 2; i++) {
    stackRows(g, 7);
    expect(g.useSyn()).toBe(true);
    finishClear(g);
  }
}

describe('tıkanıklık (congestion)', () => {
  it('yığın yüksekliği / 20 olarak hesaplanır ve 1 ile sınırlıdır', () => {
    const g = createGame(1);
    stackRows(g, 1);
    expect(g.congestion()).toBe(0.05);
    stackRows(g, 7);
    expect(g.congestion()).toBe(0.35);
    stackRows(g, 22);
    expect(g.congestion()).toBe(1);
  });
});

describe('siklamen (cyc)', () => {
  it('%35 altındaki tıkanıklıkta açılmaz', () => {
    const g = createGame(1);
    stackRows(g, 6); // 0.30
    const log = recordEvents(g, ['clearstart']);
    expect(g.canCyc()).toBe(false);
    expect(g.useCyc()).toBe(false);
    expect(g.canSyn()).toBe(false);
    expect(g.useSyn()).toBe(false);
    expect([g.state, g.cycUsed, g.synUses, log.count('clearstart')]).toEqual(['play', false, 0, 0]);
    stackRows(g, 7); // 0.35
    expect(g.canCyc()).toBe(true);
    expect(g.canSyn()).toBe(true);
  });

  it('alt bölgedeki (satır 12..21) dolu satırları drenajla temizler; puan ve 30 sn ×2 verir', () => {
    const g = createGame(1);
    stackRows(g, 10); // satır 12..21
    setCell(g, 2, 11, PIECE.L); // pencerenin (satır 12+) dışında
    const log = recordEvents(g, ['clearstart', 'powerdone', 'clearend']);
    expect(g.useCyc()).toBe(true);
    const rows = [12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
    expect(g.state).toBe('draining');
    expect(log.payloads('clearstart')).toEqual([{ rows, kind: 'cyc' }]);
    g.update(CFG.drainMs - 1);
    expect(g.state).toBe('draining');
    g.update(1);
    expect(g.state).toBe('play');
    expect(log.payloads('powerdone')).toEqual([{ kind: 'cyc', n: 10 }]);
    expect(log.payloads('clearend')).toEqual([{ rows, kind: 'cyc' }]);
    expect(g.score).toBe(150 * 10);
    expect(g.multT).toBe(CFG.cycMultMs);
    expect(getCell(g, 2, 21)).toBe(PIECE.L); // 10 satır aşağı kaydı
    expect(rowCells(g, 20)).toEqual(new Array<number>(COLS).fill(0));
  });

  it('yalnızca bir kez kullanılabilir', () => {
    const g = createGame(1);
    stackRows(g, 7);
    expect(g.useCyc()).toBe(true);
    finishClear(g);
    stackRows(g, 7);
    expect(g.canCyc()).toBe(false);
    expect(g.useCyc()).toBe(false);
    expect(g.canSyn()).toBe(true);
  });

  it('×2 çarpanı 30 saniye sürer, sonra biter', () => {
    const g = createGame(1);
    const log = recordEvents(g, ['scored']);
    stackRows(g, 7);
    g.useCyc();
    finishClear(g);
    setupWell(g, 1);
    dropVerticalI(g);
    finishClear(g); // multT 30000 - 300
    g.update(CFG.cycMultMs - CFG.lineClearMs - 1); // aktif parça düşüp temizlemesiz kilitlenir; multT = 1
    expect(g.multT).toBe(1);
    setupWell(g, 1);
    dropVerticalI(g);
    finishClear(g); // multT 0
    expect(g.multT).toBe(0);
    setupWell(g, 1);
    dropVerticalI(g);
    expect(log.payloads('scored').map((e) => [e.combo, e.pts])).toEqual([
      [0, 200], // 100 × 2
      [0, 200], // hâlâ ×2 (araya giren temizlemesiz kilit combo'yu sıfırladı)
      [1, 150], // çarpan bitti: 100 + combo 50
    ]);
  });
});

describe('sentetik (syn) ve rebound', () => {
  it('en alttaki üç dolu satırı temizler; ilk kullanım rebound başlatmaz', () => {
    const g = createGame(1);
    stackRows(g, 7);
    const log = recordEvents(g, ['clearstart', 'powerdone']);
    expect(g.useSyn()).toBe(true);
    expect(g.state).toBe('clearing');
    expect(log.payloads('clearstart')).toEqual([{ rows: [19, 20, 21], kind: 'syn' }]);
    g.update(CFG.synClearMs - 1);
    expect(g.state).toBe('clearing');
    g.update(1);
    expect(g.state).toBe('play');
    expect(log.payloads('powerdone')).toEqual([{ kind: 'syn', n: 3, rebound: false }]);
    expect(g.score).toBe(50 * 3);
    expect(g.stackHeight()).toBe(4);
    expect(g.reboundT).toBe(0);
    expect(g.gravityMs()).toBe(1000);
  });

  it('ikinci kullanım rebound başlatır; üçüncü kullanım süreyi uzatır', () => {
    const g = createGame(1);
    const log = recordEvents(g, ['powerdone']);
    startRebound(g);
    expect(log.payloads('powerdone').map((e) => (e.kind === 'syn' ? e.rebound : null))).toEqual([false, true]);
    expect(g.synUses).toBe(2);
    expect(g.reboundT).toBe(CFG.reboundMs);
    expect(g.garbageT).toBe(CFG.reboundGarbageEvery / 2);
    stackRows(g, 7);
    g.useSyn();
    finishClear(g);
    expect(g.reboundT).toBe(CFG.reboundMs * 2);
  });

  it('rebound sırasında yerçekimi 1.5 kat hızlanır, süre bitince normale döner', () => {
    const g = createGame(1);
    startRebound(g);
    expect(g.gravityMs()).toBeCloseTo(1000 / CFG.reboundSpeed, 9);
    placePiece(g, PIECE.T, 0, 3, 1);
    g.update(666);
    expect(g.y).toBe(1);
    g.update(1);
    expect(g.y).toBe(2);
    g.update(CFG.reboundMs);
    expect(g.reboundT).toBe(0);
    expect(g.gravityMs()).toBe(1000);
  });

  it('rebound çöp satırı alttan eklenir, tek deliklidir ve tahtayı bir sıra yukarı iter', () => {
    const g = createGame(1);
    startRebound(g);
    const oldBottom = rowCells(g, 21);
    vi.spyOn(Math, 'random').mockReturnValue(0.55); // delik sütunu (0.55 × 10) | 0 = 5
    const log = recordEvents(g, ['garbage']);
    g.update(CFG.reboundGarbageEvery / 2 - 1);
    expect(log.count('garbage')).toBe(0);
    g.update(1);
    expect(log.count('garbage')).toBe(1);
    const expected = new Array<number>(COLS).fill(PIECE.GARBAGE);
    expected[5] = 0;
    expect(rowCells(g, 21)).toEqual(expected);
    expect(rowCells(g, 20)).toEqual(oldBottom);
    g.update(CFG.reboundGarbageEvery - 1);
    expect(log.count('garbage')).toBe(1);
    g.update(1);
    expect(log.count('garbage')).toBe(2);
  });

  it('en üst satır doluyken çöp eklenirse oyun "garbage" nedeniyle biter', () => {
    const g = createGame(1);
    startRebound(g);
    setCell(g, 0, 0);
    const log = recordEvents(g, ['gameover', 'garbage']);
    g.update(CFG.reboundGarbageEvery / 2);
    expect(g.state).toBe('over');
    expect(log.names()).toEqual(['gameover']);
    expect(log.payloads('gameover')).toEqual(['garbage']);
  });
});
