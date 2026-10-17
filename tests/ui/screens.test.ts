import { beforeEach, describe, expect, it, vi } from 'vitest';
import { installFakeDom, type FakeDom } from '../helpers/fakeDom';

async function load() {
  vi.resetModules();
  const screens = await import('../../src/ui/screens');
  screens.bindBackButtons();
  return screens;
}

let dom: FakeDom;
beforeEach(() => {
  vi.useFakeTimers();
  dom = installFakeDom();
});

describe('alt ekran yığını (Ayarlar / Nasıl oynanır)', () => {
  it('başlangıçtan açılan Ayarlar geri butonuyla başlangıca döner', async () => {
    const { openSub } = await load();
    openSub('scr-set');
    expect(dom.visibleScreen()).toBe('scr-set');
    dom.backButton('scr-set').click();
    expect(dom.visibleScreen()).toBe('scr-start');
  });

  it('pause ekranından açılan Ayarlar geri butonuyla pause ekranına döner', async () => {
    const { openSub, show } = await load();
    show('scr-pause');
    openSub('scr-set');
    dom.backButton('scr-set').click();
    expect(dom.visibleScreen()).toBe('scr-pause');
  });

  it('closeSub() açık alt ekranı kapatır, yoksa hiçbir şey yapmaz', async () => {
    const { openSub, show, closeSub } = await load();
    show('scr-pause');
    expect(closeSub()).toBe(false);
    expect(dom.visibleScreen()).toBe('scr-pause');
    openSub('scr-set');
    expect(closeSub()).toBe(true);
    expect(dom.visibleScreen()).toBe('scr-pause');
    show('scr-start');
    openSub('scr-how');
    expect(closeSub()).toBe(true);
    expect(dom.visibleScreen()).toBe('scr-start');
  });

  it('yığın boşsa geri butonu başlangıç ekranını açar', async () => {
    const { show } = await load();
    show('scr-set');
    dom.backButton('scr-set').click();
    expect(dom.visibleScreen()).toBe('scr-start');
  });
});
