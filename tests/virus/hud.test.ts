// NS4-44: Virüs Avı HUD: lens yerleşimi, mod görünürlüğü (CSS), süre/kalan, lens tepkileri.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import html from '../../index.html?raw';
import { plainCss } from '../helpers/css';
import { installFakeDom, type FakeDom } from '../helpers/fakeDom';
import { computeLayout } from '../../src/rendering/layout';
import { VIRUS } from '../../src/virus/rules';
import { COLS } from '../../src/config/gameConfig';

let dom: FakeDom;
beforeEach(() => {
  vi.useFakeTimers();
  dom = installFakeDom();
});

async function load() {
  vi.resetModules();
  const hud = await import('../../src/virus/hud');
  const { VirusGame } = await import('../../src/virus/VirusGame');
  const rules = await import('../../src/virus/rules');
  const g = new VirusGame();
  g.reset({ seed: 1 });
  return { hud, g, rules };
}

/** `#app[data-mode=…]` ile başlayan gizleme kuralının seçici metni. */
function hideRule(mode: 'virus' | 'classic'): string {
  const re =
    mode === 'virus'
      ? /#app\[data-mode='virus'\]\s*:is\(([^)]*(?:\([^)]*\))?[^)]*)\)\s*\{\s*display:\s*none\s*!important;?\s*\}/
      : /#app:not\(\[data-mode='virus'\]\)\s*:is\(([^)]*)\)\s*\{\s*display:\s*none\s*!important;?\s*\}/;
  return re.exec(plainCss)?.[1] ?? '';
}

describe('lensRect', () => {
  it('portrede Beklet paneli yerinde', async () => {
    const { hud } = await load();
    const L = computeLayout(390, 844);
    expect(hud.lensRect(L)).toEqual(L.hold);
  });
  it('NS4-44 ek: yatayda sol sütunda skor kartının altında', async () => {
    const { hud } = await load();
    const L = computeLayout(1366, 768);
    const y = L.hold.y + L.stats.h + 12;
    expect(hud.statsRect(L)).toEqual({ x: L.stats.x, y: L.hold.y, w: L.stats.w, h: L.stats.h });
    expect(hud.lensRect(L)).toEqual({
      x: L.stats.x,
      y,
      w: L.stats.w,
      h: Math.min(L.stats.w, L.board.y + L.board.h - y),
    });
  });
  it('portrede skor kartı yerinde kalır', async () => {
    const { hud } = await load();
    const L = computeLayout(390, 844);
    expect(hud.statsRect(L)).toEqual(L.stats);
  });
});

describe('mod görünürlüğü', () => {
  it('virüs modunda klasik HUD öğeleri gizlenir', () => {
    const sel = hideRule('virus');
    for (const id of [
      '#meter',
      '#hold-bg',
      '#lbl-hold',
      '#next-mystery',
      '#cong',
      '#fx-badges',
      '#room-hud',
      '#room-map',
      '#btn-hold',
      '#btn-cyc',
      '#btn-sneeze',
      '#btn-spray',
      '#attack-bar',
      '#tutorial',
      '#sinus-walls',
      '#pressure',
      '#danger',
    ])
      expect(sel).toContain(id);
  });
  it('klasik modda lens, kart ve bölüm satırı gizli', () => {
    const sel = hideRule('classic');
    for (const id of ['#virus-lens', '#virus-card', '.virus-row']) expect(sel).toContain(id);
  });
  it('index.html lens, kart, bölüm satırı ve Virüs Avı butonunu içerir', () => {
    for (const id of ['id="virus-lens"', 'id="virus-card"', 'id="virus-level"', 'id="b-virus"'])
      expect(html).toContain(id);
  });
  it('setMode #app[data-mode] yazar', async () => {
    const { hud } = await load();
    hud.setMode('virus');
    expect(dom.el('app').dataset['mode']).toBe('virus');
    hud.setMode('classic');
    expect(dom.el('app').dataset['mode']).toBe('classic');
  });
});

describe('sync', () => {
  it('süre m:ss, 15 sn altında uyarı', async () => {
    const { hud, g } = await load();
    const h = hud.createVirusHud();
    h.layout(computeLayout(1366, 768));
    h.sync(g, true);
    expect(dom.el('virus-time').textContent).toBe('1:15');
    expect(dom.el('virus-card').dataset['warn']).toBeUndefined();
    g.timeLeftMs = 9_000;
    h.sync(g, true);
    expect(dom.el('virus-time').textContent).toBe('0:09');
    expect(dom.el('virus-card').dataset['warn']).toBe('1');
    expect(dom.el('virus-lens').classList.contains('is-giggle')).toBe(true);
  });
  it('kalan sayılar ve biten tür is-gone', async () => {
    const { hud, g, rules } = await load();
    rules.clearGrid(g.grid);
    g.grid.kind[19 * COLS + 1] = VIRUS;
    g.grid.tint[19 * COLS + 1] = 1;
    g.grid.kind[19 * COLS + 2] = VIRUS;
    g.grid.tint[19 * COLS + 2] = 1;
    g.grid.kind[19 * COLS + 5] = VIRUS;
    g.grid.tint[19 * COLS + 5] = 2;
    const h = hud.createVirusHud();
    h.sync(g, true);
    expect(dom.el('virus-left').textContent).toBe('3');
    expect(dom.el('lens-n-1').textContent).toBe('2');
    expect(dom.el('lens-0').classList.contains('is-gone')).toBe(true);
    expect(dom.el('lens-1').classList.contains('is-gone')).toBe(false);
    expect(dom.el('virus-level').textContent).toBe('1');
  });
  it('flinch kısa süre sonra kalkar, back hepsini geri getirir', async () => {
    const { hud } = await load();
    const h = hud.createVirusHud();
    h.react('flinch', 2);
    expect(dom.el('lens-2').classList.contains('is-flinch')).toBe(true);
    vi.advanceTimersByTime(400);
    expect(dom.el('lens-2').classList.contains('is-flinch')).toBe(false);
    h.react('gone', 0);
    expect(dom.el('lens-0').classList.contains('is-gone')).toBe(true);
    h.react('back', 0);
    expect(dom.el('lens-0').classList.contains('is-gone')).toBe(false);
  });
  it('portre → yatay yeniden yerleşim lensi taşır, mod korunur', async () => {
    const { hud } = await load();
    hud.setMode('virus');
    const h = hud.createVirusHud();
    const P = computeLayout(390, 844);
    h.layout(P);
    expect(dom.el('virus-lens').style['left']).toBe(`${P.hold.x}px`);
    const W = computeLayout(844, 390);
    h.layout(W);
    expect(dom.el('virus-lens').style['left']).toBe(`${hud.lensRect(W).x}px`);
    expect(dom.el('app').dataset['mode']).toBe('virus');
  });
});
