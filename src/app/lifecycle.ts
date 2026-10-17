/* =====================================================================
   LIFECYCLE: uygulama durumu (menu | playing | paused | over) ve geçişler
   start / pause / resume / toMenu / oyun sonu akışı. Oyun kuralı hesaplamaz;
   Game, View, Sound, input, UI, storage ve analitiği birbirine bağlar.
   NS4-03: main.ts'ten taşındı; adımların sırası değişmedi.
   ===================================================================== */
import type * as PIXI from 'pixi.js';
import type { Game } from '../game/Game';
import type { View } from '../rendering/GameView';
import type { Sound } from '../audio/SoundManager';
import type { AppState } from '../types/app';
import { HAPTIC, type Buzz } from '../haptics/haptics';
import { meta, saveMeta } from '../storage/progress';
import { track } from '../analytics/analytics';
import { resetHud, hideDanger, forgetDanger, resetSynLabel } from '../ui/hud';
import { award, resetNewBadges } from '../ui/badges';
import { setTip, show, renderGameOver } from '../ui/screens';

export interface LifecycleDeps {
  game: Game;
  view: View;
  sound: Sound;
  app: PIXI.Application<HTMLCanvasElement>;
  buzz: Buzz;
  /** Input durumunu sıfırlar (InputController.reset). */
  resetInput: () => void;
}

export type Lifecycle = ReturnType<typeof createLifecycle>;

export function createLifecycle({ game, view, sound, app, buzz, resetInput }: LifecycleDeps) {
  let appState: AppState = 'menu';

  function start() {
    sound.unlock();
    game.reset(); resetHud(); resetNewBadges();
    view.overT = -1; view.anim = null; view.wave && (view.wave.visible = false);
    for (const f of view.flashes) f.visible = false;
    view.syncAll();
    resetSynLabel();
    resetInput();
    appState = 'playing'; show(null);
    sound.setMusic(true);
    track('game_start', { best: meta.best });
  }
  function pause() { if (appState !== 'playing') return; appState = 'paused'; requestAnimationFrame(() => { if (appState === 'paused') app.ticker.stop(); }); resetInput(); setTip('tip-pause'); show('scr-pause'); sound.setMusic(false); hideDanger(); forgetDanger(); }
  function resume() { if (appState !== 'paused') return; app.ticker.start(); appState = 'playing'; show(null); sound.setMusic(true); }
  function toMenu() { app.ticker.start(); appState = 'menu'; setTip('tip-start'); show('scr-start'); sound.setMusic(false); hideDanger(); }
  function showOver(isBest: boolean) {
    renderGameOver({ score: game.score, lines: game.lines, best: meta.best, isBest });
  }

  /**
   * Game 'gameover' olayı: skor bu noktada kesinleşir. Yerel ilerleme ve analitik burada yazılır.
   * Gelecekteki global skor gönderimi de buraya (yerel kayıttan sonra, Game'in dışında) bağlanmalıdır.
   * Not: Ana menüye çıkılan yarım oyun için bu akış çalışmaz (NS4-01 Not E, bilerek korunur).
   */
  function handleGameOver(reason: string) {
    view.onGameOver(); sound.over(); buzz(HAPTIC.over); sound.setMusic(false);
    resetInput();
    appState = 'over'; hideDanger();
    meta.totalLines += game.lines;
    if (meta.totalLines >= 100) award('derin');
    const isBest = game.score > meta.best; if (isBest) meta.best = game.score;
    saveMeta();
    track('game_over', { reason, score: game.score, level: game.level, lines: game.lines, dur_s: Math.round(game.elapsed / 1000), cyc_used: game.cycUsed, syn_uses: game.synUses, tetrises: game.tetrises });
    setTimeout(() => showOver(isBest), 950);
  }

  return { getState: (): AppState => appState, start, pause, resume, toMenu, showOver, handleGameOver };
}
