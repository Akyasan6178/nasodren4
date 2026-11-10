/* =====================================================================
   NS4-44 · VİRÜS AVI oturumu: menu | playing | paused | over geçişleri,
   ilk giriş öğreticisi, ses/titreşim/HUD bağlantıları, oyun sonu yerel
   kaydı (kural seti virus-avi-v1; global gönderim yok) ve oyun sonu ekranı.
   Klasik lifecycle'a dokunmaz; ortak ekranlar (mola, oyun sonu) kullanılır.
   Menüye çıkılan yarım oyun kaydedilmez (klasikle aynı, NS4-01 Not E).
   ===================================================================== */
import type * as PIXI from 'pixi.js';
import type { Sound } from '../audio/SoundManager';
import { track } from '../analytics/analytics';
import { HAPTIC, type Buzz } from '../haptics/haptics';
import { addLocalScore, loadLocalScoresFor } from '../leaderboard/localScores';
import { loadNickname, newGameId } from '../leaderboard/nickname';
import { meta } from '../storage/progress';
import type { AppState } from '../types/app';
import { clearSessionHud } from '../ui/hud';
import { popup } from '../ui/notifications';
import { renderStartBest, setTip, show } from '../ui/screens';
import { GAME_RULES, SCORE_LIMITS } from '../../supabase/functions/_shared/scoreRules.ts';
import { VIRUS_CFG } from './config';
import { VIRUS_TEXT } from './copy';
import { setMode, type VirusHud } from './hud';
import { renderVirusOver } from './over';
import type { VirusTutorial } from './tutorial';
import type { VirusGame, VirusOverReason } from './VirusGame';

export const VIRUS_RULESET = 'virus-avi-v1';
/** Oyun sonu sesi duyulduktan sonra menü müziği (sn) ve ekranın açılışı (ms); klasikle aynı. */
const OVER_MUSIC_DELAY = 1.6;
const OVER_SCREEN_MS = 950;

export interface VirusViewLike {
  readonly root: { visible: boolean };
  syncAll(): void;
  update(dt: number): void;
  resetFx(): void;
  onGameOver(): void;
}

export interface VirusSessionDeps {
  readonly app: PIXI.Application<HTMLCanvasElement>;
  readonly sound: Sound;
  readonly buzz: Buzz;
  readonly resetInput: () => void;
  readonly game: VirusGame;
  readonly view: VirusViewLike;
  readonly hud: VirusHud;
  readonly tutorial: VirusTutorial;
}

export interface VirusSession {
  getState(): AppState;
  start(opts?: { readonly forceTutorial?: boolean }): void;
  pause(): void;
  resume(): void;
  toMenu(): void;
  /** Ana döngü: yalnızca oynarken motor ilerler; görünüm ve HUD her karede. */
  update(dt: number): void;
  /** Öğretici bitti ya da atlandı: 1. bölüm temiz tahtada başlar. */
  onTutorialFinish(): void;
  readonly game: VirusGame;
  readonly view: VirusViewLike;
}

export function createVirusSession(deps: VirusSessionDeps): VirusSession {
  const { app, sound, buzz, resetInput, game, view, hud, tutorial } = deps;
  let state: AppState = 'menu';
  let gameId = newGameId();
  let recordedId: string | null = null;
  let levelStartMs = 0;

  game.on('move', () => sound.move());
  game.on('rotate', () => sound.rotate());
  game.on('harddrop', () => {
    sound.hard();
    buzz(HAPTIC.hard);
  });
  game.on('lock', () => {
    sound.lock();
    buzz(HAPTIC.lock);
  });
  game.on('clear', (e) => {
    if (e.viruses.length) sound.virusPop(e.chain);
    else sound.clear(1, 0);
    buzz(HAPTIC.clear(Math.min(4, e.chain)));
    for (const v of e.viruses) hud.react('flinch', v.type);
  });
  game.on('levelstart', (e) => {
    hud.react('back', 0);
    hud.reset();
    levelStartMs = game.elapsedMs;
    if (e.level > 1) popup(`${VIRUS_TEXT.level} ${e.level}`, undefined, 'cyc');
  });
  game.on('levelclear', (e) => {
    sound.level();
    const last = e.level >= VIRUS_CFG.maxLevel;
    popup(VIRUS_TEXT.levelClear, last ? VIRUS_TEXT.finalTitle : VIRUS_TEXT.nextLevel(e.level + 1), 'cyc');
    track('virus_level_clear', {
      level: e.level,
      dur_s: Math.round((game.elapsedMs - levelStartMs) / 1000),
      bonus: e.bonus,
    });
  });
  game.on('gameover', (e) => onGameOver(e.reason));

  function start(opts?: { readonly forceTutorial?: boolean }) {
    sound.unlock();
    clearSessionHud();
    if (opts?.forceTutorial) tutorial.restart();
    const tut = tutorial.shouldRun();
    setMode('virus');
    hud.reset();
    view.resetFx();
    gameId = newGameId();
    game.reset({ seed: (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0, tutorial: tut });
    view.syncAll();
    resetInput();
    app.ticker.start();
    state = 'playing';
    show(null);
    sound.setMusic('virus'); // NS4-44 ek: moda özel parça
    if (tut) tutorial.begin();
    else tutorial.end();
    track('virus_start', { tutorial: tut });
  }
  function onTutorialFinish() {
    if (state !== 'playing' && state !== 'paused') return;
    if (!game.tutorial) return;
    game.startLevel(1);
    view.syncAll();
  }
  function pause() {
    if (state !== 'playing') return;
    state = 'paused';
    requestAnimationFrame(() => {
      if (state === 'paused') app.ticker.stop();
    });
    resetInput();
    setTip('tip-pause');
    show('scr-pause');
    sound.setMusic('menu');
    tutorial.onPause();
  }
  function resume() {
    if (state !== 'paused') return;
    app.ticker.start();
    state = 'playing';
    show(null);
    sound.setMusic('virus'); // NS4-44 ek: moda özel parça
    tutorial.onResume();
  }
  function toMenu() {
    app.ticker.start();
    state = 'menu';
    game.state = 'idle';
    game.softDrop = false;
    tutorial.end();
    clearSessionHud();
    setMode('classic');
    setTip('tip-start');
    renderStartBest(meta.best);
    show('scr-start');
    sound.setMusic('menu');
  }
  function record(): { best: number; isBest: boolean } {
    const before = loadLocalScoresFor(VIRUS_RULESET)[0]?.score ?? 0;
    const score = Math.min(game.score, SCORE_LIMITS.maxScore);
    if (recordedId !== gameId) {
      recordedId = gameId;
      addLocalScore({
        id: gameId,
        nickname: loadNickname(),
        score,
        lines: Math.min(game.virusesCleared, SCORE_LIMITS.maxLines),
        level: Math.max(1, Math.min(game.level, GAME_RULES.maxLevel)),
        durationSeconds: Math.max(1, Math.round(game.elapsedMs / 1000)),
        recordedAt: Date.now(),
        submitted: false,
        ruleset: VIRUS_RULESET,
      });
    }
    const isBest = score > before;
    return { best: Math.max(before, score), isBest };
  }
  function onGameOver(reason: VirusOverReason) {
    if (state !== 'playing' && state !== 'paused') return;
    state = 'over';
    // final zaferi yenilgi değildir: tahta soluklaşmaz (klasik final ile aynı)
    if (reason === 'complete') sound.level();
    else {
      view.onGameOver();
      sound.over();
      buzz(HAPTIC.over);
    }
    sound.setMusic('menu', OVER_MUSIC_DELAY);
    resetInput();
    tutorial.end();
    const { best, isBest } = record();
    track('virus_game_over', {
      reason,
      score: game.score,
      level: game.level,
      viruses: game.virusesCleared,
      dur_s: Math.round(game.elapsedMs / 1000),
    });
    const view_ = {
      score: game.score,
      level: Math.max(1, game.level),
      viruses: game.virusesCleared,
      best,
      isBest,
      reason,
    };
    setTimeout(() => {
      if (state === 'over') renderVirusOver(view_);
    }, OVER_SCREEN_MS);
  }

  return {
    getState: () => state,
    start,
    pause,
    resume,
    toMenu,
    update(dt) {
      if (state === 'playing') game.update(dt);
      view.update(dt);
      hud.sync(game, state === 'playing');
    },
    onTutorialFinish,
    game,
    view,
  };
}
