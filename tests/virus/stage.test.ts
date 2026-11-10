// NS4-44 ek: beher çerçevesi, damlalık ve tahtanın yanındaki Doktor Elif (poz seçimi, yerleşim, görünürlük).
import { beforeEach, describe, expect, it, vi } from 'vitest';
import html from '../../index.html?raw';
import { plainCss } from '../helpers/css';
import { installFakeDom, type FakeDom } from '../helpers/fakeDom';
import { computeLayout } from '../../src/rendering/layout';

let dom: FakeDom;
beforeEach(() => {
  vi.useFakeTimers();
  dom = installFakeDom();
});

async function load() {
  vi.resetModules();
  return import('../../src/virus/stage');
}

describe('sideElifPose', () => {
  it('öğretici açıkken gizli; bölüm sonunda alkış; kapsül bırakırken bas; son saniyelerde telaş; yoksa bekle', async () => {
    const { sideElifPose } = await load();
    expect(sideElifPose({ tutorial: true, state: 'play', warn: false, sinceSpawnMs: 1000 })).toBeNull();
    expect(sideElifPose({ tutorial: false, state: 'levelclear', warn: true, sinceSpawnMs: 0 })).toBe('alkis');
    expect(sideElifPose({ tutorial: false, state: 'play', warn: true, sinceSpawnMs: 100 })).toBe('goster');
    expect(sideElifPose({ tutorial: false, state: 'play', warn: true, sinceSpawnMs: 1000 })).toBe('oops');
    expect(sideElifPose({ tutorial: false, state: 'resolve', warn: false, sinceSpawnMs: 1000 })).toBe('bekle');
  });
});

describe('yerleşim ve görünürlük', () => {
  it('index.html beher, damlalık ve yan Elif yuvalarını içerir; klasik modda gizli', () => {
    for (const id of ['virus-beaker', 'virus-dropper', 'virus-elif-side']) expect(html).toContain(`id="${id}"`);
    const hide = /#app:not\(\[data-mode='virus'\]\)\s*:is\(([^)]*)\)/.exec(plainCss)?.[1] ?? '';
    for (const id of ['#virus-beaker', '#virus-dropper', '#virus-elif-side']) expect(hide).toContain(id);
  });
  it('yan Elif: yatayda sağ sütunda kartın altında, portrede alt şeritte solda', async () => {
    const { elifSideRect } = await load();
    const W = computeLayout(1366, 768);
    const r = elifSideRect(W);
    expect(r.x).toBe(W.next.x);
    expect(r.y).toBeGreaterThan(W.cong.y + W.cong.h);
    expect(r.y + r.h).toBeLessThanOrEqual(W.btnPause.y);
    const P = computeLayout(390, 844);
    const p = elifSideRect(P);
    expect(p.x).toBeLessThan(P.board.x + 4);
    expect(p.y).toBeGreaterThan(P.board.y + P.board.h - 1);
  });
  it('beher tahtanın çevresinde, damlalık üst ortada', async () => {
    const { createVirusStage } = await load();
    const st = createVirusStage();
    const L = computeLayout(1366, 768);
    st.layout(L);
    const bx = parseFloat(dom.el('virus-beaker').style['left'] ?? 'NaN');
    expect(bx).toBeLessThan(L.board.x);
    const dl = parseFloat(dom.el('virus-dropper').style['left'] ?? 'NaN');
    const dw = parseFloat(dom.el('virus-dropper').style['width'] ?? 'NaN');
    expect(dl + dw / 2).toBeCloseTo(L.board.x + L.board.w / 2, 0);
  });
});

describe('damlalık ve Elif tepkileri', () => {
  it('yeni kapsülde damlalık sıkışır (kısa süre), Elif bas pozuna geçer', async () => {
    const { createVirusStage } = await load();
    const st = createVirusStage();
    st.onSpawn();
    expect(dom.el('virus-dropper').classList.contains('is-squeeze')).toBe(true);
    st.sync({ tutorial: false, state: 'play', warn: false });
    expect(dom.el('virus-elif-side').dataset['pose']).toBe('goster');
    vi.advanceTimersByTime(400);
    expect(dom.el('virus-dropper').classList.contains('is-squeeze')).toBe(false);
    st.sync({ tutorial: false, state: 'play', warn: false });
    expect(dom.el('virus-elif-side').dataset['pose']).toBe('bekle');
  });
  it('öğretici açıkken yan Elif gizli; son saniyelerde telaş sınıfı', async () => {
    const { createVirusStage } = await load();
    const st = createVirusStage();
    st.sync({ tutorial: true, state: 'play', warn: false });
    expect(dom.el('virus-elif-side').hidden).toBe(true);
    vi.advanceTimersByTime(1000);
    st.sync({ tutorial: false, state: 'play', warn: true });
    expect(dom.el('virus-elif-side').hidden).toBe(false);
    expect(dom.el('virus-elif-side').dataset['pose']).toBe('oops');
    expect(dom.el('virus-elif-side').classList.contains('is-panic')).toBe(true);
  });
});

describe('gözden geçirme düzeltmesi: portrede damlalık', () => {
  it('telefonda damlalık süre kartıyla çakışmaz (sıkışma görünür)', async () => {
    const { createVirusStage } = await load();
    const st = createVirusStage();
    const L = computeLayout(390, 844);
    st.layout(L);
    const top = parseFloat(dom.el('virus-dropper').style['top'] ?? 'NaN');
    expect(top).toBeGreaterThanOrEqual(L.cong.y + L.cong.h);
  });
});
