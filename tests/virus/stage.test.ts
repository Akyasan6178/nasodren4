// NS4-44 ek: beher çerçevesi, damlalık ve sağ üstteki Doktor Elif (sıradaki kapsül parmağında; poz, yerleşim, uçuş noktaları).
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
  it('kapsülü parmağında tutar (öğreticide de görünür); bölüm sonunda alkışlar', async () => {
    const { sideElifPose } = await load();
    expect(sideElifPose({ state: 'play' })).toBe('tut');
    expect(sideElifPose({ state: 'resolve' })).toBe('tut');
    expect(sideElifPose({ state: 'levelclear' })).toBe('alkis');
  });
});

describe('yerleşim ve görünürlük', () => {
  it("index.html beher, damlalık ve Elif yuvalarını içerir; klasik modda gizli; Virüs Avı'nda Sıradaki paneli yok", () => {
    for (const id of ['virus-beaker', 'virus-dropper', 'virus-elif-side']) expect(html).toContain(`id="${id}"`);
    const hideClassic = /#app:not\(\[data-mode='virus'\]\)\s*:is\(([^)]*)\)/.exec(plainCss)?.[1] ?? '';
    for (const id of ['#virus-beaker', '#virus-dropper', '#virus-elif-side']) expect(hideClassic).toContain(id);
    const hideVirus = /#app\[data-mode='virus'\]\s*:is\(([\s\S]*?)\)\s*\{\s*display:\s*none/.exec(plainCss)?.[1] ?? '';
    for (const id of ['#next-bg', '#lbl-next', '#next-mystery']) expect(hideVirus).toContain(id);
  });
  it('Elif sağ üstte: yatayda Sıradaki paneli yerinden kartın üstüne kadar; portrede Sıradaki karesinde', async () => {
    const { elifSideRect } = await load();
    const W = computeLayout(1366, 768);
    expect(elifSideRect(W)).toEqual({ x: W.next.x, y: W.next.y, w: W.next.w, h: W.cong.y - 12 - W.next.y });
    const P = computeLayout(390, 844);
    expect(elifSideRect(P)).toEqual(P.next);
  });
  it('parmak ucu Elif kutusunun içinde, sağ üst yarıda', async () => {
    const { elifSideRect, fingerPoint } = await load();
    for (const [w, h] of [
      [1366, 768],
      [390, 844],
    ] as const) {
      const L = computeLayout(w, h);
      const r = elifSideRect(L);
      const f = fingerPoint(L);
      expect(f.x).toBeGreaterThan(r.x + r.w / 2);
      expect(f.x).toBeLessThan(r.x + r.w);
      expect(f.y).toBeGreaterThan(r.y);
      expect(f.y).toBeLessThan(r.y + r.h / 2);
    }
  });
  it('beher tahtanın çevresinde, damlalık üst ortada; damlalık ağzı ve ucu', async () => {
    const { createVirusStage, dropperPoints } = await load();
    const st = createVirusStage();
    const L = computeLayout(1366, 768);
    st.layout(L);
    expect(parseFloat(dom.el('virus-beaker').style['left'] ?? 'NaN')).toBeLessThan(L.board.x);
    const dl = parseFloat(dom.el('virus-dropper').style['left'] ?? 'NaN');
    const dw = parseFloat(dom.el('virus-dropper').style['width'] ?? 'NaN');
    expect(dl + dw / 2).toBeCloseTo(L.board.x + L.board.w / 2, 0);
    const d = dropperPoints(L);
    expect(d.top.x).toBeCloseTo(L.board.x + L.board.w / 2, 0);
    expect(d.tip.y).toBeGreaterThan(d.top.y);
  });
});

describe('damlalık ve Elif tepkileri', () => {
  it('yeni kapsül damlalığa varınca damlalık sıkışır (kısa süre); Elif kapsülü tutar', async () => {
    const { createVirusStage, FLIGHT_IN_MS } = await load();
    const st = createVirusStage();
    st.onSpawn(false);
    expect(dom.el('virus-dropper').classList.contains('is-squeeze')).toBe(false);
    vi.advanceTimersByTime(FLIGHT_IN_MS + 10);
    expect(dom.el('virus-dropper').classList.contains('is-squeeze')).toBe(true);
    st.sync({ state: 'play', warn: false });
    expect(dom.el('virus-elif-side').dataset['pose']).toBe('tut');
    vi.advanceTimersByTime(400);
    expect(dom.el('virus-dropper').classList.contains('is-squeeze')).toBe(false);
  });
  it('hareketi azaltta damlalık hemen sıkışır', async () => {
    const { createVirusStage } = await load();
    const st = createVirusStage();
    st.onSpawn(true);
    expect(dom.el('virus-dropper').classList.contains('is-squeeze')).toBe(true);
  });
  it('Elif hep görünür; son saniyelerde telaş sınıfı', async () => {
    const { createVirusStage } = await load();
    const st = createVirusStage();
    st.sync({ state: 'play', warn: true });
    expect(dom.el('virus-elif-side').hidden).toBe(false);
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
