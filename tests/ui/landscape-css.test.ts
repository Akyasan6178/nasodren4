// 844×390 başlangıç kartı: kalıcı, statik CSS sözleşmesi. Gerçek görünüm headless tarayıcı smoke'unda
// ölçülür (bkz. docs/NS4-06-BUG-FIXES-AND-STORAGE-HARDENING.md); burada kuralın varlığı, kapsamı ve
// yalnızca başlangıç ekranını hedeflediği korunur.
import { describe, expect, it } from 'vitest';
import css from '../../src/styles.css?raw';

const QUERY = '@media (orientation: landscape) and (max-height: 480px)';

function block(): string {
  const start = css.indexOf(QUERY);
  if (start < 0) return '';
  let depth = 0;
  for (let i = css.indexOf('{', start); i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}' && --depth === 0) return css.slice(start, i + 1);
  }
  return '';
}

describe('kısa yatay ekran başlangıç kartı', () => {
  it('kısa yatay ekranlar için tek bir medya sorgusu vardır', () => {
    expect(css.split(QUERY)).toHaveLength(2);
  });

  it('yalnızca başlangıç ekranını hedefler ve kart kaydırılabilir kalır', () => {
    const b = block();
    const selectors = [...b.matchAll(/^\s*([^{}@][^{}]*)\{/gm)].map((m) => m[1]?.trim() ?? '');
    expect(selectors.length).toBeGreaterThan(0);
    for (const s of selectors) for (const part of s.split(',')) expect(part.trim().startsWith('#scr-start')).toBe(true);
    expect(b).not.toMatch(/overflow\s*:\s*hidden/);
    expect(b).not.toMatch(/display\s*:\s*none/); // içerik gizlenmez, yalnızca sıkıştırılır
  });
});
