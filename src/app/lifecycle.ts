/* =====================================================================
   LIFECYCLE: uygulama durumu (menu | playing | paused | over) ve geçişler
   start / pause / resume / toMenu / oyun sonu akışı. Oyun kuralı hesaplamaz;
   Game, View, Sound, input, UI, storage ve analitiği birbirine bağlar.
   NS4-03: main.ts'ten taşındı.
   NS4-09: iki mod. Macera: sinüs haritası bölümleri (bölüm sonu yıldız +
   bilgi kartı, başarısızlıkta "tekrar dene"). Serbest: önceki sonsuz oyun
   (game_start / game_over analitiği yalnızca burada, sözleşme değişmedi).
   ===================================================================== */
import type * as PIXI from 'pixi.js';
import type { Game } from '../game/Game';
import type { View } from '../rendering/GameView';
import type { Sound } from '../audio/SoundManager';
import type { AppState } from '../types/app';
import type { CardId } from '../types/content';
import type { GameMode, GameOverReason } from '../types/game';
import type { StageResult } from '../types/events';
import { STAGES } from '../content/stages';
import { HAPTIC, type Buzz } from '../haptics/haptics';
import { meta, saveMeta } from '../storage/progress';
import { track } from '../analytics/analytics';
import { hideDanger, forgetDanger, clearSessionHud, setHudMode } from '../ui/hud';
import { award, resetNewBadges } from '../ui/badges';
import { unlockCard } from '../ui/cards';
import { react, say } from '../ui/hero';
import { popup } from '../ui/notifications';
import { setTip, show, renderGameOver, renderWin, renderStartMenu, stageLabel, clearScreenStack } from '../ui/screens';

export interface LifecycleDeps {
  game: Game;
  view: View;
  sound: Sound;
  app: PIXI.Application<HTMLCanvasElement>;
  buzz: Buzz;
  /** Input durumunu sıfırlar (InputController.reset). */
  resetInput: () => void;
}

export interface Lifecycle {
  readonly getState: () => AppState;
  /** Oynanan bölüm (0 tabanlı; serbest oyunda son seçilen). */
  readonly getStage: () => number;
  /** mode 'adventure' ise `stage` (0 tabanlı bölüm sırası) oynanır. */
  readonly start: (mode?: GameMode, stage?: number) => void;
  /** Aynı modu (ve bölümü) yeniden başlatır. */
  readonly restart: () => void;
  /** Bölüm sonundan sonraki bölüme geçer (son bölümdeyse false döner). */
  readonly nextStage: () => boolean;
  readonly pause: () => void;
  readonly resume: () => void;
  readonly toMenu: () => void;
  readonly showOver: (isBest: boolean) => void;
  readonly handleGameOver: (reason: GameOverReason) => void;
  readonly handleStageComplete: (r: StageResult) => void;
  /** Oyun sırasında açılan kartı kaydeder (oyun sonu ekranında gösterilir). */
  readonly noteCard: (id: CardId) => void;
}

export function createLifecycle({ game, view, sound, app, buzz, resetInput }: LifecycleDeps): Lifecycle {
  let appState: AppState = 'menu';
  let mode: GameMode = 'endless';
  let stage = 0;
  /** Bu oturumda bölüm başına deneme sayısı (analitik). */
  const attempts = new Map<number, number>();
  /** Bu oyunda açılan ilk yeni kart. */
  let sessionCard: CardId | null = null;

  function start(m: GameMode = 'endless', s = 0) {
    mode = m;
    stage = Math.max(0, Math.min(STAGES.length - 1, s));
    const def = STAGES[stage];
    sound.unlock();
    game.reset(mode === 'adventure' ? { mode, stage: def.rules } : { mode });
    clearSessionHud(); // NS4-07: önceki oturumdan kalan rozet/toast/popup temizlenir
    resetNewBadges();
    view.resetFx();
    view.syncAll();
    resetInput();
    sessionCard = null;
    appState = 'playing';
    clearScreenStack();
    show(null);
    sound.setMusic(true);
    if (mode === 'adventure') {
      setHudMode(stageLabel(stage));
      const a = (attempts.get(stage) ?? 0) + 1;
      attempts.set(stage, a);
      track('stage_start', { stage: stage + 1, attempt: a });
      popup(stageLabel(stage), 'Tıkanıklığı temizle!', 'cyc');
      say(a > 1 ? 'Tekrar deneyelim, bu sefer olacak!' : def.intro, a > 1 ? 2600 : 6000);
    } else {
      setHudMode(null);
      track('game_start', { best: meta.best });
      say('Serbest oyun! Sıraları doldur, ne kadar dayanabileceğini görelim.', 3600);
    }
    react('happy', 1500);
  }
  function restart() {
    start(mode, stage);
  }
  function nextStage() {
    if (stage >= STAGES.length - 1) return false;
    start('adventure', stage + 1);
    return true;
  }
  function pause() {
    if (appState !== 'playing') return;
    appState = 'paused';
    requestAnimationFrame(() => {
      if (appState === 'paused') app.ticker.stop();
    });
    resetInput();
    setTip('tip-pause');
    show('scr-pause');
    sound.setMusic(false);
    hideDanger();
    forgetDanger();
  }
  function resume() {
    if (appState !== 'paused') return;
    app.ticker.start();
    appState = 'playing';
    show(null);
    sound.setMusic(true);
  }
  function toMenu() {
    app.ticker.start();
    appState = 'menu';
    setTip('tip-start');
    renderStartMenu();
    clearScreenStack();
    show('scr-start');
    sound.setMusic(false);
    // NS4-07: yarım oyunun geçici HUD durumu menüde kalmaz (skor bilerek kaydedilmez, NS4-01 Not E)
    clearSessionHud();
  }
  function showOver(isBest: boolean) {
    renderGameOver({
      score: game.score,
      lines: game.lines,
      best: meta.best,
      isBest,
      progress: mode === 'adventure' ? game.progress() : null,
      card: sessionCard,
    });
  }
  function noteCard(id: CardId) {
    sessionCard ??= id;
  }

  /** Oyun sonu ve bölüm sonu için ortak kapanış. */
  function endSession() {
    sound.setMusic(false);
    resetInput();
    appState = 'over';
    hideDanger();
  }

  /**
   * Game 'gameover' olayı: skor bu noktada kesinleşir. Yerel ilerleme ve analitik burada yazılır.
   * Gelecekteki global skor gönderimi de buraya (yerel kayıttan sonra, Game'in dışında) bağlanmalıdır.
   * Not: Ana menüye çıkılan yarım oyun için bu akış çalışmaz (NS4-01 Not E, bilerek korunur).
   */
  function handleGameOver(reason: GameOverReason) {
    view.onGameOver();
    sound.over();
    buzz(HAPTIC.over);
    endSession();
    react('sad', 4000);
    meta.totalLines += game.lines;
    if (meta.totalLines >= 100) award('derin');
    const dur_s = Math.round(game.elapsed / 1000);
    let isBest = false;
    if (mode === 'adventure') {
      saveMeta();
      track('stage_fail', {
        stage: stage + 1,
        reason,
        pieces: game.pieces,
        progress: +game.progress().toFixed(2),
        dur_s,
      });
    } else {
      isBest = game.score > meta.best;
      if (isBest) meta.best = game.score;
      saveMeta();
      track('game_over', {
        reason,
        score: game.score,
        level: game.level,
        lines: game.lines,
        dur_s,
        cyc_used: game.cycUses > 0,
        syn_uses: game.synUses,
        tetrises: game.tetrises,
      });
    }
    setTimeout(() => showOver(isBest), 950);
  }

  /** NS4-09: bölümün bütün tıkacı temizlendi: yıldızlar ve kart kaydedilir, ostium açılır. */
  function handleStageComplete(r: StageResult) {
    view.onWin();
    sound.win();
    buzz(HAPTIC.cyc);
    endSession();
    react('cheer', 6000);
    say('Başardık! Sinüs ferahladı.', 2400);
    meta.totalLines += game.lines;
    if (meta.totalLines >= 100) award('derin');
    const stars = (meta.stages ??= STAGES.map(() => 0));
    stars[stage] = Math.max(stars[stage] ?? 0, r.stars);
    const def = STAGES[stage];
    const isNew = unlockCard(def.card);
    saveMeta();
    track('stage_complete', {
      stage: stage + 1,
      stars: r.stars,
      pieces: r.pieces,
      score: r.score,
      dur_s: Math.round(game.elapsed / 1000),
    });
    const s = stage;
    setTimeout(
      () =>
        renderWin({
          stage: s,
          stars: r.stars,
          score: r.score,
          pieces: r.pieces,
          germs: r.germs,
          card: def.card,
          newCard: isNew,
          last: s >= STAGES.length - 1,
        }),
      1500,
    );
  }

  return {
    getState: () => appState,
    getStage: () => stage,
    start,
    restart,
    nextStage,
    pause,
    resume,
    toMenu,
    showOver,
    handleGameOver,
    handleStageComplete,
    noteCard,
  };
}
