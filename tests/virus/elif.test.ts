// NS4-44: Doktor Elif anlatıcı çizimi: dört poz, renkler yalnızca CSS sınıfları (token) üzerinden.
import { describe, expect, it } from 'vitest';
import css from '../../src/styles.css?raw';
import { ELIF_POSES, NARRATOR, elifSvg } from '../../src/virus/elif';

describe('Doktor Elif', () => {
  it('altı poz: selam, goster, alkis, oops, bekle, tut (NS4-44 ek)', () => {
    expect([...ELIF_POSES]).toEqual(['selam', 'goster', 'alkis', 'oops', 'bekle', 'tut']);
  });

  for (const pose of ['selam', 'goster', 'alkis', 'oops', 'bekle', 'tut'] as const) {
    it(`${pose}: erişilebilir svg, hex renk yok, önlük sınıfı var`, () => {
      const svg = elifSvg(pose);
      expect(svg.startsWith('<svg')).toBe(true);
      expect(svg).toContain('aria-label="Doktor Elif"');
      expect(svg).toContain('viewBox="0 0 200 240"');
      expect(svg).not.toMatch(/#[0-9a-f]{3,8}\b/i);
      expect(svg).toContain('class="elif-coat"');
    });
  }

  it('pozlar birbirinden farklı', () => {
    expect(new Set(ELIF_POSES.map(elifSvg)).size).toBe(6);
  });

  it('anlatıcı tek yerden: ad ve çizim', () => {
    expect(NARRATOR.name).toBe('Doktor Elif');
    expect(NARRATOR.svg('selam')).toBe(elifSvg('selam'));
  });

  it('Elif renk tokenları :root içinde, sınıflar bu tokenları kullanır', () => {
    for (const t of [
      '--color-elif-skin',
      '--color-elif-skin-shade',
      '--color-elif-hair',
      '--color-elif-coat',
      '--color-elif-coat-line',
      '--color-nazar-blue',
      '--color-nazar-light',
      '--color-nazar-dark',
    ])
      expect(css).toMatch(new RegExp(`${t}\\s*:\\s*#[0-9a-f]{6}`, 'i'));
    expect(css).toMatch(/\.elif-coat\s*\{[^}]*var\(--color-elif-coat\)/);
  });
});
