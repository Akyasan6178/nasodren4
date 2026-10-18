/* =====================================================================
   BOOT: sistemleri oluşturur ve bağlar. Başlatma sırası NS4-01/NS4-02
   referansıyla aynıdır:
   Game → Sound → Pixi Application → canvas → View → resize dinleyicileri →
   lifecycle + olay bağlantıları → input → ipuçları/ekranlar → butonlar/CTA →
   ayarlar → ana döngü → ilk ipucu → doLayout → fontlar hazır olunca yeniden layout.
   ===================================================================== */
import * as PIXI from 'pixi.js';
import type { Layout } from '../types/layout';
import { Game } from '../game/Game';
import { View } from '../rendering/GameView';
import { computeLayout } from '../rendering/layout';
import { Sound } from '../audio/SoundManager';
import { InputController } from '../input/InputController';
import { canVibrate, createBuzz } from '../haptics/haptics';
import { settings, saveSettings } from '../storage/settings';
import { track } from '../analytics/analytics';
import { ctaUrl } from '../analytics/cta';
import { $ } from '../ui/dom';
import { updateHud, applyHudLayout } from '../ui/hud';
import { initTips, setTip, openSub, bindBackButtons, closeSub, initScreens } from '../ui/screens';
import { bindSettingsPanel } from '../ui/settingsPanel';
import { createLifecycle } from './lifecycle';
import { wireGameEvents } from './events';

export function bootstrap(): void {
  const stageEl = $('stage');
  const game = new Game();
  const sound = new Sound(settings);
  // haptik: ayar her çağrıda okunur
  const buzz = createBuzz(() => settings.haptics);

  const app = new PIXI.Application<HTMLCanvasElement>({
    backgroundAlpha: 0,
    antialias: false,
    autoDensity: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    powerPreference: 'high-performance',
    width: stageEl.clientWidth,
    height: stageEl.clientHeight,
  });
  stageEl.appendChild(app.view);
  // Not: ticker.maxFPS bilerek ayarlanmıyor; Pixi'nin kare atlama mantığı 60Hz ekranda
  // rAF jitter'ı yüzünden kare düşürebiliyor. Mantık zaman tabanlı, 120Hz'de de doğru çalışır.
  const view = new View(app, game, settings);
  let L: Layout | null = null;

  function doLayout() {
    const W = stageEl.clientWidth,
      H = stageEl.clientHeight;
    if (!W || !H) return;
    app.renderer.resize(W, H);
    L = computeLayout(W, H);
    applyHudLayout(L);
    view.layout(L);
    app.render();
  }
  let layoutQueued = false;
  function queueLayout() {
    if (layoutQueued) return;
    layoutQueued = true;
    requestAnimationFrame(() => {
      layoutQueued = false;
      doLayout();
    });
  }
  window.addEventListener('resize', queueLayout);
  if (window.ResizeObserver) new ResizeObserver(queueLayout).observe(stageEl);

  // input, lifecycle'dan sonra oluşturulur; lifecycle ona yalnızca çalışma anında (callback ile) erişir
  const lifecycle = createLifecycle({ game, view, sound, app, buzz, resetInput: () => input.reset() });
  wireGameEvents({ game, view, sound, buzz, lifecycle });

  const input = new InputController({
    game,
    canvas: app.view,
    settings,
    getState: lifecycle.getState,
    getCell: () => L!.cell, // pointer olayları yalnızca oynarken, ilk layout'tan sonra gelir
    pause: lifecycle.pause,
    resume: lifecycle.resume,
    closeSub,
    unlockAudio: () => sound.unlock(),
  });

  // ekranlar
  initTips();
  bindBackButtons();
  initScreens(); // NS4-10: başlangıç ekranı açıkken arka plan inert
  $('b-play').addEventListener('click', lifecycle.start);
  $('b-again').addEventListener('click', lifecycle.start);
  $('b-menu').addEventListener('click', lifecycle.toMenu);
  $('b-quit').addEventListener('click', lifecycle.toMenu);
  $('b-resume').addEventListener('click', lifecycle.resume);
  $('b-how').addEventListener('click', () => openSub('scr-how'));
  $('b-set1').addEventListener('click', () => openSub('scr-set'));
  $('b-set2').addEventListener('click', () => openSub('scr-set'));
  $('cta-over', HTMLAnchorElement).href = ctaUrl('game_over');
  $('cta-pause', HTMLAnchorElement).href = ctaUrl('pause_menu');
  $('cta-over').addEventListener('click', () => track('cta_click', { placement: 'game_over', score: game.score }));
  $('cta-pause').addEventListener('click', () => track('cta_click', { placement: 'pause_menu' }));

  // ayarlar
  bindSettingsPanel({ settings, save: saveSettings, onAudioChange: () => sound.applySettings(), canVibrate });

  /* ---- ana döngü ---- */
  let fpsAcc = 0,
    fpsFrames = 0,
    fpsWorst = 0;
  app.ticker.add(() => {
    const raw = app.ticker.deltaMS;
    const dt = Math.min(raw, 100); // sekme dönüşü gibi uzun boşluklarda patlama yok
    if (lifecycle.getState() === 'playing') {
      input.update(dt);
      game.update(dt);
    }
    view.update(dt);
    const appState = lifecycle.getState(); // game.update içinde 'over' olmuş olabilir; orijinaldeki gibi burada okunur
    if (appState === 'playing' || appState === 'over') updateHud(game, appState === 'playing');
    if (settings.fps) {
      fpsAcc += raw;
      fpsFrames++;
      if (raw > fpsWorst) fpsWorst = raw;
      if (fpsAcc >= 500) {
        $('fps').textContent = `${Math.round((fpsFrames * 1000) / fpsAcc)} fps · en kötü ${fpsWorst.toFixed(1)} ms`;
        fpsAcc = 0;
        fpsFrames = 0;
        fpsWorst = 0;
      }
    }
  });

  setTip('tip-start');
  // document.fonts eski tarayıcılarda yoktur (DOM tipleri her zaman var sayar). FontFaceSet varsa ready her zaman tanımlıdır.
  const fontSet: FontFaceSet | undefined = document.fonts;
  const fontsReady: Promise<unknown> = fontSet
    ? Promise.race([fontSet.ready, new Promise((r) => setTimeout(r, 1200))])
    : Promise.resolve();
  doLayout();
  // Sonuç beklenmez (orijinal davranış); hazır olunca layout yeniden hesaplanır. Bu promise reddedilmez.
  void fontsReady.then(queueLayout);
  // hata ayıklama (yalnızca development; production build'de global debug erişimi yok)
  if (import.meta.env.DEV) {
    window.__fn = { game, view, app };
  }
}
