import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CFG } from '../../src/config/gameConfig';
import { installFakeDom, type FakeDom } from '../helpers/fakeDom';
import { finishClear, stackRows } from '../helpers/gameHelpers';
import { loadUi } from '../helpers/uiHarness';

const REBOUND_TOAST = 'Dekonjestanların uzun süreli kullanımı tıkanıklığın geri dönmesine yol açabilir.';

let dom: FakeDom;
beforeEach(() => {
  vi.useFakeTimers();
  dom = installFakeDom();
});

function btn(id: 'btn-cyc' | 'btn-syn') {
  const b = dom.el(id);
  const sub = dom.el(id === 'btn-cyc' ? 'cyc-sub' : 'syn-sub');
  return {
    state: b.dataset['state'],
    text: sub.textContent,
    disabled: b.disabled,
    ready: b.classList.contains('ready'),
  };
}

describe('sıklamen butonu', () => {
  it('kilitli → hazır → kullanıldı → aktif etki → kullanıldı', async () => {
    const { g, lc, frame } = await loadUi();
    lc.start();
    frame();
    expect(btn('btn-cyc')).toEqual({ state: 'locked', text: 'Tıkanıklık %35’te açılır', disabled: true, ready: false });
    stackRows(g, 7); // %35
    frame();
    expect(btn('btn-cyc')).toEqual({ state: 'ready', text: 'Hazır · oyunda 1 kez', disabled: false, ready: true });
    g.useCyc();
    frame(); // drenaj sürerken
    expect(btn('btn-cyc')).toEqual({ state: 'used', text: 'Bu oyunda kullanıldı', disabled: true, ready: false });
    finishClear(g);
    frame();
    expect(btn('btn-cyc')).toEqual({ state: 'active', text: 'Kullanıldı · ×2 etkin', disabled: true, ready: false });
    expect(dom.el('badge-mult').style['display']).toBe('block');
    expect(dom.el('badge-mult').textContent).toBe('Ferah nefes ×2 · 30 sn');
    stackRows(g, 7); // tıkanıklık yeniden yüksek: tek kullanım, açılmaz
    frame();
    expect(btn('btn-cyc').state).toBe('active');
    expect(g.canCyc()).toBe(false);
  });

  it('×2 süresi bitince sayaç temizlenir ve buton "Bu oyunda kullanıldı" olur', async () => {
    const { g, lc, frame } = await loadUi();
    lc.start();
    stackRows(g, 7);
    g.useCyc();
    finishClear(g);
    frame();
    g.update(CFG.cycMultMs - 1000);
    frame();
    expect(dom.el('badge-mult').textContent).toBe('Ferah nefes ×2 · 1 sn');
    expect(btn('btn-cyc').state).toBe('active');
    g.update(1000);
    frame();
    expect(g.multT).toBe(0);
    expect(dom.el('badge-mult').style['display']).toBe('none');
    expect(btn('btn-cyc')).toMatchObject({ state: 'used', text: 'Bu oyunda kullanıldı', disabled: true });
  });
});

describe('sentetik açıcı butonu', () => {
  it('ilk kullanım öncesi hızlı rahatlama, sonrası rebound uyarısı; ikinci kullanım mümkün', async () => {
    const { g, lc, frame } = await loadUi();
    lc.start();
    frame();
    expect(btn('btn-syn')).toEqual({ state: 'locked', text: 'Hızlı rahatlama', disabled: true, ready: false });
    stackRows(g, 7);
    frame();
    expect(btn('btn-syn')).toEqual({ state: 'ready', text: 'Hazır · hızlı rahatlama', disabled: false, ready: true });
    g.useSyn();
    finishClear(g);
    frame();
    expect(g.reboundT).toBe(0); // ilk kullanım rebound başlatmaz (değişmedi)
    expect(btn('btn-syn')).toMatchObject({ state: 'risk', text: 'Tekrarı rebound yapar' });
    stackRows(g, 7);
    frame();
    expect(btn('btn-syn')).toEqual({ state: 'risk', text: 'Tekrarı rebound yapar', disabled: false, ready: false });
  });

  it('rebound başlayınca buton ve rozet doğru durumda; bitince temizlenir', async () => {
    const { g, lc, frame } = await loadUi();
    lc.start();
    for (let i = 0; i < 2; i++) {
      stackRows(g, 7);
      g.useSyn();
      finishClear(g);
    }
    frame();
    expect(g.reboundT).toBe(CFG.reboundMs);
    expect(btn('btn-syn')).toMatchObject({ state: 'rebound', text: 'Rebound sürüyor' });
    expect(dom.el('badge-rebound').style['display']).toBe('block');
    expect(dom.el('badge-rebound').textContent).toBe('Rebound: tıkanıklık geri tepiyor · 40 sn');
    g.update(CFG.reboundMs);
    frame();
    expect(g.reboundT).toBe(0);
    expect(dom.el('badge-rebound').style['display']).toBe('none');
    expect(btn('btn-syn')).toMatchObject({ state: 'risk', text: 'Tekrarı rebound yapar' });
  });

  it('rebound popup her rebound kullanımında, uyarı toast’u oyunda bir kez gösterilir', async () => {
    const { g, lc } = await loadUi();
    lc.start();
    const popups = () => dom.el('popups').children.map((p) => p.children[0]?.textContent);
    for (let i = 0; i < 2; i++) {
      stackRows(g, 7);
      g.useSyn();
      finishClear(g);
    }
    expect(dom.el('toast').textContent).toBe(REBOUND_TOAST);
    expect(popups()).toContain('Rebound');
    dom.el('toast').textContent = '';
    dom.el('popups').replaceChildren();
    stackRows(g, 7);
    g.useSyn();
    finishClear(g);
    expect(g.reboundT).toBe(CFG.reboundMs * 2); // üçüncü kullanım: mevcut kural
    expect(popups()).toEqual(['Rebound']);
    expect(dom.el('toast').textContent).toBe('');
  });
});
