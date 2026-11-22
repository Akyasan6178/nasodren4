// Dalgalar ve Spray (NS4-45, kural seti sinus-dalga-v2; docs/NS4-45-ZORLASAN-DALGALAR.md): zamanlama, yukarıdan düşen
// tek kareler ve virüsler, hücre kaynağı katmanı, Spray, dalga hücreli satır puanı ve virüs bonusu, oda geçişinde
// taşıma (virüs türü korunur), çekirdek ve Sıklamen gücünün dalga hücresini görmemesi, çok oyunculu determinizm.
// Bölüm saati tablosu (dalga boyu, hızlanma, bölüm sıfırlaması) tests/game/waves.test.ts'te.
import { describe, expect, it, vi } from 'vitest';
import { CFG, COLS, HIDDEN, ROOMS, ROWS } from '../../src/config/gameConfig';
import { FLOW, findCore, grayCellsInSpan, nearGrayRow, powerRows } from '../../src/game/cyclamenFlow';
import { Game } from '../../src/game/Game';
import { PIECE } from '../../src/game/pieces';
import { ORIGIN, SINUS, dropCells, pickAttackCells } from '../../src/game/sinusAttack';
import { PRESSURE, waveSize } from '../../src/game/pressure';
import type { RotationState, TetrominoType } from '../../src/types/game';
import { expectedLevel, maxPlausibleScore } from '../../supabase/functions/_shared/scoreRules.ts';
import {
  clearBoard,
  dropVerticalI,
  fillRow,
  finishClear,
  idx,
  placePiece,
  recordEvents,
  setupWell,
  stackRows,
  dropFlatI,
} from '../helpers/gameHelpers';

function game(seed = 7, rooms = false) {
  const g = new Game();
  g.reset({ seed, rooms });
  return g;
}
const stats = (g: Game) => ({ lines: g.lines, level: g.level, combo: g.combo, b2b: g.b2b, score: g.score });
const settle = (g: Game) => {
  for (let i = 0; i < 10 && g.pending && g.pending.kind !== 'room'; i++) finishClear(g);
};
const fullRows = (g: Game) =>
  Array.from({ length: ROWS }, (_, y) => y).filter((y) =>
    Array.from({ length: COLS }, (_, x) => x).every((x) => g.board[idx(x, y)] !== 0),
  );
const trigger = (g: Game) => {
  g.attackT = g.stepMs() - 1;
  g.update(1);
};
const cellsOf = (g: Game, o: number) =>
  [...g.board.keys()].filter((k) => g.board[k] === PIECE.GARBAGE && g.origin[k] === o);
/** Dalga hücreleri (tek kare + bütün virüs türleri). */
const waveCells = (g: Game) =>
  [...g.board.keys()].filter((k) => g.board[k] === PIECE.GARBAGE && (g.origin[k] ?? 0) >= ORIGIN.attack);
const setVirus = (g: Game, x: number, y: number, kind = 0) => {
  g.board[idx(x, y)] = PIECE.GARBAGE;
  g.origin[idx(x, y)] = ORIGIN.virus + kind;
  g.boardVer++;
};
const setAttack = (g: Game, x: number, y: number) => {
  g.board[idx(x, y)] = PIECE.GARBAGE;
  g.origin[idx(x, y)] = ORIGIN.attack;
  g.boardVer++;
};
/** Kaynak katmanı tahtayla tutarlı: kaynak yalnızca gri hücrede; renkli ve boş hücrede 0; boş hücrede bitki yok. */
function consistent(g: Game) {
  for (let k = 0; k < g.board.length; k++) {
    const o = g.origin[k] ?? 0;
    if (g.board[k] === PIECE.GARBAGE) {
      if (o < ORIGIN.room || o >= ORIGIN.virus + 3) return `gri ${k} kaynaksız`;
      if (g.plant[k]) return `gri ${k} bitkili`;
    } else if (o !== ORIGIN.none) return `hücre ${k} (${g.board[k]}) kaynak ${o}`;
    if (!g.board[k] && g.plant[k]) return `boş ${k} bitkili`;
  }
  return 'ok';
}

describe('kural değerleri', () => {
  it('Spray 30 renkli hücrede, en çok 8 dalga hücresi; adımlar 45 sn sonra her 60 sn', () => {
    expect(SINUS).toEqual({ sprayThreshold: 30, sprayCells: 8 });
    expect([PRESSURE.firstStepMs, PRESSURE.stepMs]).toEqual([45_000, 60_000]);
    expect([HIDDEN, ROOMS.length]).toEqual([2, 8]);
  });
  it('parça sırası (tohumlu) atak ve Spray akışlarından etkilenmez; tohumsuz oyunda kurulum ek sayı çekmez', () => {
    const a = game(11, true),
      b = game(11, true);
    const dealt = (g: Game) => {
      const out: number[] = [g.type];
      g.on('spawn', () => out.push(g.type));
      return out;
    };
    const da = dealt(a),
      db = dealt(b);
    for (let i = 0; i < 40; i++) {
      if (a.state === 'play') a.hardDrop();
      if (b.state === 'play') b.hardDrop();
      if (i === 5) trigger(a); // yalnızca a'da atak
      a.update(400);
      b.update(400);
    }
    const n = Math.min(da.length, db.length);
    expect(n).toBeGreaterThan(5);
    expect(da.slice(0, n)).toEqual(db.slice(0, n));
    const g = new Game();
    const spy = vi.spyOn(Math, 'random');
    g.reset({ seed: 3 });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('bölüm saati: zamanlama', () => {
  it('yalnızca aktif oynanışta dolar; 1. adım dalga, 2. adım hızlanma, 3. adım yine dalga; her adımda sıfırlanır', () => {
    const g = game();
    clearBoard(g);
    const log = recordEvents(g, ['attackstart', 'attack', 'speedup']);
    g.update(PRESSURE.firstStepMs - 1);
    expect([g.attacks, g.attackT]).toEqual([0, PRESSURE.firstStepMs - 1]);
    g.update(1);
    expect([g.attacks, g.attackT, log.payloads('attack').length, log.payloads('attackstart').length]).toEqual([
      1, 0, 1, 1,
    ]);
    g.update(PRESSURE.stepMs - 1);
    expect(g.attacks).toBe(1);
    g.update(1);
    expect([g.attacks, g.speedSteps, log.payloads('speedup')]).toEqual([1, 1, [{ steps: 1, boost: 0.5 }]]);
    trigger(g);
    expect([g.attacks, g.pressSteps, log.payloads('attack')[1]?.wave]).toEqual([2, 3, 2]);
  });
  it('satır temizleme, drenaj, çökme, oda geçişi ve oyun sonunda durur (mola: update çağrılmaz)', () => {
    const g = game();
    setupWell(g, 1);
    dropVerticalI(g);
    expect(g.state).toBe('clearing');
    const t = g.attackT;
    g.update(CFG.lineClearMs - 1);
    expect(g.attackT).toBe(t);
    const d = game();
    stackRows(d, 8);
    d.useCyc(); // drenaj ('draining')
    const t1 = d.attackT;
    d.update(FLOW.rowMs - 1);
    expect([d.state, d.attackT]).toEqual(['draining', t1]);
    const r = game(5, true);
    r.beginRoomClear(); // oda geçişi
    const t2 = r.attackT;
    r.update(CFG.roomClearMs - 1);
    expect(r.attackT).toBe(t2);
    const o = game();
    o.gameOver('blockout');
    o.update(PRESSURE.stepMs * 2);
    expect(o.attacks).toBe(0);
  });
});

describe('dalga: yukarıdan düşen tek kareler ve virüsler', () => {
  it('her hücre bir sütunun yığın tepesine oturur; sayılar dalga tablosundan; satır ve puan sayılmaz', () => {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const g = game(seed);
      clearBoard(g);
      for (let x = 0; x < COLS; x++) for (let y = ROWS - 1 - (x % 4); y < ROWS; y++) g.board[idx(x, y)] = PIECE.S;
      for (let y = ROWS - 4; y < ROWS; y++)
        if (g.board.slice(y * COLS, y * COLS + COLS).every(Boolean)) fillRow(g, y, PIECE.S, [9]);
      g.type = 0;
      const before = g.board.slice(),
        s0 = stats(g);
      const log = recordEvents(g, ['attack']);
      g.sinusAttack();
      const e = log.payloads('attack')[0];
      const size = waveSize(0, 1);
      expect([e?.wave, e?.singles, e?.viruses], `tohum ${seed}`).toEqual([1, size.singles, size.viruses]);
      for (const { k, kind } of e?.cells ?? []) {
        expect(before[k]).toBe(0);
        expect(g.origin[k]).toBe(kind);
        const y = (k / COLS) | 0;
        // altında dolu hücre ya da tahtanın tabanı; üstünde boşluk (yığın tepesi)
        expect(y === ROWS - 1 || g.board[k + COLS] !== 0, `tohum ${seed} hücre ${k}`).toBe(true);
      }
      for (let k = 0; k < g.board.length; k++) if (before[k]) expect(g.board[k]).toBe(before[k]);
      expect(stats(g)).toEqual(s0);
      expect([g.attackGray, g.viruses]).toEqual([size.singles + size.viruses, size.viruses]);
      expect(consistent(g)).toBe('ok');
    }
  });
  it('tam satır oluşturmaz, hava kanalına ve kanalın üstüne düşmez', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const g = game(seed, true);
      g.enterRoom(3);
      g.type = 0;
      for (let i = 0; i < 6; i++) g.sinusAttack();
      expect(fullRows(g), `tohum ${seed}`).toEqual([]);
      for (let y = 0; y < ROWS; y++) {
        const c = g.channelAt[y] ?? -1;
        if (c >= 0) expect(g.board[idx(c, y)], `tohum ${seed} sıra ${y}`).toBe(0);
      }
      const topY = [...g.channelAt].findIndex((c) => c >= 0);
      for (let y = 0; y < topY; y++) expect(g.board[idx(g.channelAt[topY] ?? 0, y)]).toBe(0);
    }
  });
  it('düşen parçanın hücrelerine ve gizli sıralara düşmez; yer yoksa daha az düşer, oyun bitmez', () => {
    const board = new Uint8Array(COLS * ROWS),
      plant = new Uint8Array(COLS * ROWS),
      origin = new Uint8Array(COLS * ROWS);
    for (let x = 0; x < COLS; x++) for (let y = HIDDEN; y < ROWS; y++) board[idx(x, y)] = (x + y) % 3 ? PIECE.S : 0;
    for (let x = 0; x < COLS; x++) board[idx(x, HIDDEN)] = PIECE.S; // her sütunun tepesi görünür ilk sıra
    expect(dropCells(board, plant, origin, new Int8Array(ROWS).fill(-1), () => 0.5, [ORIGIN.attack], HIDDEN)).toEqual(
      [],
    );
    const g = game(9);
    clearBoard(g);
    placePiece(g, PIECE.O, 0, 3, ROWS - 2); // O tabanda: 4. ve 5. sütunun tepesi parçanın hücreleri
    for (let i = 0; i < 4; i++) g.sinusAttack();
    for (const k of [idx(4, ROWS - 2), idx(5, ROWS - 2), idx(4, ROWS - 1), idx(5, ROWS - 1)])
      expect(g.board[k]).toBe(0);
    expect(g.state).toBe('play');
  });
  it('virüs türleri tohumlu akıştan; tür kaynakta saklanır (ORIGIN.virus + 0..2)', () => {
    const kinds = new Set<number>();
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      const g = game(seed);
      clearBoard(g);
      g.type = 0;
      g.on('attack', (e) => e.cells.forEach((c) => c.kind >= ORIGIN.virus && kinds.add(c.kind)));
      g.sinusAttack();
    }
    expect([...kinds].sort()).toEqual([ORIGIN.virus, ORIGIN.virus + 1, ORIGIN.virus + 2]);
  });
});

describe('hücre kaynağı katmanı', () => {
  it('oda grileri oda kaynaklı; kanal boşluğu kaynaksız; board değeri değişmez', () => {
    const g = game(3, true);
    expect(g.origin.length).toBe(g.board.length);
    expect(cellsOf(g, ORIGIN.room)).toHaveLength(g.grayCount());
    expect(consistent(g)).toBe('ok');
  });
  it('satır silme, hücre silme, kilit, çökme, oda geçişi ve reset sonrasında tutarlı; boş hücrede kaynak kalmaz', () => {
    const g = game(9, true);
    trigger(g);
    for (let x = 0; x < COLS; x++) if (!g.board[idx(x, ROWS - 1)]) g.board[idx(x, ROWS - 1)] = PIECE.L;
    g.removeRows([ROWS - 1]);
    expect(consistent(g)).toBe('ok');
    const gray = g.board.findIndex((v) => v === PIECE.GARBAGE);
    g.removeCells([gray]);
    expect(g.origin[gray]).toBe(ORIGIN.none);
    g.origin.fill(ORIGIN.attack, 0, COLS * 6); // bozuk durum: kilit kendi hücrelerini temizler
    for (let k = 0; k < COLS * 6; k++) if (g.board[k] !== PIECE.GARBAGE) g.origin[k] = 0;
    g.hardDrop();
    expect(consistent(g)).toBe('ok');
    settle(g);
    g.enterRoom(1);
    expect(consistent(g)).toBe('ok');
    g.reset({ seed: 1 });
    expect([...g.origin].every((v) => v === 0)).toBe(true);
  });
});

describe('Spray', () => {
  it('yalnızca normal standart temizlemede kırılan renkli hücrelerle dolar; 30da dolu; fazla birikmez', () => {
    const g = game();
    setupWell(g, 3);
    dropVerticalI(g); // 3 sıra: 27 S + 3 I = 30
    expect(g.sprayCharge).toBe(30);
    finishClear(g);
    setupWell(g, 2);
    dropVerticalI(g);
    finishClear(g);
    expect(g.sprayCharge).toBe(SINUS.sprayThreshold);
  });
  it('gri hücreler, Sıklamen gücü ve Hapşırık şarj vermez', () => {
    const g = game();
    clearBoard(g);
    for (let y = ROWS - 4; y < ROWS; y++) fillRow(g, y, PIECE.GARBAGE, [9]);
    dropVerticalI(g); // 4 tam sıra, yalnızca I renkli (oda grisi: kaynaksız elle yazıldı)
    expect(g.sprayCharge).toBe(4);
    finishClear(g);
    stackRows(g, 8);
    g.useCyc();
    settle(g);
    stackRows(g, 8);
    g.useSneeze();
    settle(g);
    expect(g.sprayCharge).toBe(4);
  });
  it('dalga hücresi yokken kullanılamaz ve şarj harcanmaz; dalga gelince yeniden kullanılabilir', () => {
    const g = game(8, true);
    g.sprayCharge = SINUS.sprayThreshold;
    const log = recordEvents(g, ['spraystate']);
    g.update(16);
    expect([g.canSpray(), g.sprayNoTarget(), g.useSpray(), g.sprayCharge]).toEqual([
      false,
      true,
      false,
      SINUS.sprayThreshold,
    ]);
    trigger(g);
    g.update(16);
    expect([g.canSpray(), g.sprayNoTarget()]).toEqual([true, false]);
    expect(log.payloads('spraystate')).toEqual(['notarget', 'ready']);
  });
  it('yalnızca görünür dalga hücresi (tek kare, virüs); en çok 8; oda grisi ve renkli hücre korunur; çökme; şarj sıfır', () => {
    const g = game(12, true);
    const top = ROWS - 1 - ROOMS[0].rows; // oda sıralarının hemen üstü
    for (let x = 0; x < 6; x++) setAttack(g, x, top);
    for (let x = 0; x < 4; x++) setVirus(g, x, top - 1, x % 3);
    g.board[idx(4, 0)] = PIECE.GARBAGE; // gizli sırada atak grisi: hedef değil
    g.origin[idx(4, 0)] = ORIGIN.attack;
    g.boardVer++;
    const snap = [...g.origin],
      room = cellsOf(g, ORIGIN.room),
      s0 = stats(g);
    g.sprayCharge = SINUS.sprayThreshold;
    const log = recordEvents(g, ['spray', 'core']);
    expect(g.useSpray()).toBe(true);
    const cells = log.payloads('spray')[0]?.cells ?? [];
    expect(cells.length).toBe(SINUS.sprayCells);
    expect(new Set(cells).size).toBe(cells.length);
    expect(cells.every((k) => (snap[k] ?? 0) >= ORIGIN.attack && k >= HIDDEN * COLS)).toBe(true);
    expect(g.sprayCharge).toBe(0);
    settle(g);
    expect(cellsOf(g, ORIGIN.room)).toEqual(room);
    for (let k = 0; k < (ROWS - 1) * COLS; k++)
      if (g.board[k] && g.board[k] !== PIECE.GARBAGE) expect(g.board[k + COLS], `havada ${k}`).not.toBe(0);
    expect(stats(g)).toEqual(s0);
    expect(log.payloads('core')).toEqual([]);
    expect(consistent(g)).toBe('ok');
  });
  it('saf seçici: atak grisi 8den azsa yalnızca onlar; deterministik', () => {
    const board = new Uint8Array(COLS * ROWS),
      origin = new Uint8Array(COLS * ROWS);
    for (const k of [210, 215, 100]) {
      board[k] = PIECE.GARBAGE;
      origin[k] = ORIGIN.attack;
    }
    board[211] = PIECE.GARBAGE;
    origin[211] = ORIGIN.room;
    board[212] = PIECE.L;
    expect(pickAttackCells(board, origin, () => 0.3, 8, HIDDEN)).toEqual([100, 210, 215]);
    expect(pickAttackCells(board, origin, () => 0.3, 2, HIDDEN)).toEqual(
      pickAttackCells(board, origin, () => 0.3, 2, HIDDEN),
    );
  });
});

describe('dalga hücreli satır puanı ve virüs bonusu (NS4-45)', () => {
  /** 4 sıralık kuyu (9. sütun boş); `atk` sıralarının 0. sütunu tek kare, `vir` sıralarının 1. sütunu virüs. */
  function well(g: Game, atk: readonly number[], vir: readonly number[] = []) {
    setupWell(g, 4);
    for (const y of atk) setAttack(g, 0, y);
    for (const y of vir) setVirus(g, 1, y);
  }
  it('tek kareli satır normal satır gibi puanlanır; Spray şarjı renkli hücrelerden', () => {
    const g = game();
    setupWell(g, 1);
    setAttack(g, 0, ROWS - 1);
    const log = recordEvents(g, ['scored', 'attackline', 'virusclear']);
    dropVerticalI(g);
    expect(log.payloads('scored')).toEqual([{ n: 1, tspin: 0, b2b: false, combo: 0, pts: 100 }]);
    expect(log.payloads('attackline')).toEqual([{ rows: 1, cells: 1 }]);
    expect(log.payloads('virusclear')).toEqual([]);
    expect([g.lines, g.sprayCharge, g.attackLines]).toEqual([1, 9, 1]); // 8 S + 1 I
    finishClear(g);
    expect(g.state).toBe('play');
    expect(g.type).not.toBe(0);
  });
  it('4 satırın 1i tek kareli, 1i virüslü: Tetris + virüs başına PRESSURE.virusBonus × seviye', () => {
    const g = game();
    well(g, [ROWS - 1], [ROWS - 2]);
    g.board[idx(0, ROWS - 5)] = PIECE.S; // tahta boşalmasın (Tam Ferahlık bonusu karışmasın)
    const s0 = g.score;
    const log = recordEvents(g, ['scored', 'virusclear', 'harddrop']);
    dropVerticalI(g);
    const drop = (log.payloads('harddrop')[0] ?? 0) * 2;
    expect(log.payloads('scored')).toEqual([{ n: 4, tspin: 0, b2b: false, combo: 0, pts: 800 }]);
    expect(log.payloads('virusclear')).toEqual([{ n: 1, pts: PRESSURE.virusBonus }]);
    expect(g.score - s0 - drop).toBe(800 + PRESSURE.virusBonus);
    expect([g.lines, g.tetrises, g.virusesCleared]).toEqual([4, 1, 1]);
    finishClear(g);
    expect(fullRows(g)).toEqual([]);
    expect(consistent(g)).toBe('ok');
  });
  it('tek kareli satır silinir; tahtadaki son bloklarsa oda açılır (NS4-47: hedef bütün yerleşmiş hücreler)', () => {
    const g = game(4, true);
    clearBoard(g);
    for (const x of [0, 1, 2]) {
      g.board[idx(x, ROWS - 1)] = PIECE.GARBAGE;
      g.origin[idx(x, ROWS - 1)] = ORIGIN.room;
    }
    setAttack(g, 3, ROWS - 1);
    for (const x of [4, 5]) g.board[idx(x, ROWS - 1)] = PIECE.S;
    g.roomGray = g.roomGoalGray();
    expect(g.roomGray).toBe(4); // 3 oda grisi + 1 tek kare (renkli bloklar hedefte sayılmaz)
    const log = recordEvents(g, ['roomclear', 'scored']);
    dropFlatI(g);
    finishClear(g);
    expect(log.payloads('scored')).toHaveLength(1);
    expect(log.payloads('roomclear')).toHaveLength(1); // tahtada blok kalmadı: oda açılır
    expect(g.pending?.kind).toBe('room');
  });
  it('NS4-47: oda hedefi virüsü ve tek kareyi de sayar (kalırken oda açılmaz)', () => {
    const g = game(4, true);
    const goal = g.roomGoalGray();
    setVirus(g, 0, 5, 2);
    setAttack(g, 1, 5);
    expect(g.roomGoalGray()).toBe(goal + 2);
  });
});

describe('bölüm hedefi ve geçiş (NS4-47)', () => {
  it('oda grileri bitse de dalga hücreleri (tek kare, virüs) kalırken oda açılmaz; renkli bloklar sayılmaz', () => {
    const g = game(5, true);
    g.sinusAttack();
    g.sinusAttack();
    setVirus(g, 0, 3, 2);
    g.removeCells(cellsOf(g, ORIGIN.room));
    g.board[idx(0, ROWS - 1)] = PIECE.L; // renkli blok: hedefte sayılmaz
    g.boardVer++;
    const wave = waveCells(g).length;
    expect(wave).toBeGreaterThan(0);
    expect(g.roomCleared()).toBe(false);
    expect(g.roomGray).toBe(wave);
    expect(consistent(g)).toBe('ok');
    // dalga hücreleri de silinince (ör. Spray) oda açılır; geçişte kalan renkli bloklar temizlenir (taşıma yok)
    g.removeCells(waveCells(g));
    g.boardVer++;
    expect(g.roomCleared()).toBe(true);
    g.beginRoomClear();
    finishClear(g);
    expect([g.room, waveCells(g).length]).toEqual([1, 0]);
    expect(g.board.every((v) => v === 0 || v === PIECE.GARBAGE)).toBe(true);
    expect(consistent(g)).toBe('ok');
  });
});

describe('çekirdek ve Sıklamen gücü atak grisini görmez', () => {
  function drop(g: Game, t: TetrominoType, rot: RotationState, x: number, core = false) {
    placePiece(g, t, rot, x, 0);
    g.core = core;
    g.hardDrop();
  }
  /** 21. sıra renkli (0 boş), 20. sıra gri (0 ve 3 boş; kaynak `o20`); çekirdekli T x=5: çiçek (6, 18). */
  function setupCore(g: Game, o20: (x: number) => number) {
    clearBoard(g);
    fillRow(g, 21, PIECE.S, [0]);
    fillRow(g, 20, PIECE.GARBAGE, [0, 3]);
    for (let x = 0; x < COLS; x++) if (g.board[idx(x, 20)] === PIECE.GARBAGE) g.origin[idx(x, 20)] = o20(x);
    drop(g, PIECE.T, 0, 5, true);
  }
  it('yakında yalnız oda grisi: aktifleşir; yalnız atak grisi: söner (kaynak bozulmaz)', () => {
    const a = game();
    setupCore(a, () => ORIGIN.room);
    expect([a.coreLife, a.coreTargetRow, a.coreTargetCol]).toEqual([FLOW.coreLife, 20, 6]);
    const b = game();
    setupCore(b, () => ORIGIN.attack);
    expect([b.coreLife, b.coresFizzled, findCore(b.board, b.plant)]).toEqual([0, 1, -1]);
    expect(cellsOf(b, ORIGIN.attack)).toHaveLength(8);
    expect(consistent(b)).toBe('ok');
  });
  it('hedef seçimi: atak grisi hiç yokmuş gibi (sıra aynı)', () => {
    const b = new Uint8Array(COLS * ROWS),
      o = new Uint8Array(COLS * ROWS);
    const put = (x: number, y: number, src: number) => {
      b[idx(x, y)] = PIECE.GARBAGE;
      o[idx(x, y)] = src;
    };
    put(5, 11, ORIGIN.attack); // en yakın ama atak
    put(4, 12, ORIGIN.room);
    put(6, 8, ORIGIN.room);
    expect(nearGrayRow(b, idx(5, 10), o)).toBe(12);
    expect(nearGrayRow(b, idx(5, 10))).toBe(11); // kaynak katmanı verilmezse (saf, eski kural) atak sayılır
  });
  it('normal drenaj yalnızca oda grileri (±2, en çok 5); aralıktaki atak grisi korunur; puan/satır değişmez', () => {
    const g = game();
    setupCore(g, (x) => (x === 5 || x === 6 ? ORIGIN.attack : ORIGIN.room));
    drop(g, PIECE.I, 1, -2); // 0. sütun: 21. sıra temizlenir, hedef 21'e kayar
    finishClear(g);
    expect(g.pending?.cells).toEqual([idx(4, 21), idx(7, 21), idx(8, 21)]);
    const s = stats(g);
    while (g.pending) finishClear(g);
    expect(stats(g)).toEqual(s);
    expect([g.origin[idx(5, 21)], g.origin[idx(6, 21)]]).toEqual([ORIGIN.attack, ORIGIN.attack]);
    expect(FLOW.flushBonus).toBe(0);
    expect(consistent(g)).toBe('ok');
  });
  it('Sıklamen gücü yalnızca oda grisi içeren sıraları seçer ve yalnızca oda grilerini siler', () => {
    const g = game();
    stackRows(g, 8);
    for (let y = 14; y < ROWS; y++) for (let x = 0; x < 9; x++) g.origin[idx(x, y)] = ORIGIN.room;
    for (let x = 0; x < 9; x++) g.origin[idx(x, 21)] = ORIGIN.attack;
    for (const x of [5, 6, 7, 8]) g.origin[idx(x, 20)] = ORIGIN.attack;
    const atk = cellsOf(g, ORIGIN.attack);
    expect(powerRows(g.board, -1, 3, g.origin)).toEqual([18, 19, 20]);
    expect(grayCellsInSpan(g.board, 20, 0, COLS, g.origin)).toHaveLength(5);
    g.useCyc();
    expect(g.pending?.cells?.every((k) => g.origin[k] === ORIGIN.room)).toBe(true);
    while (g.pending) finishClear(g);
    expect(cellsOf(g, ORIGIN.attack)).toEqual(atk);
    expect([g.sprayCharge, consistent(g)]).toEqual([0, 'ok']);
  });
});

describe('çok oyunculu determinizm', () => {
  function client(seed: number) {
    const g = new Game();
    g.reset({ seed, rooms: true });
    const log: string[] = [];
    g.on('attack', (e) => log.push(`A@${Math.round(g.elapsed)}:${e.cells.map((c) => `${c.k}/${c.kind}`).join('.')}`));
    g.on('speedup', (e) => log.push(`V@${Math.round(g.elapsed)}:${e.boost}`));
    g.on('spray', (e) => log.push(`S:${e.cells.join('.')}`));
    g.on('core', (e) => log.push(`C:${e.kind}`));
    g.on('attackline', (e) => log.push(`L:${e.rows}:${e.cells}`));
    g.on('roomstart', (e) => log.push(`R${e.room}:${[...g.origin].join('')}`));
    g.on('gameover', (r) => log.push(`O:${r}@${Math.round(g.elapsed)}`));
    for (let step = 0; step < 4000 && g.state !== 'over'; step++) {
      if (g.state === 'play' && step % 4 === 0) g.hardDrop();
      if (step % 15 === 14) {
        for (let k = 0; k < g.board.length; k++) if (g.board[k] && g.board[k] !== PIECE.GARBAGE) g.board[k] = 0;
        g.plant.fill(0);
        g.boardVer++;
      }
      if (step % 250 === 249 && g.state === 'play') g.removeCells(cellsOf(g, ORIGIN.room));
      if (step % 120 === 0 && g.state === 'play') g.sprayCharge = SINUS.sprayThreshold;
      if (step % 7 === 0 && g.canSpray()) g.useSpray();
      if (g.canCyc()) g.useCyc();
      g.update(100);
    }
    log.push(`${g.score}|${g.lines}|${g.level}|${g.attackLines}|${g.virusesCleared}|${g.state}|${consistent(g)}`);
    return log;
  }
  it('iki ve üç oyuncu: aynı atak, Spray, kaynak katmanı, taşıma, çekirdek, skor ve sonuç', () => {
    const [a, b, c] = [client(41), client(41), client(41)];
    expect(a.some((l) => l.startsWith('A@'))).toBe(true);
    expect(a.some((l) => l.startsWith('S:'))).toBe(true);
    expect(a.filter((l) => l.startsWith('R')).length).toBeGreaterThan(1);
    expect(a.at(-1)).toMatch(/\|ok$/);
    expect(b).toEqual(a);
    expect(c).toEqual(a);
    expect(client(42)).not.toEqual(a);
  });
  it('skor üst sınırı (maxPlausibleScore) yeni kuralla geçerli: virüs bonusu sınırın içinde', () => {
    for (const seed of [41, 43, 47]) {
      const g = new Game();
      g.reset({ seed, rooms: true });
      for (let step = 0; step < 6000 && g.state !== 'over'; step++) {
        if (g.state === 'play' && step % 5 === 0) g.hardDrop();
        if (g.canSpray()) g.useSpray();
        if (g.canCyc()) g.useCyc();
        if (g.canSneeze()) g.useSneeze();
        g.update(100);
      }
      const dur = Math.max(1, Math.round(g.elapsed / 1000));
      expect(Number.isFinite(g.score)).toBe(true);
      expect(g.level).toBe(expectedLevel(g.lines));
      expect(g.score).toBeLessThanOrEqual(maxPlausibleScore(g.lines, g.level, dur));
    }
  });
  it('tohumlu oyunda atak ve Spray Math.random çağırmaz', () => {
    const g = new Game();
    const spy = vi.spyOn(Math, 'random');
    g.reset({ seed: 42, rooms: true });
    for (let i = 0; i < 400 && g.state !== 'over'; i++) {
      if (g.state === 'play' && i % 3 === 0) g.hardDrop();
      if (i % 12 === 11) clearBoard(g);
      if (i % 50 === 0) g.sprayCharge = SINUS.sprayThreshold;
      if (g.canSpray()) g.useSpray();
      g.update(200);
    }
    expect(g.attacks).toBeGreaterThan(0);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
