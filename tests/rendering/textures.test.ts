// NS4-15: blok görünümü regresyon testleri. NS4-14 blok görselleri geri alındı; bloklar NS4-13 (a700ca8) çizimiyle
// aynı olmalıdır. Node'da canvas yok: çizim komutlarını kaydeden küçük bir 2D bağlam taklidi ile atlas ölçüleri ve
// bütün çizim komut dizisinin parmak izi sabitlenir. Parmak izi değişirse blok görünümü değişmiş demektir.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BLOCK_IDS, COLORS, createBlockAtlas } from '../../src/rendering/textures';

type Op = readonly [name: string, ...args: unknown[]];

/** Komut kaydedici 2D bağlam: yöntem çağrıları ve stil atamaları sırayla `ops` dizisine yazılır. */
function recorder() {
  const ops: Op[] = [];
  const grad = { addColorStop: (o: number, c: string) => void ops.push(['stop', o, c]) };
  const ctx: Record<string, unknown> = {};
  for (const m of [
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
  ])
    ctx[m] = (...a: unknown[]) => void ops.push([m, ...a]);
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

/** Komut dizisinin kararlı parmak izi (FNV-1a, sayılar 4 ondalığa yuvarlanır). */
function fingerprint(ops: readonly Op[]): string {
  const s = JSON.stringify(ops.map((o) => o.map((a) => (typeof a === 'number' ? Math.round(a * 1e4) / 1e4 : a))));
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0') + ':' + ops.length;
}

/** a700ca8 çiziminin parmak izleri (restore edilmiş textures.ts ile üretildi). */
const PINNED: readonly (readonly [number, string])[] = [
  [36, '9ecbb2ea:432'],
  [64, 'c22d79d0:432'],
  [104, 'b1644d32:432'],
];

describe('blok atlası NS4-13 (a700ca8) görünümünde', () => {
  it.each([
    [12, 1],
    [18, 2],
    [32, 1],
    [32, 2],
    [52, 2],
    [56, 2],
  ])('hücre %i px, DPR %i: 8 sütun × 2 satır (blok + hayalet), karo adımı px + 4', (cell, dpr) => {
    const px = Math.max(8, Math.round(cell * dpr)); // GameView.buildTextures ile aynı
    const { atlas, P } = createBlockAtlas(px);
    expect(P).toBe(px + 4);
    expect([atlas.width, atlas.height]).toEqual([P * BLOCK_IDS.length, P * 2]);
    expect(canvases).toHaveLength(1);
  });

  it('NS4-14 eklemeleri yok: kesik kenar, kırpma/tarama, üçüncü satır', () => {
    createBlockAtlas(64);
    const ops = canvases[0]?.ops ?? [];
    expect(ops.some((o) => o[0] === 'setLineDash')).toBe(false);
    expect(ops.some((o) => o[0] === 'clip')).toBe(false);
    const rows = new Set(ops.filter((o) => o[0] === 'translate').map((o) => o[2]));
    expect([...rows].sort((a, b) => Number(a) - Number(b))).toEqual([2, 68 + 2]); // satır 0 ve 1 (P = 68)
  });

  it.each(PINNED)('çizim komutlarının parmak izi sabit (px %i)', (px, expected) => {
    createBlockAtlas(px);
    expect(fingerprint(canvases[0]?.ops ?? [])).toBe(expected);
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
