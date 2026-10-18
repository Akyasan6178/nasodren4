// NS4-14: blok atlası ve renk dışı işaretler. Node'da canvas yok: çizim komutlarını kaydeden küçük bir 2D bağlam
// taklidiyle atlas ölçüleri, karo yerleri ve her karonun çizim imzası doğrulanır (piksel değil, komut düzeyi).
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ATLAS_ROWS,
  ATLAS_ROW_COUNT,
  BLOCK_IDS,
  COLORS,
  TYPE_MARK,
  createBlockAtlas,
  drawMark,
  type MarkKind,
} from '../../src/rendering/textures';

type Op = readonly [name: string, ...args: unknown[]];

/** Komut kaydedici 2D bağlam: yöntem çağrıları ve stil atamaları sırayla `ops` dizisine yazılır. */
function recorder() {
  const ops: Op[] = [];
  const grad = { addColorStop: (o: number, c: string) => void ops.push(['stop', o, c]) };
  const methods = [
    'save',
    'restore',
    'translate',
    'beginPath',
    'closePath',
    'moveTo',
    'lineTo',
    'arc',
    'arcTo',
    'ellipse',
    'fill',
    'stroke',
    'clip',
    'fillRect',
    'setLineDash',
  ];
  const ctx: Record<string, unknown> = {};
  for (const m of methods) ctx[m] = (...a: unknown[]) => void ops.push([m, ...a]);
  ctx['createLinearGradient'] = (...a: unknown[]) => (ops.push(['linear', ...a]), grad);
  ctx['createRadialGradient'] = (...a: unknown[]) => (ops.push(['radial', ...a]), grad);
  for (const p of ['fillStyle', 'strokeStyle', 'globalAlpha', 'lineWidth', 'lineCap', 'lineJoin'])
    Object.defineProperty(ctx, p, { set: (v: unknown) => void ops.push(['set:' + p, v]), get: () => undefined });
  return { ctx: ctx as unknown as CanvasRenderingContext2D, ops };
}

let canvases: { width: number; height: number; ops: Op[] }[];
beforeEach(() => {
  canvases = [];
  vi.stubGlobal('document', {
    createElement: () => {
      const r = recorder();
      const cv = { width: 0, height: 0, ops: r.ops, getContext: () => r.ctx };
      canvases.push(cv);
      return cv;
    },
  });
});

/** Atlası çizer ve her (sütun, satır) karosunun komutlarını ayırır (translate → restore arası). */
function tiles(px: number) {
  const { atlas, P } = createBlockAtlas(px);
  const ops = canvases[0]?.ops ?? [];
  const out = new Map<string, Op[]>();
  for (let i = 0; i < ops.length; i++) {
    const op = ops[i];
    if (op?.[0] !== 'translate') continue;
    const [, tx, ty] = op as [string, number, number];
    const col = Math.round((tx - 2) / P),
      row = Math.round((ty - 2) / P);
    const seg: Op[] = [];
    for (let depth = 0, j = i + 1; j < ops.length; j++) {
      const o = ops[j];
      if (!o) break;
      if (o[0] === 'save') depth++;
      if (o[0] === 'restore' && depth-- === 0) break;
      seg.push(o);
    }
    out.set(`${col}:${row}`, seg);
  }
  return { atlas, P, out };
}
/** Çizim imzası: komut adları + 2 ondalığa yuvarlanmış sayısal argümanlar. */
const sig = (ops: readonly Op[]) =>
  JSON.stringify(ops.map((o) => o.map((a) => (typeof a === 'number' ? Math.round(a * 100) / 100 : a))));

describe('renk dışı işaretler', () => {
  it('yedi tetromino türünün işareti benzersiz; harf yok; garbage işaret taşımaz', () => {
    const kinds = Object.values(TYPE_MARK);
    expect(kinds).toHaveLength(7);
    expect(new Set(kinds).size).toBe(7);
    expect(Object.keys(TYPE_MARK)).toEqual(['1', '2', '3', '4', '5', '6', '7']);
    for (const k of kinds) expect(['dash', 'dot', 'arc', 'ring', 'cross', 'pair', 'triangle']).toContain(k);
  });

  it('her işaret türü farklı bir çizim üretir', () => {
    const sigs = new Map<string, MarkKind>();
    for (const k of Object.values(TYPE_MARK)) {
      const r = recorder();
      drawMark(r.ctx, k, 16, 16, 5);
      const s = sig(r.ops);
      expect(sigs.has(s), k).toBe(false);
      sigs.set(s, k);
      expect(
        r.ops.some((o) => o[0] === 'fill' || o[0] === 'stroke'),
        k,
      ).toBe(true);
    }
  });

  it('işaret karonun ortasında ve küçük (hücrenin ~1/3’ü)', () => {
    for (const k of Object.values(TYPE_MARK)) {
      const r = recorder();
      drawMark(r.ctx, k, 50, 58, 17); // px = 100
      // gerçek kapsam: doğru uçları + yaylar boyunca örneklenen noktalar
      const pts: [number, number][] = [];
      for (const o of r.ops) {
        if (o[0] === 'moveTo' || o[0] === 'lineTo') pts.push([o[1] as number, o[2] as number]);
        if (o[0] === 'arc') {
          const [, ax, ay, rad, a0, a1] = o as [string, number, number, number, number, number];
          for (let i = 0; i <= 16; i++) {
            const a = a0 + ((a1 - a0) * i) / 16;
            pts.push([ax + rad * Math.cos(a), ay + rad * Math.sin(a)]);
          }
        }
      }
      expect(pts.length, k).toBeGreaterThan(0);
      for (const [x, y] of pts) {
        expect(Math.abs(x - 50), k).toBeLessThanOrEqual(17 * 1.0);
        expect(Math.abs(y - 58), k).toBeLessThanOrEqual(17 * 1.0);
      }
    }
  });
});

describe('atlas', () => {
  it.each([
    [12, 1],
    [18, 2],
    [32, 1],
    [32, 2],
    [52, 2],
    [56, 2],
  ])('hücre %i px, DPR %i: 8 sütun × 3 satır, karo adımı px + 4', (cell, dpr) => {
    const px = Math.max(8, Math.round(cell * dpr)); // GameView.buildTextures ile aynı
    const { atlas, P, out } = tiles(px);
    expect(P).toBe(px + 4);
    expect([atlas.width, atlas.height]).toEqual([P * 8, P * ATLAS_ROW_COUNT]);
    expect(out.size).toBe(8 * 3);
    for (let i = 0; i < 8; i++) for (const row of Object.values(ATLAS_ROWS)) expect(out.has(`${i}:${row}`)).toBe(true);
    expect(canvases).toHaveLength(1); // tek atlas canvas'ı
  });

  it('sabit, hayalet ve aktif karolar her türde birbirinden farklı', () => {
    const { out } = tiles(64);
    BLOCK_IDS.forEach((_id, i) => {
      const s = [ATLAS_ROWS.block, ATLAS_ROWS.ghost, ATLAS_ROWS.active].map((row) => sig(out.get(`${i}:${row}`) ?? []));
      expect(new Set(s).size).toBe(3);
    });
  });

  it('sabit bloklar türler arasında benzersiz (renk dışında da: işaret komutları)', () => {
    const { out } = tiles(64);
    const shapeOnly = (ops: readonly Op[]) => sig(ops.filter((o) => !o[0].startsWith('set:') && o[0] !== 'stop'));
    const s = BLOCK_IDS.map((_id, i) => shapeOnly(out.get(`${i}:${ATLAS_ROWS.block}`) ?? []));
    expect(new Set(s).size).toBe(8);
  });

  it('hayalet karo kesik kenarlı; aktif karoda açık iç kenar var, sabitte yok', () => {
    const { out } = tiles(64);
    BLOCK_IDS.forEach((_id, i) => {
      const ghost = out.get(`${i}:${ATLAS_ROWS.ghost}`) ?? [];
      expect(ghost.some((o) => o[0] === 'setLineDash' && Array.isArray(o[1]) && (o[1] as number[]).length === 2)).toBe(
        true,
      );
      const rim = (ops: readonly Op[]) =>
        ops.some((o) => o[0] === 'set:strokeStyle' && o[1] === 'rgba(255,255,255,.85)');
      expect(rim(out.get(`${i}:${ATLAS_ROWS.active}`) ?? [])).toBe(true);
      expect(rim(out.get(`${i}:${ATLAS_ROWS.block}`) ?? [])).toBe(false);
    });
  });

  it('garbage: parlaklık lekesi ve işaret yok, çapraz tarama var; normal türlerde tersi', () => {
    const { out } = tiles(64);
    const g = out.get(`7:${ATLAS_ROWS.block}`) ?? [];
    expect(g.some((o) => o[0] === 'ellipse')).toBe(false);
    expect(g.some((o) => o[0] === 'set:strokeStyle' && o[1] === 'rgba(255,255,255,.3)')).toBe(true);
    for (let i = 0; i < 7; i++) {
      const b = out.get(`${i}:${ATLAS_ROWS.block}`) ?? [];
      expect(
        b.some((o) => o[0] === 'ellipse'),
        String(i),
      ).toBe(true);
      expect(
        b.some((o) => o[0] === 'set:strokeStyle' && o[1] === 'rgba(255,255,255,.3)'),
        String(i),
      ).toBe(false);
    }
  });

  it('blok paleti değişmedi', () => {
    expect(COLORS).toEqual({
      1: '#3fd2de',
      2: '#ffcf5a',
      3: '#e44d97',
      4: '#55d08a',
      5: '#ff7868',
      6: '#5d8bff',
      7: '#ffa14a',
      8: '#8e93a6',
    });
  });
});

describe('işaret kontrastı (gri tonlamada da)', () => {
  const lum = (r: number, g: number, b: number) => {
    const f = (c: number) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  it.each(Object.entries(COLORS).filter(([id]) => id !== '8'))('tür %s: işaret mürekkebi ≥ 3:1', (_id, hex) => {
    const n = parseInt(hex.slice(1), 16);
    const rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
    const ink = rgb.map((c) => Math.round(c * (1 - 0.68))) as unknown as [number, number, number];
    // %90 opaklık: mürekkep blok rengi üzerine karışır
    const mixed = ink.map((c, k) => c * 0.9 + (rgb[k] ?? 0) * 0.1) as [number, number, number];
    const a = lum(...rgb),
      b = lum(...mixed);
    expect((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)).toBeGreaterThanOrEqual(3);
  });
});
