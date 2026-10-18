// NS4-13: GestureTracker kuralları. Zaman damgaları ve koordinatlar deterministiktir; gerçek zaman beklenmez.
import { describe, expect, it } from 'vitest';
import { GESTURE, GestureTracker, type GestureActions } from '../../src/input/gestures';
import type { RotationDirection, Step } from '../../src/types/game';

const C = 32; // 390×844 hücresi

function setup(opts: { wallAt?: number } = {}) {
  const log: string[] = [];
  let x = 0;
  const actions: GestureActions = {
    move: (d: Step) => {
      if (opts.wallAt !== undefined && Math.abs(x + d) > opts.wallAt) return false;
      x += d;
      log.push(d > 0 ? 'R' : 'L');
      return true;
    },
    softStep: () => {
      log.push('S');
      return true;
    },
    rotate: (dir: RotationDirection) => void log.push(dir > 0 ? 'CW' : 'CCW'),
    hardDrop: () => void log.push('HARD'),
    hold: () => void log.push('HOLD'),
    onSoftDrop: () => void log.push('s'),
  };
  const t = new GestureTracker(actions);
  /** Noktaları sırayla uygular: [dx, dy] (hücre), adımlar arası `dt` ms; ilk nokta down, son nokta up. */
  const swipe = (pts: readonly (readonly [number, number])[], dt: number, rotateDir: RotationDirection = 1, id = 1) => {
    const [first, ...rest] = pts;
    const at = (p: readonly [number, number]) => [200 + p[0] * C, 400 + p[1] * C] as const;
    let time = 1000;
    const [x0, y0] = at(first ?? [0, 0]);
    t.start(id, x0, y0, time);
    rest.forEach((p, i) => {
      time += dt;
      const [px, py] = at(p);
      if (i < rest.length - 1) t.move(id, px, py, time, C);
      else return;
    });
    const last = at(rest.at(-1) ?? first ?? [0, 0]);
    return t.end(id, last[0], last[1], time, C, rotateDir);
  };
  return { t, log, swipe };
}

describe('dokunma (döndürme)', () => {
  it.each([
    [1, 'CW'],
    [-1, 'CCW'],
  ] as const)('kısa dokunma yön %i ile döndürür', (dir, expected) => {
    const { swipe, log } = setup();
    expect(
      swipe(
        [
          [0, 0],
          [0, 0],
        ],
        80,
        dir,
      ),
    ).toBe('tap');
    expect(log).toEqual([expected]);
  });

  it('0,3 hücreye kadar titreşim hâlâ dokunmadır', () => {
    const { swipe, log } = setup();
    expect(
      swipe(
        [
          [0, 0],
          [0.2, 0.1],
          [0.25, 0],
        ],
        40,
      ),
    ).toBe('tap');
    expect(log).toEqual(['CW']);
  });

  it('0,3–0,45 hücre arası titreşim ne hareket ne döndürme üretir', () => {
    const { swipe, log } = setup();
    expect(
      swipe(
        [
          [0, 0],
          [0.4, 0],
          [0.38, 0.1],
        ],
        40,
      ),
    ).toBeNull();
    expect(log).toEqual([]);
  });

  it('uzun basılı tutma (300 ms üstü) döndürmez', () => {
    const { swipe, log } = setup();
    expect(
      swipe(
        [
          [0, 0],
          [0, 0],
          [0, 0],
        ],
        200,
      ),
    ).toBeNull();
    expect(log).toEqual([]);
  });

  it('bırakılırken ara hareket gelmese de hızlı kaydırma dokunma sayılmaz', () => {
    const { swipe, log } = setup();
    expect(
      swipe(
        [
          [0, 0],
          [2.2, 0],
        ],
        60,
      ),
    ).toBeNull();
    expect(log).toEqual(['R', 'R']);
  });
});

describe('yatay sürükleme', () => {
  it('her 0,9 hücre bir sütun; geri sürükleme tutarlı', () => {
    const { t, log } = setup();
    t.start(1, 0, 0, 0);
    t.move(1, 3.0 * C, 0, 50, C); // trunc(3,0 / 0,9) = 3
    expect(log).toEqual(['R', 'R', 'R']);
    t.move(1, 1.0 * C, 0, 100, C); // 1 → iki sütun geri
    expect(log).toEqual(['R', 'R', 'R', 'L', 'L']);
    t.move(1, -1.0 * C, 0, 150, C); // -1
    expect(log.filter((s) => s === 'L')).toHaveLength(4);
  });

  it('duvarda sayaç eşitlenir; geri dönünce hemen hareket eder', () => {
    const { t, log } = setup({ wallAt: 1 });
    t.start(1, 0, 0, 0);
    t.move(1, 4 * C, 0, 50, C);
    expect(log).toEqual(['R']);
    t.move(1, 3.5 * C, 0, 100, C); // want 3 < cols 4 → bir sola
    expect(log).toEqual(['R', 'L']);
  });

  it('yatay kilitliyken dikey hareket yavaş indirme yapmaz, bırakış fırlatma sayılmaz', () => {
    const { swipe, log } = setup();
    expect(
      swipe(
        [
          [0, 0],
          [1, 0.2],
          [1.2, 3],
          [1.2, 6],
        ],
        20,
      ),
    ).toBeNull();
    expect(log).toEqual(['R']);
  });
});

describe('dikey: yavaş indirme, hard drop, hold', () => {
  it('yavaş aşağı sürükleme her 0,9 hücrede bir satır indirir, hard drop yapmaz', () => {
    const { swipe, log } = setup();
    expect(
      swipe(
        [
          [0, 0],
          [0, 1],
          [0, 2],
          [0, 3],
          [0, 3],
        ],
        200,
      ),
    ).toBeNull();
    expect(log).toEqual(['S', 's', 'S', 's', 'S', 's']);
  });

  it('hızlı aşağı fırlatma hard drop yapar', () => {
    const { swipe, log } = setup();
    expect(
      swipe(
        [
          [0, 0],
          [0, 1],
          [0, 2],
          [0, 3],
        ],
        15,
      ),
    ).toBe('hard');
    expect(log.filter((s) => s === 'HARD')).toHaveLength(1);
  });

  it.each([
    [
      'toplam 2 hücrenin altında',
      [
        [0, 0],
        [0, 0.9],
        [0, 1.8],
      ],
      10,
    ],
    [
      'hız 0,03 hücre/ms altında (3 hücre / 150 ms = 0,02)',
      [
        [0, 0],
        [0, 1],
        [0, 2],
        [0, 3],
      ],
      50,
    ],
  ] as const)('hard drop olmaz: %s', (_name, pts, dt) => {
    const { swipe, log } = setup();
    expect(swipe(pts, dt)).toBeNull();
    expect(log).not.toContain('HARD');
  });

  it('yavaş sürüklemenin sonundaki kısa sıçrama hard drop yapmaz (eski kural yapardı)', () => {
    const { t, log } = setup();
    t.start(1, 0, 0, 0);
    [1, 2, 3, 3.1].forEach((y, i) => t.move(1, 0, y * C, (i + 1) * 200, C));
    // son 20 ms: 0,9 hücre → 0,045 hücre/ms (1,44 px/ms; eski 0,75 px/ms eşiği aşılır) ama son 100 ms'de yalnızca
    // 0,9 hücre (< 1,5)
    expect(t.end(1, 0, 4 * C, 820, C, 1)).toBeNull();
    expect(log).not.toContain('HARD');
    expect(log.filter((s) => s === 'S')).toHaveLength(4);
  });

  it('hızlı yukarı fırlatma hold yapar; tek bir hold', () => {
    const { swipe, log } = setup();
    expect(
      swipe(
        [
          [0, 0],
          [0, -1],
          [0, -2],
          [0, -3],
        ],
        15,
      ),
    ).toBe('hold');
    expect(log).toEqual(['HOLD']);
  });

  it.each([
    [
      'kısa yukarı hareket (1,5 hücre)',
      [
        [0, 0],
        [0, -0.8],
        [0, -1.5],
      ],
      15,
    ],
    [
      'yavaş yukarı sürükleme',
      [
        [0, 0],
        [0, -1],
        [0, -2],
        [0, -3],
      ],
      80,
    ],
  ] as const)('hold olmaz: %s', (_n, pts, dt) => {
    const { swipe, log } = setup();
    expect(swipe(pts, dt)).toBeNull();
    expect(log).toEqual([]);
  });

  it('eşikler sabit', () => {
    expect(GESTURE).toMatchObject({
      axisLock: 0.45,
      tapSlop: 0.3,
      tapMaxMs: 300,
      step: 0.9,
      hardVy: 0.03,
      hardRecent: 1.5,
      hardTotal: 2,
      holdVy: 0.028,
      holdRecent: 1.5,
      holdTotal: 2,
    });
  });
});

describe('jest güvenliği', () => {
  it('jest başına en fazla bir özel eylem; bitince yeni olaylar etkisiz', () => {
    const { t, log } = setup();
    t.start(1, 0, 0, 0);
    t.move(1, 0, 2 * C, 10, C);
    expect(t.end(1, 0, 4 * C, 20, C, 1)).toBe('hard');
    expect(t.end(1, 0, 6 * C, 30, C, 1)).toBeNull();
    t.move(1, 0, 8 * C, 40, C);
    expect(log.filter((s) => s === 'HARD')).toHaveLength(1);
    expect(t.active).toBe(false);
  });

  it('ikinci parmak yok sayılır ve dokunmayı iptal eder; aktif pointer dışındaki hareketler etkisiz', () => {
    const { t, log } = setup();
    t.start(1, 100, 100, 0);
    expect(t.start(2, 300, 300, 10)).toBe(false);
    t.move(2, 300 + 5 * C, 300, 20, C);
    expect(t.end(2, 300 + 5 * C, 300, 30, C, 1)).toBeNull();
    expect(t.active).toBe(true);
    expect(t.end(1, 100, 100, 40, C, 1)).toBeNull(); // dokunma iptal
    expect(log).toEqual([]);
  });

  it('ikinci parmak, ilk parmağın o ana kadarki kaydırmasını geri almaz ama fırlatmayı iptal eder', () => {
    const { t, log } = setup();
    t.start(1, 0, 0, 0);
    t.move(1, 2 * C, 0, 30, C);
    t.start(2, 0, 0, 40);
    expect(t.end(1, 2 * C, 0, 50, C, 1)).toBeNull();
    expect(log).toEqual(['R', 'R']);
    const v = setup();
    v.t.start(1, 0, 0, 0);
    v.t.move(1, 0, 1 * C, 10, C);
    v.t.start(2, 0, 0, 12);
    expect(v.t.end(1, 0, 4 * C, 20, C, 1)).toBeNull();
    expect(v.log).not.toContain('HARD');
  });

  it('cancel jesti sonuçsuz bitirir', () => {
    const { t, log } = setup();
    t.start(1, 0, 0, 0);
    t.cancel();
    expect(t.end(1, 0, 0, 10, C, 1)).toBeNull();
    expect(log).toEqual([]);
  });
});
