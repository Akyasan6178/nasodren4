// NS4-44: Virüs Avı görselleri (tools/viruses/prepare_viruses.py çıktısı): üç tür, küçük WebP.
import { describe, expect, it } from 'vitest';

const FILES = import.meta.glob<string>('../../public/images/virus/*.webp', {
  query: '?inline',
  import: 'default',
  eager: true,
});

describe('virüs görselleri', () => {
  for (const n of [1, 2, 3]) {
    it(`virus-${n}.webp var, WebP ve 40 KB altında`, () => {
      const data = FILES[`../../public/images/virus/virus-${n}.webp`];
      expect(data).toBeDefined();
      const b64 = (data ?? '').split(',')[1] ?? '';
      const bytes = atob(b64);
      expect(bytes.length).toBeLessThan(40_000);
      expect(bytes.slice(0, 4)).toBe('RIFF');
      expect(bytes.slice(8, 12)).toBe('WEBP');
    });
  }
});

describe('kaynak görseller', () => {
  it("public/ altında değil (build'e girmez); art/virusler içinde", () => {
    const pub = import.meta.glob('../../public/images/virüsler/*');
    const src = import.meta.glob('../../art/virusler/*.png');
    expect(Object.keys(pub)).toEqual([]);
    expect(Object.keys(src)).toHaveLength(3);
  });
});

describe('animasyon şeritleri', () => {
  const SHEETS = import.meta.glob<string>('../../public/images/virus/*-sheet.webp', {
    query: '?inline',
    import: 'default',
    eager: true,
  });
  for (const n of [1, 2, 3]) {
    it(`virus-${n}-sheet.webp var ve 120 KB altında`, () => {
      const data = SHEETS[`../../public/images/virus/virus-${n}-sheet.webp`];
      expect(data).toBeDefined();
      expect(atob((data ?? '').split(',')[1] ?? '').length).toBeLessThan(120_000);
    });
  }
});

describe('virusFrame', () => {
  it('dans döngüsü 0,1,2,3 ve faz kaydırması', async () => {
    const { virusFrame, VIRUS_DANCE_MS } = await import('../../src/virus/art');
    expect(VIRUS_DANCE_MS).toBe(180);
    expect([1000, 1180, 1360, 1540].map((t) => virusFrame(t, 0, false))).toEqual([1, 2, 3, 0]);
    expect(virusFrame(1000, 1, false)).toBe(2);
  });
  it('arada bir göz kırpar (kare 4), kısa sürer', async () => {
    const { virusFrame } = await import('../../src/virus/art');
    let blinks = 0;
    for (let t = 0; t < 10_000; t += 10) if (virusFrame(t, 2, false) === 4) blinks++;
    expect(blinks).toBeGreaterThan(0);
    expect(blinks * 10).toBeLessThan(10_000 * 0.12);
  });
  it('hareketi azaltta dans yok (kare 1), göz kırpma kalır', async () => {
    const { virusFrame } = await import('../../src/virus/art');
    const frames = new Set<number>();
    for (let t = 0; t < 10_000; t += 10) frames.add(virusFrame(t, 3, true));
    expect([...frames].sort()).toEqual([1, 4]);
  });
});
