// NS4-44: Virüs Avı görselleri (tools/viruses/prepare_viruses.py çıktısı): üç tür, küçük WebP.
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const DIR = resolve(__dirname, '../../public/images/virus');

describe('virüs görselleri', () => {
  for (const n of [1, 2, 3]) {
    it(`virus-${n}.webp var, WebP ve 40 KB altında`, () => {
      const file = resolve(DIR, `virus-${n}.webp`);
      expect(statSync(file).size).toBeLessThan(40_000);
      const head = readFileSync(file).subarray(0, 12);
      expect(head.subarray(0, 4).toString('ascii')).toBe('RIFF');
      expect(head.subarray(8, 12).toString('ascii')).toBe('WEBP');
    });
  }
});
