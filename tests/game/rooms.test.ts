// NS4-27: Sinüs Odaları: oda başlangıcı (delikli gri bulutçuklar), geçme şartı (NS4-47: oda grileri ve sinüzit
// atağı hücreleri temizlenir; renkli bloklar sayılmaz, geçişte temizlenir), "Sinüs açıldı" geçişi, bonus, sonraki oda ve Serbest nefes.
import { describe, expect, it } from 'vitest';
import { CFG, COLS, ROOMS, ROWS, VIS } from '../../src/config/gameConfig';
import { PIECE } from '../../src/game/pieces';
import { ORIGIN } from '../../src/game/sinusAttack';
import {
  clearBoard,
  createGame,
  dropFlatI,
  dropVerticalI,
  fillRow,
  finishClear,
  lastRoomRow,
  placePiece,
  recordEvents,
  rowCells,
  idx,
} from '../helpers/gameHelpers';

const grayRows = (g: ReturnType<typeof createGame>) => {
  const out: number[] = [];
  for (let y = 0; y < ROWS; y++) if (rowCells(g, y).some((v) => v === PIECE.GARBAGE)) out.push(y);
  return out;
};

describe('oda başlangıcı', () => {
  it('reset() oda akışını açmaz: tahta boş (testler ve eski davranış)', () => {
    const g = createGame(1);
    expect([g.rooms, g.room, g.roomGray]).toEqual([false, 0, 0]);
    expect(g.board.every((v) => v === 0)).toBe(true);
  });

  it('reset({ rooms }) 1. bölümü kurar: alttan ROOMS[0].rows sıra delikli gri bulutçuk, dolu sıra yok', () => {
    const g = createGame(1);
    const log = recordEvents(g, ['roomstart']);
    g.reset({ rooms: true });
    expect([g.rooms, g.room]).toEqual([true, 0]);
    expect(grayRows(g)).toEqual(Array.from({ length: ROOMS[0].rows }, (_, k) => ROWS - ROOMS[0].rows + k));
    // NS4-30: tek hava kanalı: her sırada tek boşluk, hepsi aynı sütunda (tek dikey I odayı açar)
    const holes = grayRows(g).map((y) => rowCells(g, y).flatMap((v, x) => (v === 0 ? [x] : [])));
    expect(holes.every((h) => h.length === 1)).toBe(true);
    expect(new Set(holes.flat()).size).toBe(1);
    expect([g.roomGray, g.roomGray0]).toEqual([g.grayCount(), g.grayCount()]);
    expect(g.roomOpenness()).toBe(0);
    expect(g.congestion()).toBe(ROOMS[0].rows / VIS);
    expect(log.payloads('roomstart')).toEqual([{ room: 0, gray: g.roomGray }]);
    expect(g.state).toBe('play');
    expect(g.type).not.toBe(0);
  });

  it('NS4-30: her oda hava kanallarıyla kurulur: kanal parçaları ayrı sütunda, ek boşluk sınırlı; tıkanıklık azalmaz', () => {
    const g = createGame(3);
    let prev = 0;
    ROOMS.forEach((def, i) => {
      const seg = Math.ceil(def.rows / def.channels);
      for (let k = 0; k < 30; k++) {
        g.enterRoom(i);
        const rows = grayRows(g).reverse(); // alttan yukarı
        expect(rows).toHaveLength(def.rows);
        const holes = rows.map((y) => rowCells(g, y).flatMap((v, x) => (v === 0 ? [x] : [])));
        for (const h of holes) {
          expect(h.length).toBeGreaterThanOrEqual(1);
          expect(h.length).toBeLessThanOrEqual(1 + def.extraHoles); // hiçbir sıra dolu değil
        }
        // her kanal parçasında bütün sıraların ortak bir boşluk sütunu var; ardışık parçaların kanalı farklı
        const channels: number[] = [];
        for (let p = 0; p < def.channels; p++) {
          const part = holes.slice(p * seg, (p + 1) * seg);
          const common = (part[0] ?? []).filter((x) => part.every((h) => h.includes(x)));
          expect(common.length, `oda ${i} parça ${p}`).toBeGreaterThanOrEqual(1);
          channels.push(...common.slice(0, 1));
        }
        if (def.extraHoles === 0)
          for (let p = 1; p < channels.length; p++) expect(channels[p]).not.toBe(channels[p - 1]);
      }
      expect(g.congestion()).toBeGreaterThanOrEqual(prev);
      prev = g.congestion();
    });
    // NS4-46: 8 bölüm (burun, yanak, gözler arası, alın; önce sol sonra sağ); sıralar sanal oyuncu testiyle
    expect(ROOMS.map((r) => [r.id, r.rows, r.channels, r.extraHoles])).toEqual([
      ['burun-sol', 2, 1, 0],
      ['burun-sag', 3, 1, 0],
      ['yanak-sol', 3, 1, 0],
      ['yanak-sag', 4, 2, 0],
      ['etmoid-sol', 5, 2, 0],
      ['etmoid-sag', 6, 2, 0],
      ['alin-sol', 6, 2, 1],
      ['alin-sag', 8, 2, 1],
    ]);
  });

  it('NS4-30: 1. bölüm tek dikey I ile açılır (NS4-47: I parçasının üstte kalan renkli hücreleri hedefte sayılmaz)', () => {
    const g = createGame(5);
    g.reset({ rooms: true });
    const col = rowCells(g, ROWS - 1).indexOf(0);
    const log = recordEvents(g, ['roomclear']);
    placePiece(g, PIECE.I, 1, col - 2, 0);
    g.hardDrop();
    finishClear(g);
    expect(log.names()).toEqual(['roomclear']);
  });

  it('NS4-30: açıklık oranı temizledikçe artar; Serbest nefeste 1', () => {
    const g = createGame(1);
    g.reset({ rooms: true });
    clearBoard(g);
    fillRow(g, ROWS - 1, PIECE.GARBAGE, [9]);
    fillRow(g, ROWS - 2, PIECE.GARBAGE, [0, 9]);
    g.roomGray = g.roomGray0 = g.grayCount(); // 17
    dropVerticalI(g);
    finishClear(g);
    expect(g.roomGray).toBe(8); // yalnızca hedef hücreleri (gri); I'nın renkli hücreleri sayılmaz
    expect(g.roomOpenness()).toBeCloseTo(9 / 17, 9);
    g.enterRoom(ROOMS.length);
    expect(g.roomOpenness()).toBe(1);
  });
});

describe('geçme şartı (NS4-47): oda grileri ve sinüzit atağı hücrelerinin (tek kare, virüs) hepsi temizlenir', () => {
  it('kısmi temizleme odayı açmaz', () => {
    const g = createGame(1);
    g.reset({ rooms: true });
    clearBoard(g);
    fillRow(g, ROWS - 1, PIECE.GARBAGE, [9]);
    fillRow(g, ROWS - 2, PIECE.GARBAGE, [0, 9]); // ikinci satır tamamlanmaz
    const log = recordEvents(g, ['roomclear']);
    dropVerticalI(g);
    finishClear(g);
    expect(log.count('roomclear')).toBe(0);
    expect([g.state, g.room, g.roomGray]).toEqual(['play', 0, COLS - 2]);
  });

  it('oda grileri bitti, renkli bloklar kaldı: bölüm bir kez açılır; renkli bloklar geçişte puansız temizlenir', () => {
    const g = createGame(1);
    g.reset({ rooms: true });
    clearBoard(g);
    fillRow(g, ROWS - 1, PIECE.GARBAGE, [6, 7, 8, 9]);
    fillRow(g, ROWS - 2, PIECE.S, [6, 7, 8, 9]); // renkli blok (hedefte sayılmaz)
    const log = recordEvents(g, ['roomclear', 'scored', 'allclear', 'levelup']);
    dropFlatI(g); // 21. sıra (griler) silinir
    const s0 = { score: g.score, lines: g.lines, combo: g.combo, b2b: g.b2b, charge: g.sprayCharge };
    expect(log.payloads('allclear')).toEqual([]); // tahta boşalmadı: Tam Ferahlık değil
    finishClear(g);
    expect(log.count('roomclear')).toBe(1);
    expect(g.pending?.kind).toBe('room');
    const bonus = log.payloads('roomclear')[0]?.bonus ?? 0;
    expect(g.board.some((v) => v === PIECE.S)).toBe(true); // geçiş boyunca görünür, söner
    finishClear(g);
    // yeni bölüm boş tahtayla (yalnızca kendi gri sıraları) başlar; otomatik temizlik puan/satır/kombo/şarj vermez
    expect(g.room).toBe(1);
    expect(g.board.every((v) => v === 0 || v === PIECE.GARBAGE)).toBe(true);
    expect(grayRows(g)).toHaveLength(ROOMS[1].rows);
    expect({ score: g.score - bonus, lines: g.lines, combo: g.combo, b2b: g.b2b, charge: g.sprayCharge }).toEqual(s0);
    expect(log.count('roomclear')).toBe(1);
  });

  it('oda grileri bitti ama virüs ya da tek kare kaldı: bölüm açılmaz; onlar da silinince açılır', () => {
    for (const origin of [ORIGIN.virus, ORIGIN.attack]) {
      const g = createGame(1);
      g.reset({ rooms: true });
      clearBoard(g);
      fillRow(g, ROWS - 1, PIECE.GARBAGE, [6, 7, 8, 9]);
      g.board[idx(2, 14)] = PIECE.GARBAGE; // dalga hücresi (tahtada gri)
      g.origin[idx(2, 14)] = origin;
      const log = recordEvents(g, ['roomclear']);
      dropFlatI(g);
      finishClear(g);
      expect(log.count('roomclear'), `kaynak ${origin}`).toBe(0);
      expect(g.roomGray).toBe(1);
      g.removeCells([g.board.indexOf(PIECE.GARBAGE)]); // satır silinince bir sıra aşağı kaymıştır
      expect(g.roomCleared()).toBe(true);
    }
  });

  it('düşen parça tahtada değildir; yalnızca renkli blok varsa da açık sayılır', () => {
    const g = createGame(1);
    g.reset({ rooms: true });
    clearBoard(g);
    expect(g.type).not.toBe(0);
    expect(g.roomCleared()).toBe(true);
    fillRow(g, ROWS - 1, PIECE.L, [0]);
    expect(g.roomCleared()).toBe(true);
    g.board[idx(0, ROWS - 1)] = PIECE.GARBAGE;
    expect(g.roomCleared()).toBe(false);
  });

  it('temizleme sürerken erken geçiş yok: oda kontrolü bekleyen işlem bittikten sonra', () => {
    const g = createGame(1);
    g.reset({ rooms: true });
    lastRoomRow(g);
    const log = recordEvents(g, ['roomclear']);
    dropFlatI(g);
    expect([g.state, g.pending?.kind, log.count('roomclear')]).toEqual(['clearing', 'lines', 0]);
    g.update(CFG.lineClearMs - 1);
    expect(log.count('roomclear')).toBe(0);
    g.update(1);
    expect(log.count('roomclear')).toBe(1);
  });

  it('son gri satır temizlenince: bonus, "Sinüs açıldı" geçişi, sonra 2. oda ve yeni parça', () => {
    const g = createGame(1);
    g.reset({ rooms: true });
    clearBoard(g);
    fillRow(g, ROWS - 1, PIECE.GARBAGE, [9]);
    const log = recordEvents(g, ['scored', 'roomclear', 'clearstart', 'clearend', 'roomstart', 'spawn']);
    dropVerticalI(g);
    const linePts = log.payloads('scored')[0]?.pts ?? 0;
    finishClear(g);
    expect(log.payloads('roomclear')).toEqual([{ room: 0, bonus: CFG.roomBonus * 1 * 1 }]);
    expect(g.score).toBe(18 * 2 + linePts + CFG.roomBonus);
    expect([g.state, g.type, g.pending]).toEqual(['clearing', 0, { kind: 'room', rows: [] }]);
    expect(g.roomsCleared).toBe(1);
    g.update(CFG.roomClearMs - 1);
    expect(g.room).toBe(0);
    log.clear();
    g.update(1);
    expect(log.names()).toEqual(['roomstart', 'clearend', 'spawn']);
    expect([g.state, g.room]).toEqual(['play', 1]);
    expect(grayRows(g)).toHaveLength(ROOMS[1].rows);
    expect(g.board.every((v) => v === 0 || v === PIECE.GARBAGE)).toBe(true); // I'nın kalan hücreleri temizlendi
    expect(g.type).not.toBe(0);
  });

  it('bonus oda sırası ve seviyeyle büyür', () => {
    const g = createGame(1);
    g.reset({ rooms: true });
    g.enterRoom(2);
    g.level = 3;
    lastRoomRow(g);
    const log = recordEvents(g, ['roomclear']);
    dropFlatI(g);
    finishClear(g);
    expect(log.payloads('roomclear')).toEqual([{ room: 2, bonus: CFG.roomBonus * 3 * 3 }]);
  });

  it('hapşırık son bulutçukları savurursa oda açılır; aktif parça kaybolmaz (sıradaki olur)', () => {
    const g = createGame(1);
    g.reset({ rooms: true });
    g.enterRoom(2); // 8 sıra: %40, güçler açık
    // gri yalnızca yığının en üstteki 3 sırasında (15..17), altında renkli sıralar: tıkanıklık %35
    clearBoard(g);
    for (let y = ROWS - 7; y < ROWS - 4; y++) fillRow(g, y, PIECE.GARBAGE, [9]);
    for (let y = ROWS - 4; y < ROWS; y++) fillRow(g, y, PIECE.S, [9]);
    const active = g.type;
    expect(g.useSneeze()).toBe(true);
    finishClear(g);
    expect(g.pending?.kind).toBe('room');
    expect(g.queue[0]).toBe(active);
    finishClear(g);
    expect([g.room, g.type]).toEqual([3, active]);
  });

  it('sıklamen gücü aktif çekirdekle odanın son bulutçuklarını akıtıp odayı açabilir', () => {
    const g = createGame(1);
    g.reset({ rooms: true });
    g.enterRoom(2);
    clearBoard(g);
    fillRow(g, 21, PIECE.GARBAGE, [9]); // son 9 bulutçuk
    for (let y = 14; y < 21; y++) g.board[y * COLS + 9] = PIECE.S; // tıkanıklık %40 (9. sütunda kule)
    g.boardVer++;
    placePiece(g, PIECE.T, 0, 3, 0);
    g.core = true;
    g.hardDrop(); // çiçek (4, 19), gri (4, 21): aktif, hedef 21
    const log = recordEvents(g, ['roomclear']);
    expect(g.useCyc()).toBe(true);
    while (g.pending && g.pending.kind !== 'room') finishClear(g);
    expect(log.payloads('roomclear')).toEqual([{ room: 2, bonus: CFG.roomBonus * 3 }]);
  });
});

describe('Serbest nefes', () => {
  it('son oda açılınca tahta boş, oda olayı bir daha gelmez; oyun sonsuz sürer', () => {
    const g = createGame(1);
    g.reset({ rooms: true });
    g.enterRoom(ROOMS.length - 1);
    lastRoomRow(g);
    const log = recordEvents(g, ['roomstart', 'roomclear']);
    dropFlatI(g);
    finishClear(g);
    finishClear(g);
    expect(g.room).toBe(ROOMS.length);
    expect(log.payloads('roomstart')).toEqual([{ room: ROOMS.length, gray: 0 }]);
    expect(g.board.every((v) => v === 0)).toBe(true);
    expect(g.roomsCleared).toBe(1);
    // gri olmadan satır temizleme: oda olayı yok
    log.clear();
    fillRow(g, ROWS - 1, PIECE.S, [9]);
    dropVerticalI(g);
    finishClear(g);
    expect(log.count('roomclear')).toBe(0);
    expect(g.state).toBe('play');
  });
});
