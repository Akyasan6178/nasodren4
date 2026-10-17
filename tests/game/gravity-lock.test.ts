import { describe, expect, it } from 'vitest';
import { CFG } from '../../src/config/gameConfig';
import { PIECE } from '../../src/game/pieces';
import { clearBoard, createGame, placePiece, recordEvents, setCell } from '../helpers/gameHelpers';

describe('kilit gecikmesi', () => {
  it('yere değen parça lockDelay (500 ms) dolunca kilitlenir', () => {
    const g = createGame(1);
    clearBoard(g);
    placePiece(g, PIECE.T, 0, 3, 20);
    const log = recordEvents(g, ['lock']);
    g.update(CFG.lockDelay - 1);
    expect(log.count('lock')).toBe(0);
    expect(g.type).toBe(PIECE.T);
    g.update(1);
    expect(log.count('lock')).toBe(1);
  });

  it('havadaki parçada kilit sayacı birikmez', () => {
    const g = createGame(1);
    clearBoard(g);
    placePiece(g, PIECE.T, 0, 3, 5);
    g.update(400);
    expect(g.lockT).toBe(0);
  });

  it('yerdeyken yapılan hareket kilit sayacını sıfırlar', () => {
    const g = createGame(1);
    clearBoard(g);
    placePiece(g, PIECE.T, 0, 3, 20);
    const log = recordEvents(g, ['lock']);
    g.update(400);
    g.move(1);
    g.update(400);
    expect(log.count('lock')).toBe(0);
    g.update(100);
    expect(log.count('lock')).toBe(1);
  });

  it('15 sıfırlamadan sonra hareket sayacı sıfırlamaz ve parça lockDelay × 0.2 sonra kilitlenir', () => {
    const g = createGame(1);
    clearBoard(g);
    placePiece(g, PIECE.T, 0, 3, 20);
    const log = recordEvents(g, ['lock']);
    for (let i = 0; i < CFG.maxLockResets; i++) {
      g.update(400);
      expect(g.move(i % 2 === 0 ? 1 : -1)).toBe(true);
    }
    expect(g.lockResets).toBe(CFG.maxLockResets);
    expect(log.count('lock')).toBe(0);
    g.update(60);
    expect(g.move(1)).toBe(true); // 16. hareket: sayaç sıfırlanmaz
    expect(g.lockT).toBe(60);
    g.update(39);
    expect(log.count('lock')).toBe(0);
    g.update(1); // 100 ms = lockDelay × 0.2
    expect(log.count('lock')).toBe(1);
  });

  it('parça yeni en alt satıra inince sıfırlama hakkı yenilenir', () => {
    const g = createGame(1);
    clearBoard(g);
    setCell(g, 4, 12); // T rot0 (3,10) bu hücrenin üstünde durur
    placePiece(g, PIECE.T, 0, 3, 10);
    g.lockResets = CFG.maxLockResets;
    expect(g.move(-1)).toBe(true);
    expect(g.move(-1)).toBe(true); // x=1: çıkıntının yanından düşebilir
    expect(g.grounded()).toBe(false);
    expect(g.softStep()).toBe(true);
    expect(g.lowestY).toBe(11);
    expect(g.lockResets).toBe(0);
  });
});

describe('oyun sonu', () => {
  it('blockout: doğma noktası doluysa oyun biter', () => {
    const g = createGame(1);
    clearBoard(g);
    setCell(g, 4, 1);
    const log = recordEvents(g, ['gameover', 'spawn']);
    g.spawn(PIECE.T);
    expect(g.state).toBe('over');
    expect(log.names()).toEqual(['gameover']);
    expect(log.payloads('gameover')).toEqual(['blockout']);
  });

  it('lockout: parça tamamen gizli satırlarda kilitlenirse oyun biter', () => {
    const g = createGame(1);
    clearBoard(g);
    for (const x of [3, 4, 5]) setCell(g, x, 2);
    placePiece(g, PIECE.T, 0, 3, 0);
    const log = recordEvents(g, ['harddrop', 'lock', 'gameover', 'spawn']);
    g.hardDrop();
    expect(g.state).toBe('over');
    expect(log.names()).toEqual(['harddrop', 'lock', 'gameover']);
    expect(log.payloads('gameover')).toEqual(['lockout']);
  });

  it('bir hücresi görünür alana taşan parça lockout sayılmaz', () => {
    const g = createGame(1);
    clearBoard(g);
    for (const x of [0, 1, 2]) setCell(g, x, 3);
    placePiece(g, PIECE.T, 0, 0, 1); // hücreler satır 1 ve 2
    const log = recordEvents(g, ['gameover']);
    g.hardDrop();
    expect(log.count('gameover')).toBe(0);
    expect(g.state).toBe('play');
  });

  it('oyun bittikten sonra update() ve girdiler etkisizdir; gameover bir kez yayınlanır', () => {
    const g = createGame(1);
    clearBoard(g);
    setCell(g, 4, 1);
    const log = recordEvents(g, ['gameover']);
    g.spawn(PIECE.T);
    const elapsed = g.elapsed;
    g.update(1000);
    expect(g.elapsed).toBe(elapsed);
    expect(g.move(1)).toBe(false);
    expect(g.rotate(1)).toBe(false);
    expect(g.doHold()).toBe(false);
    g.gameOver('lockout');
    expect(log.payloads('gameover')).toEqual(['blockout']);
  });
});
