// NS4-45 / NS4-46 zorlaşan dalgalar: bölüm saati tablosu (dalga boyu, ilk adım 15 sn, sonra 30 sn, hızlanma,
// satırdan gelen hızın seviye 6'da durması, yerçekimi tavanı), saatin her bölümde sıfırlanması ve Serbest nefeste
// sürmesi, hızlanmanın seviyeyi (sunucu doğrulaması) değiştirmemesi.
import { describe, expect, it } from 'vitest';
import { CFG, ROOMS } from '../../src/config/gameConfig';
import { Game } from '../../src/game/Game';
import {
  PRESSURE,
  gravityLevel,
  resetsClock,
  roomPressure,
  speedBoost,
  stepDuration,
  stepKind,
  waveSize,
} from '../../src/game/pressure';
import { expectedLevel } from '../../supabase/functions/_shared/scoreRules.ts';
import { clearBoard, recordEvents } from '../helpers/gameHelpers';

const step = (g: Game) => {
  g.attackT = g.stepMs() - 1;
  g.update(1);
};
/** Klasik formül: (kesirli) seviyenin iniş süresi (ms). */
const gravityAt = (l: number) => Math.pow(0.8 - (l - 1) * 0.007, l - 1) * 1000;
const LAST = ROOMS.length - 1;

describe('tablo', () => {
  it('tek adımlar dalga, çift adımlar hızlanma; ilk adım 15 sn, sonrakiler 30 sn', () => {
    expect([1, 2, 3, 4, 5, 6, 7].map(stepKind)).toEqual(['wave', 'speed', 'wave', 'speed', 'wave', 'speed', 'wave']);
    expect([0, 1, 2, 5].map(stepDuration)).toEqual([15_000, 30_000, 30_000, 30_000]);
  });
  it('her bölümün satırı var; son bölüm: 3 tek kare + 1 virüsle başlar, dalga dalga büyür, sınırda durur', () => {
    expect(PRESSURE.rooms).toHaveLength(ROOMS.length);
    expect([1, 2, 3, 4, 5].map((w) => waveSize(LAST, w))).toEqual([
      { singles: 3, viruses: 1 },
      { singles: 4, viruses: 1 },
      { singles: 5, viruses: 2 },
      { singles: 6, viruses: 2 },
      { singles: 7, viruses: 3 },
    ]);
    expect(waveSize(LAST, 50)).toEqual({ singles: PRESSURE.maxSingles, viruses: PRESSURE.maxViruses });
  });
  it('şiddet bölümle artar (hiçbir bölüm bir öncekinden kolay değil); 1. bölüm hız payısız; Serbest nefes son satır', () => {
    expect(speedBoost(0, 0)).toBe(0);
    for (let r = 1; r < ROOMS.length; r++) {
      for (const w of [1, 2, 3, 4]) {
        const a = waveSize(r - 1, w),
          b = waveSize(r, w);
        expect(b.singles + b.viruses, `bölüm ${r + 1} dalga ${w}`).toBeGreaterThanOrEqual(a.singles + a.viruses);
      }
      expect(roomPressure(r).start).toBeGreaterThanOrEqual(roomPressure(r - 1).start);
      expect(roomPressure(r).speed).toBeGreaterThanOrEqual(roomPressure(r - 1).speed);
    }
    expect(roomPressure(ROOMS.length)).toBe(roomPressure(LAST));
    expect([resetsClock(0), resetsClock(LAST), resetsClock(ROOMS.length)]).toEqual([true, true, false]);
  });
  it('satırdan gelen seviye yerçekimine en çok 6 katkı verir; hız payı eklenir; tavan 14', () => {
    expect(gravityLevel(3, 0)).toBe(3);
    expect(gravityLevel(12, 0)).toBe(PRESSURE.lineSpeedCap);
    expect(gravityLevel(3, 2)).toBe(5);
    expect(gravityLevel(12, 2)).toBe(PRESSURE.lineSpeedCap + 2);
    expect(gravityLevel(12, 50)).toBe(PRESSURE.gravityCap);
    expect(PRESSURE.gravityCap).toBeLessThan(CFG.maxLevel);
  });
  it('Serbest nefeste hız yavaş artar: 10 dakika sonra bile tavanın altında; tavan ~11 ms', () => {
    // seviye 6+ oyuncu, son bölüm başı + 10 dk (30 sn adım: dakikada bir hızlanma)
    const lvl = gravityLevel(20, speedBoost(LAST, 10));
    expect(lvl).toBeLessThan(PRESSURE.gravityCap);
    expect(gravityAt(lvl)).toBeGreaterThan(20);
    expect(gravityAt(PRESSURE.gravityCap)).toBeGreaterThan(10);
  });
});

describe('oyunda bölüm saati', () => {
  it('hızlanma: speedup olayı, iniş süresi kısalır; seviye ve satır değişmez (sunucu doğrulaması)', () => {
    const g = new Game();
    g.reset({ seed: 3 });
    clearBoard(g);
    const log = recordEvents(g, ['speedup']);
    const before = g.gravityMs();
    step(g); // dalga
    step(g); // hızlanma
    expect(log.payloads('speedup')).toEqual([{ steps: 1, boost: roomPressure(0).speed }]);
    expect(g.gravityMs()).toBeLessThan(before);
    expect(g.gravityMs()).toBeCloseTo(gravityAt(1 + roomPressure(0).speed), 6);
    expect([g.level, g.lines, g.level === expectedLevel(g.lines)]).toEqual([1, 0, true]);
  });
  it('dalgalar bölüm içinde büyür (dalga sırası ceil(adım / 2))', () => {
    const g = new Game();
    g.reset({ seed: 5, rooms: true });
    g.enterRoom(LAST);
    const log = recordEvents(g, ['attack']);
    for (let i = 0; i < 5; i++) {
      for (let k = 0; k < g.board.length; k++) if (g.board[k] && (g.origin[k] ?? 0) >= 2) g.board[k] = g.origin[k] = 0;
      g.boardVer++;
      step(g);
    }
    expect(log.payloads('attack').map((e) => [e.wave, e.singles, e.viruses])).toEqual([
      [1, 3, 1],
      [2, 4, 1],
      [3, 5, 2],
    ]);
  });
  it('saat her bölümde sıfırlanır (bölüm başı hız payıyla); Serbest nefese geçişte sürer', () => {
    const g = new Game();
    g.reset({ seed: 7, rooms: true });
    for (let i = 0; i < 4; i++) step(g);
    g.attackT = 1234;
    expect([g.pressSteps, g.speedSteps, g.speedBoost]).toEqual([4, 2, speedBoost(0, 2)]);
    g.enterRoom(4);
    expect([g.pressSteps, g.speedSteps, g.speedBoost, g.attackT]).toEqual([0, 0, roomPressure(4).start, 0]);
    expect(g.stepMs()).toBe(PRESSURE.firstStepMs);
    g.enterRoom(LAST);
    for (let i = 0; i < 4; i++) step(g);
    g.attackT = 999;
    const kept = [g.pressSteps, g.speedSteps, g.speedBoost, g.attackT];
    g.enterRoom(ROOMS.length); // Serbest nefes
    expect([g.pressSteps, g.speedSteps, g.speedBoost, g.attackT]).toEqual(kept);
    g.reset({ seed: 7, rooms: true });
    expect([g.pressSteps, g.speedSteps, g.speedBoost, g.attackT]).toEqual([0, 0, 0, 0]);
  });
});
