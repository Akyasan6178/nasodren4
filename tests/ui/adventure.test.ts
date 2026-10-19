// NS4-09: macera akışı (gerçek lifecycle + olay bağlantıları + HUD): bölüm sonu kaydı, kart açma, analitik.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { installFakeDom, type FakeDom } from '../helpers/fakeDom';
import { loadUi } from '../helpers/uiHarness';
import { CARDS, CARD_ORDER } from '../../src/content/cards';
import { TIPS } from '../../src/content/tips';
import { STAGES } from '../../src/content/stages';

let dom: FakeDom;
beforeEach(() => {
  vi.useFakeTimers();
  dom = installFakeDom();
});

type Ev = { event: string } & Record<string, unknown>;
const events = () => dom.window.dataLayer as Ev[];
const named = (name: string) => events().filter((e) => e.event === 'fn_' + name);

describe('macera modu', () => {
  it('bölüm başlangıcı: bölüm paneli, Sıklamen konuşur, stage_start (game_start değil)', async () => {
    const { g, lc } = await loadUi();
    lc.start('adventure', 0);
    expect(g.mode).toBe('adventure');
    expect(dom.el('stats').classList.contains('adv')).toBe(true);
    expect(dom.el('hud-stage').textContent).toBe('Maksiller sinüs · 1/2');
    expect(dom.el('say-text').textContent).toBe(STAGES[0].intro);
    expect(named('stage_start')).toEqual([expect.objectContaining({ stage: 1, attempt: 1 })]);
    expect(named('game_start')).toHaveLength(0);
    lc.restart();
    expect(named('stage_start')[1]).toMatchObject({ stage: 1, attempt: 2 });
    expect(dom.el('say-text').textContent).toBe('Tekrar deneyelim, bu sefer olacak!');
  });

  it('bölüm sonu: yıldız ve kart kaydedilir, stage_complete gönderilir, sonraki bölüme geçilir', async () => {
    const { g, lc } = await loadUi();
    const { meta } = await import('../../src/storage/progress');
    lc.start('adventure', 0);
    g.score = 420;
    g.pieces = 5;
    g.win();
    expect(lc.getState()).toBe('over');
    expect(meta.stages?.[0]).toBe(3);
    expect(meta.cards).toEqual(['maksiller']);
    expect(named('stage_complete')).toEqual([expect.objectContaining({ stage: 1, stars: 3, pieces: 5, score: 420 })]);
    expect(named('card_unlock')).toEqual([expect.objectContaining({ id: 'maksiller' })]);
    expect(lc.nextStage()).toBe(true);
    expect(g.stage).toEqual(STAGES[1].rules); // loadUi modülleri yeniden yükler: nesne kimliği farklı
    // aynı bölüm daha düşük yıldızla tekrar geçilirse en iyi sonuç korunur
    lc.start('adventure', 0);
    g.pieces = 30;
    g.win();
    expect(meta.stages?.[0]).toBe(3);
    expect(meta.cards).toEqual(['maksiller']);
  });

  it('son bölümden sonra nextStage false döner', async () => {
    const { lc } = await loadUi();
    lc.start('adventure', STAGES.length - 1);
    expect(lc.nextStage()).toBe(false);
  });

  it('bölüm başarısız: stage_fail, rekor ve game_over yazılmaz', async () => {
    const { g, lc } = await loadUi();
    const { meta } = await import('../../src/storage/progress');
    lc.start('adventure', 2);
    g.score = 99999;
    g.gameOver('blockout');
    expect(meta.best).toBe(0);
    expect(named('stage_fail')).toEqual([expect.objectContaining({ stage: 3, reason: 'blockout', progress: 0 })]);
    expect(named('game_over')).toHaveLength(0);
  });

  it('serbest oyun: game_start / game_over sözleşmesi değişmedi', async () => {
    const { g, lc } = await loadUi();
    lc.start('endless');
    expect(dom.el('stats').classList.contains('adv')).toBe(false);
    g.score = 10;
    g.gameOver('blockout');
    expect(Object.keys(named('game_start')[0]).sort()).toEqual(['best', 'event', 't']);
    expect(Object.keys(named('game_over')[0]).sort()).toEqual(
      ['cyc_used', 'dur_s', 'event', 'level', 'lines', 'reason', 'score', 'syn_uses', 't', 'tetrises'].sort(),
    );
  });

  it('serbest oyunda ilk sıklamen kullanımı kartı açar (bildirimle)', async () => {
    const { g, lc } = await loadUi();
    const { meta } = await import('../../src/storage/progress');
    lc.start('endless');
    g.cycCharge = 1;
    g.useCyc();
    vi.advanceTimersByTime(0);
    g.update(1000);
    expect(meta.cards).toContain('siklamen');
    expect(dom.el('toast').textContent).toBe(`Yeni bilgi kartı: ${CARDS.siklamen.title}`);
  });
});

describe('bilgi kartı içeriği', () => {
  it('albüm sırası bütün kartları bir kez içerir', () => {
    expect([...CARD_ORDER].sort()).toEqual(Object.keys(CARDS).sort());
  });

  it('kart metinleri kısa ve kaynaklı; onaylı kartlar onaylı ipucu metniyle aynı', () => {
    for (const id of CARD_ORDER) {
      const c = CARDS[id];
      expect(c.id).toBe(id);
      expect(c.body.length, id).toBeLessThanOrEqual(220);
      expect(c.source.length, id).toBeGreaterThan(0);
      if (c.status === 'review') expect(c.url, id).toMatch(/^https:\/\//);
    }
    const tip = (title: string) => TIPS.find(([t]) => t === title)?.[1];
    expect(CARDS.rebound.body).toBe(tip('Kullanım süresine dikkat'));
    expect(CARDS.hekim.body).toBe(tip('Ne zaman hekime gitmeli?'));
  });

  it('kartlar etkinlik iddiası içermez (sıklamen kartı yalnızca botanik ve güvenlik bilgisi)', () => {
    for (const id of CARD_ORDER)
      expect(CARDS[id].body, id).not.toMatch(/tedavi eder|iyileştirir|etkilidir|kesin çözüm/i);
    expect(CARDS.siklamen.body).toMatch(/zehirli/);
  });
});
