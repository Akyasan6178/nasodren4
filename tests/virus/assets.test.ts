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
