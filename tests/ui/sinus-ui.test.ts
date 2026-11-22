// Sinüzit atağı geri sayımı (NS4-47) ve Spray düğmesi: yerleşim çakışmaz ve ekrana sığar (320 px dahil), HUD durumları
// (saniye, saldırıdan sonra yeniden başlama, mola, oyun sonu, sıradaki adım, Spray hazır/hedefsiz), erişilebilirlik ve
// CSS, kayıt kuralları (tek oyunculu kaydedilir, çok oyunculu kaydedilmez). Eski dikey bar kaldırıldı.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Game } from '../../src/game/Game';
import { PIECE } from '../../src/game/pieces';
import { PRESSURE } from '../../src/game/pressure';
import { ORIGIN, SINUS } from '../../src/game/sinusAttack';
import { STEP_NAME, TIMER_LABEL } from '../../src/content/waves';
import { computeLayout, versusLayout } from '../../src/rendering/layout';
import type { Layout, Rect } from '../../src/types/layout';
import { createAppStubs } from '../helpers/appStubs';
import { installFakeDom, type FakeDom } from '../helpers/fakeDom';
import { mediaBlock, rule } from '../helpers/css';
import html from '../../index.html?raw';
import css from '../../src/styles.css?raw';

const VIEWPORTS = [
  [320, 568],
  [390, 844],
  [844, 390],
  [1366, 768],
  [1920, 1080],
] as const;
const overlap = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const hudRects = (L: Layout): [string, Rect][] => [
  ['board', L.board],
  ['hold', L.hold],
  ['next', L.next],
  ['stats', L.stats],
  ['cong', L.cong],
  ['btnHold', L.btnHold],
  ['btnCyc', L.btnCyc],
  ['btnSneeze', L.btnSneeze],
  ['btnPause', L.btnPause],
];
const disabled = (dom: FakeDom) => (dom.el('btn-spray') as unknown as { disabled: boolean }).disabled;
const sec = (dom: FakeDom) => dom.el('attack-sec').textContent;

describe('yerleşim', () => {
  it.each(VIEWPORTS)(
    '%ix%i: geri sayım ve Spray HUD panellerine, butonlara ve tahtaya binmez; ekrana sığar',
    (W, H) => {
      for (const versus of [false, true]) {
        const L = versus ? versusLayout(W, H).L : computeLayout(W, H);
        const opps = versus ? versusLayout(W, H).opps : null;
        const timer = L.attackTimer,
          spray = L.btnSpray;
        for (const [name, r] of hudRects(L)) {
          expect(overlap(timer, r), `${W}x${H} sayaç×${name} (versus ${versus})`).toBe(false);
          expect(overlap(spray, r), `${W}x${H} spray×${name} (versus ${versus})`).toBe(false);
        }
        expect(overlap(timer, spray)).toBe(false);
        if (opps) {
          expect(overlap(timer, opps), `${W}x${H} sayaç×rakip`).toBe(false);
          expect(overlap(spray, opps), `${W}x${H} spray×rakip`).toBe(false);
        }
        for (const r of [timer, spray]) {
          expect(r.x).toBeGreaterThanOrEqual(0);
          expect(r.y).toBeGreaterThanOrEqual(0);
          expect(r.x + r.w).toBeLessThanOrEqual(W);
          expect(r.y + r.h).toBeLessThanOrEqual(H);
        }
        // portre: tahtanın altında tek satır (okunur yükseklik); yatay: tahtanın sağındaki sütunda kart
        if (L.portrait) expect([timer.h >= 16, timer.y >= L.board.y + L.board.h]).toEqual([true, true]);
        else
          expect([timer.h >= 44, timer.x >= L.board.x + L.board.w, timer.x === L.next.x]).toEqual([true, true, true]);
      }
    },
  );
});

describe('HUD: sinüzit atağı geri sayımı', () => {
  let dom: FakeDom;
  beforeEach(() => {
    vi.useFakeTimers();
    dom = installFakeDom();
    vi.resetModules();
  });
  it('kalan süre yukarı yuvarlanmış tam saniye; 0, negatif ve NaN gösterilmez', async () => {
    const { timerSeconds } = await import('../../src/ui/sinusHud');
    expect([timerSeconds(45_000), timerSeconds(8_200), timerSeconds(1), timerSeconds(0)]).toEqual([45, 9, 1, 1]);
    expect([timerSeconds(-500), timerSeconds(Number.NaN)]).toEqual([1, 1]);
  });
  it('ilk adıma 45 sn; saniyede bir değişir; saldırıdan sonra 60 sn; dikey bar yok', async () => {
    const { createSinusHud } = await import('../../src/ui/sinusHud');
    const g = new Game();
    g.reset({ seed: 1 });
    const hud = createSinusHud();
    hud.layout(computeLayout(390, 844));
    hud.sync(g, true);
    expect(sec(dom)).toBe(String(PRESSURE.firstStepMs / 1000));
    expect(dom.el('attack-timer').hidden).toBe(false);
    g.attackT = PRESSURE.firstStepMs - 8_200; // 8,2 sn kaldı
    hud.sync(g, true);
    expect(sec(dom)).toBe('9');
    expect(dom.el('attack-timer').classList.contains('soon')).toBe(false);
    g.attackT = PRESSURE.firstStepMs - 4_000;
    hud.sync(g, true);
    expect([sec(dom), dom.el('attack-timer').classList.contains('soon')]).toEqual(['4', true]);
    g.update(4_000); // saldırı (ilk adım: dalga)
    expect(g.pressSteps).toBe(1);
    hud.sync(g, true);
    expect(sec(dom)).toBe(String(PRESSURE.stepMs / 1000));
    expect(html).not.toMatch(/id="attack-bar"|id="attack-fill"/);
    expect(css).not.toMatch(/#attack-bar/);
  });
  it('mola: sync çağrılmaz, sayı sabit; oyun sonunda sayaç gizlenir', async () => {
    const { createSinusHud } = await import('../../src/ui/sinusHud');
    const g = new Game();
    g.reset({ seed: 1 });
    const hud = createSinusHud();
    hud.layout(computeLayout(390, 844));
    g.attackT = 10_000;
    hud.sync(g, true);
    const shown = sec(dom);
    // molada oyun güncellenmez ve HUD senkronlanmaz: görünen sayı ve kalan süre aynı kalır
    const before = g.stepRemainingMs();
    expect(sec(dom)).toBe(shown);
    hud.sync(g, true);
    expect([sec(dom), g.stepRemainingMs()]).toEqual([shown, before]);
    hud.sync(g, false); // oyun sonu
    expect(dom.el('attack-timer').hidden).toBe(true);
    hud.sync(g, true);
    expect(dom.el('attack-timer').hidden).toBe(false);
  });
  it('sıradaki adımın adı (ikincil): dalga / hızlanma; portre dar ekranda gizlenir, yatayda kart', async () => {
    const { createSinusHud } = await import('../../src/ui/sinusHud');
    const g = new Game();
    g.reset({ seed: 1 });
    const hud = createSinusHud();
    hud.layout(computeLayout(390, 844));
    hud.sync(g, true);
    expect(dom.el('attack-kind').textContent).toBe(STEP_NAME.wave);
    g.pressSteps = 1;
    hud.sync(g, true);
    expect(dom.el('attack-kind').textContent).toBe(STEP_NAME.speed);
    hud.layout(computeLayout(320, 568));
    expect(dom.el('attack-timer').classList.contains('narrow')).toBe(true);
    hud.layout(computeLayout(1366, 768));
    expect([
      dom.el('attack-timer').classList.contains('card'),
      dom.el('attack-timer').classList.contains('narrow'),
    ]).toEqual([true, false]);
  });
  it('Spray: şarj dolar; hazırken etkin; dolu ama hedefsizken kapalı ve çizgili; atak parlaması', async () => {
    const { createSinusHud, ATTACK_HIT_MS } = await import('../../src/ui/sinusHud');
    const g = new Game();
    g.reset({ seed: 1 });
    const hud = createSinusHud();
    hud.layout(computeLayout(390, 844));
    hud.sync(g, true);
    expect(disabled(dom)).toBe(true);
    g.sprayCharge = SINUS.sprayThreshold / 2;
    hud.sync(g, true);
    expect(dom.el('spray-fill').style['transform']).toBe('scaleX(0.5)');
    g.sprayCharge = SINUS.sprayThreshold;
    hud.sync(g, true);
    expect([disabled(dom), dom.el('btn-spray').classList.contains('idle')]).toEqual([true, true]);
    g.board[21 * 10 + 4] = PIECE.GARBAGE;
    g.origin[21 * 10 + 4] = ORIGIN.attack;
    hud.sync(g, true);
    expect([
      disabled(dom),
      dom.el('btn-spray').classList.contains('ready'),
      dom.el('btn-spray').classList.contains('idle'),
    ]).toEqual([false, true, false]);
    hud.onAttack();
    expect(dom.el('attack-timer').classList.contains('hit')).toBe(true);
    vi.advanceTimersByTime(ATTACK_HIT_MS);
    expect(dom.el('attack-timer').classList.contains('hit')).toBe(false);
  });
  it('erişilebilirlik: sayaç "Sonraki sinüzit atağı" adlı timer (canlı anons yok); Spray düğmesi adlı', () => {
    const timer = /<div id="attack-timer"[^>]*>/.exec(html)?.[0] ?? '';
    expect(timer).toMatch(/role="timer"/);
    expect(timer).toMatch(/aria-labelledby="attack-lbl"/);
    expect(timer).not.toMatch(/aria-live="(polite|assertive)"|hidden/);
    expect(html).toContain(`<span class="at-lbl" id="attack-lbl">${TIMER_LABEL}</span`);
    const spray = /<button id="btn-spray"[^>]*>/.exec(html)?.[0] ?? '';
    expect(spray).toContain('aria-label="Spray"');
    expect(spray).not.toContain('hidden');
    const btn = html.slice(
      html.indexOf('<button id="btn-spray"'),
      html.indexOf('</button>', html.indexOf('btn-spray')),
    );
    expect(
      btn
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim(),
    ).toBe('Spray');
  });
  it('CSS: sayaç hareketsiz (animasyon yok); son saniyeler renkle; Spray hedefsiz görünümü', () => {
    expect(rule('#attack-timer')).not.toMatch(/animation/);
    expect(rule('#attack-timer.soon .at-val')).toMatch(/color:/);
    expect(mediaBlock('@media (prefers-reduced-motion: reduce)')).not.toMatch(/attack-bar/);
    expect(rule('#btn-spray.idle .charge i')).toMatch(/repeating-linear-gradient/);
  });
});

describe('kayıt: tek oyunculu kaydedilir, çok oyunculu tur kaydedilmez', () => {
  let data: Map<string, string>;
  beforeEach(() => {
    vi.useFakeTimers();
    installFakeDom();
    data = new Map();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
    });
    vi.resetModules();
  });
  it('tek oyunculu: yerel skor ve kişisel rekor yeni kural setiyle yazılır', async () => {
    const { createLifecycle } = await import('../../src/app/lifecycle');
    const g = new Game();
    const onGameRecorded = vi.fn();
    const lc = createLifecycle({ ...createAppStubs(g, true).deps, onGameRecorded });
    lc.start();
    g.score = 50;
    lc.handleGameOver('blockout');
    vi.advanceTimersByTime(1000);
    expect(onGameRecorded).toHaveBeenCalled();
    expect(onGameRecorded.mock.calls[0]?.[0]).toMatchObject({ ruleset: 'sinus-dalga-v2' });
    expect(JSON.parse(data.get('fn_meta') ?? '{}')).toMatchObject({ best: 50 });
  });
  it('çok oyunculu tur: yerel skor, kişisel rekor ve gönderim yok', async () => {
    const { createLifecycle } = await import('../../src/app/lifecycle');
    const g = new Game();
    const onGameRecorded = vi.fn();
    const onOver = vi.fn();
    const lc = createLifecycle({
      ...createAppStubs(g, true).deps,
      onGameRecorded,
      versus: { onOver, onPause: () => {} },
    });
    lc.start({ seed: 5 });
    g.score = 9999;
    lc.handleGameOver('blockout');
    vi.advanceTimersByTime(1000);
    expect(onOver).toHaveBeenCalled();
    expect(onGameRecorded).not.toHaveBeenCalled();
    expect(data.get('fn_scores')).toBeUndefined();
    expect((JSON.parse(data.get('fn_meta') ?? '{}') as { best?: number }).best ?? 0).toBe(0);
  });
});
