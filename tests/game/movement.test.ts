import { describe, expect, it } from 'vitest';
import { PIECE } from '../../src/game/pieces';
import { clearBoard, createGame, getCell, idx, placePiece, recordEvents, setCell } from '../helpers/gameHelpers';

describe('sağa/sola hareket', () => {
  it('boş alanda parça bir sütun kayar ve move olayı yayınlanır', () => {
    const g = createGame(1);
    clearBoard(g);
    placePiece(g, PIECE.T, 0, 3, 5);
    const log = recordEvents(g, ['move']);
    expect(g.move(1)).toBe(true);
    expect(g.x).toBe(4);
    expect(g.move(-1)).toBe(true);
    expect(g.move(-1)).toBe(true);
    expect(g.x).toBe(2);
    expect(log.count('move')).toBe(3);
  });

  it('duvara dayanan parça ilerleyemez; konum değişmez, olay yayınlanmaz', () => {
    const g = createGame(1);
    clearBoard(g);
    placePiece(g, PIECE.T, 0, 3, 5);
    const log = recordEvents(g, ['move']);
    for (let i = 0; i < 3; i++) expect(g.move(-1)).toBe(true);
    expect(g.x).toBe(0);
    expect(g.move(-1)).toBe(false);
    expect(g.x).toBe(0);
    placePiece(g, PIECE.T, 0, 7, 5);
    expect(g.move(1)).toBe(false);
    expect(g.x).toBe(7);
    expect(log.count('move')).toBe(3);
  });

  it('dolu hücre yatay hareketi engeller', () => {
    const g = createGame(1);
    clearBoard(g);
    placePiece(g, PIECE.T, 0, 3, 5);
    setCell(g, 6, 6); // T rot0 alt satırı (3..5, 6); sağındaki hücre dolu
    expect(g.move(1)).toBe(false);
    expect(g.x).toBe(3);
  });
});

describe('rotasyon (SRS)', () => {
  it('saat yönü ve tersi rotasyon durumunu döngüsel değiştirir', () => {
    const g = createGame(1);
    clearBoard(g);
    placePiece(g, PIECE.T, 0, 3, 5);
    const log = recordEvents(g, ['rotate']);
    expect(g.rotate(1)).toBe(true);
    expect(g.rot).toBe(1);
    expect([g.x, g.y]).toEqual([3, 5]);
    expect(g.lastRot).toBe(true);
    expect(g.lastKick).toBe(0);
    expect(g.rotate(-1)).toBe(true);
    expect(g.rot).toBe(0);
    expect(g.rotate(-1)).toBe(true);
    expect(g.rot).toBe(3);
    for (let i = 0; i < 3; i++) g.rotate(1);
    expect(g.rot).toBe(2);
    expect(log.count('rotate')).toBe(6);
  });

  it('JLSTZ duvar tekmesi: sol duvardaki T, 1→2 rotasyonunda bir sütun sağa itilir', () => {
    const g = createGame(1);
    clearBoard(g);
    placePiece(g, PIECE.T, 1, -1, 5); // rot1 hücreleri x=0..1
    expect(g.fits(PIECE.T, 2, -1, 5)).toBe(false);
    expect(g.rotate(1)).toBe(true);
    expect(g.rot).toBe(2);
    expect([g.x, g.y]).toEqual([0, 5]);
    expect(g.lastKick).toBe(1); // KICK_JLSTZ['12'][1] = [1, 0]
  });

  it('JLSTZ tekmesi y ekseninde de uygular (wiki +y yukarı, tahtada ters)', () => {
    const g = createGame(1);
    clearBoard(g);
    // rot3 → rot0 için ilk iki aday (4,19) ve (3,19) kapalı; üçüncü aday [-1,-1] parçayı bir sıra aşağı indirir.
    setCell(g, 3, 20);
    setCell(g, 6, 20);
    placePiece(g, PIECE.T, 3, 4, 19);
    expect(g.rotate(1)).toBe(true);
    expect(g.rot).toBe(0);
    expect([g.x, g.y]).toEqual([3, 20]);
    expect(g.lastKick).toBe(2);
  });

  it('I duvar tekmesi: sağ duvardaki dikey I, 1→2 rotasyonunda bir sütun sola itilir', () => {
    const g = createGame(1);
    clearBoard(g);
    placePiece(g, PIECE.I, 1, 7, 5); // rot1 hücreleri x=9
    expect(g.fits(PIECE.I, 2, 7, 5)).toBe(false);
    expect(g.rotate(1)).toBe(true);
    expect(g.rot).toBe(2);
    expect([g.x, g.y]).toEqual([6, 5]);
    expect(g.lastKick).toBe(1); // KICK_I['12'][1] = [-1, 0]
  });

  it('I tekmesi ters yönde: sol duvardaki dikey I, 3→2 rotasyonunda üçüncü adayla sağa itilir', () => {
    const g = createGame(1);
    clearBoard(g);
    placePiece(g, PIECE.I, 3, -1, 5); // rot3 hücreleri x=0
    expect(g.rotate(-1)).toBe(true); // 3→2: KICK_I['32'] = [0,0] [-2,0] [1,0] ...
    expect(g.rot).toBe(2);
    expect([g.x, g.y]).toEqual([0, 5]);
    expect(g.lastKick).toBe(2);
  });

  it('O parçası dönmez', () => {
    const g = createGame(1);
    clearBoard(g);
    placePiece(g, PIECE.O, 0, 3, 5);
    const log = recordEvents(g, ['rotate']);
    expect(g.rotate(1)).toBe(false);
    expect(g.rotate(-1)).toBe(false);
    expect(g.rot).toBe(0);
    expect([g.x, g.y]).toEqual([3, 5]);
    expect(log.count('rotate')).toBe(0);
  });

  it('tüm tekme adayları kapalıysa rotasyon başarısız olur ve parça yerinde kalır', () => {
    const g = createGame(1);
    g.board.fill(PIECE.GARBAGE);
    for (const [cx, cy] of [
      [4, 10],
      [3, 11],
      [4, 11],
      [5, 11],
    ] as const)
      g.board[idx(cx, cy)] = 0;
    g.boardVer++;
    placePiece(g, PIECE.T, 0, 3, 10);
    expect(g.rotate(1)).toBe(false);
    expect(g.rotate(-1)).toBe(false);
    expect([g.rot, g.x, g.y]).toEqual([0, 3, 10]);
  });
});

describe('soft drop, ghost ve hard drop', () => {
  it('softStep() her sıra için +1 puan verir; tabanda başarısız olur', () => {
    const g = createGame(1);
    clearBoard(g);
    placePiece(g, PIECE.T, 0, 3, 18);
    expect(g.softStep()).toBe(true);
    expect(g.softStep()).toBe(true);
    expect(g.y).toBe(20);
    expect(g.score).toBe(2);
    expect(g.softStep()).toBe(false);
    expect(g.score).toBe(2);
  });

  it('ghostY() parçanın düşeceği en alt satırı verir', () => {
    const g = createGame(1);
    clearBoard(g);
    placePiece(g, PIECE.T, 0, 3, 1);
    expect(g.ghostY()).toBe(20);
    setCell(g, 4, 15);
    expect(g.ghostY()).toBe(13);
    expect(g.y).toBe(1);
  });

  it('hardDrop() mesafe başına +2 puan verir ve parçayı hemen kilitler', () => {
    const g = createGame(1);
    clearBoard(g);
    placePiece(g, PIECE.T, 0, 3, 1);
    const log = recordEvents(g, ['harddrop', 'lock', 'spawn']);
    g.hardDrop();
    expect(g.score).toBe(38);
    expect(log.payloads('harddrop')).toEqual([19]);
    expect(log.payloads('lock')).toEqual([[204, 213, 214, 215]]);
    expect([getCell(g, 4, 20), getCell(g, 3, 21), getCell(g, 4, 21), getCell(g, 5, 21)]).toEqual([3, 3, 3, 3]);
    expect(log.names()).toEqual(['harddrop', 'lock', 'spawn']);
    expect(g.state).toBe('play');
    expect(g.y).toBe(1); // yeni parça doğdu
  });
});

describe('hold', () => {
  it('ilk hold parçayı saklar ve kuyruktan yenisini getirir; aynı düşüşte ikinci hold engellenir', () => {
    const g = createGame(4);
    const first = g.type;
    const next = g.queue[0];
    const log = recordEvents(g, ['hold']);
    expect(g.doHold()).toBe(true);
    expect(g.hold).toBe(first);
    expect(g.type).toBe(next);
    expect(g.canHold).toBe(false);
    const queue = [...g.queue];
    expect(g.doHold()).toBe(false);
    expect(g.hold).toBe(first);
    expect(g.type).toBe(next);
    expect(g.queue).toEqual(queue);
    expect(log.count('hold')).toBe(1);
  });

  it('kilitlenme hold hakkını geri verir; sonraki hold takas yapar ve parça doğma noktasından başlar', () => {
    const g = createGame(5);
    const first = g.type;
    g.doHold();
    clearBoard(g);
    g.hardDrop();
    expect(g.canHold).toBe(true);
    const current = g.type;
    const queue = [...g.queue];
    g.move(1);
    expect(g.doHold()).toBe(true);
    expect(g.type).toBe(first);
    expect(g.hold).toBe(current);
    expect([g.x, g.rot]).toEqual([3, 0]);
    expect(g.queue).toEqual(queue); // takas kuyruktan çekmez
  });
});
