// NS4-15: oyun olayları → GameView efekt çağrıları ve hareket tercihi. Gerçek lifecycle + wireGameEvents,
// View/ses taklit (çağrılar kaydedilir). Durum mesajları (popup) reduced motion'dan bağımsızdır.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CFG } from '../../src/config/gameConfig';
import { REDUCED_MOTION_QUERY, watchReducedMotion } from '../../src/app/motion';
import { installFakeDom, type FakeDom } from '../helpers/fakeDom';
import { dropVerticalI, finishClear, setupWell, stackRows } from '../helpers/gameHelpers';
import { loadUi } from '../helpers/uiHarness';

let dom: FakeDom;
beforeEach(() => {
  vi.useFakeTimers();
  dom = installFakeDom();
});
const viewCalls = (calls: readonly string[]) => calls.filter((c) => c.startsWith('view.'));
const popups = () => dom.el('popups').children.map((p) => p.children.map((s) => s.textContent));

describe('efekt bağlantıları', () => {
  it('scored, clearstart’tan önce view.onScored’a gider (Ozmotik/Nörorefleks dili seçilir)', async () => {
    const { g, lc, calls } = await loadUi();
    lc.start();
    calls.length = 0;
    setupWell(g, 4);
    dropVerticalI(g);
    const v = viewCalls(calls);
    expect(v.indexOf('view.onScored')).toBeGreaterThanOrEqual(0);
    expect(v.indexOf('view.onScored')).toBeLessThan(v.indexOf('view.onClearStart'));
    expect(popups()).toContainEqual(['TETRİS', 'Ozmotik etki: dört satır birden']);
  });

  it('rebound → view.onRebound, garbage → view.onGarbage (eski doğrudan shake ataması yok)', async () => {
    const { g, lc, calls } = await loadUi();
    lc.start();
    for (let i = 0; i < 2; i++) {
      stackRows(g, 7);
      g.useSyn();
      finishClear(g);
    }
    expect(calls).toContain('view.onRebound');
    calls.length = 0;
    g.garbageT = 1;
    g.update(16);
    expect(calls).toContain('view.onGarbage');
  });

  it('sıklamen bitince ×2 başlangıcı ve tek kullanım açıkça bildirilir', async () => {
    const { g, lc } = await loadUi();
    lc.start();
    stackRows(g, 8);
    expect(g.useCyc()).toBe(true);
    expect(popups()).toContainEqual(['Sıklamen özütü', 'Ozmotik drenaj başladı']);
    finishClear(g);
    expect(popups()).toContainEqual(['Puan ×2', `${CFG.cycMultMs / 1000} sn · sıklamen tek kullanımlık`]);
    expect(g.multT).toBe(CFG.cycMultMs);
  });

  it('yeni oyun view.resetFx ile süren efektleri temizler', async () => {
    const { lc, calls } = await loadUi();
    lc.start();
    expect(calls.indexOf('view.resetFx')).toBeLessThan(calls.indexOf('view.syncAll'));
  });
});

describe('hareket tercihi (prefers-reduced-motion)', () => {
  function fakeMedia(initial: boolean) {
    let listener: ((e: { matches: boolean }) => void) | null = null;
    const queries: string[] = [];
    const win = {
      matchMedia: (q: string) => {
        queries.push(q);
        return {
          matches: initial,
          addEventListener: (_: string, fn: (e: { matches: boolean }) => void) => {
            listener = fn;
          },
        } as unknown as MediaQueryList;
      },
    };
    return { win, queries, change: (m: boolean) => listener?.({ matches: m }) };
  }

  it('başlangıç değeri ve canlı değişiklik uygulanır; yalnızca hareket sorgusu kullanılır', () => {
    const m = fakeMedia(true);
    const seen: boolean[] = [];
    watchReducedMotion((r) => seen.push(r), m.win);
    m.change(false);
    m.change(true);
    expect(seen).toEqual([true, false, true]);
    expect(m.queries).toEqual([REDUCED_MOTION_QUERY]);
    expect(REDUCED_MOTION_QUERY).toBe('(prefers-reduced-motion: reduce)');
  });

  it('matchMedia yoksa tam hareket', () => {
    const seen: boolean[] = [];
    watchReducedMotion((r) => seen.push(r), {});
    expect(seen).toEqual([false]);
  });
});
