/* =====================================================================
   NS4-44 · MOD YÖNLENDİRİCİ: klasik oyun (Lifecycle) ile Virüs Avı
   (VirusSession) arasında ortak düğmeler (Tekrar oyna, Ana menü, Devam),
   girişler (durum, mola, kontrol hedefi) ve Pixi kaplarının görünürlüğü.
   Klasik akış değişmez; yalnızca hangi oturumun çağrılacağı seçilir.
   ===================================================================== */
import type { Lifecycle } from '../app/lifecycle';
import type { Controls } from '../input/InputController';
import type { AppState } from '../types/app';
import { setMode, type GameMode } from './hud';
import type { VirusSession } from './session';

export interface ModeRouterDeps {
  readonly lifecycle: Pick<Lifecycle, 'getState' | 'start' | 'pause' | 'resume' | 'toMenu'>;
  readonly session: VirusSession;
  readonly classicGame: Controls;
  readonly classicView: { readonly root: { visible: boolean } };
  readonly virusView: { readonly root: { visible: boolean } };
}

export interface ModeRouter {
  mode(): GameMode;
  getState(): AppState;
  controls(): Controls;
  startClassic(): void;
  /** Yalnızca klasik moda geçer (çok oyunculu tur lifecycle.start'ı kendisi çağırır). */
  prepareClassic(): void;
  startVirus(opts?: { readonly forceTutorial?: boolean }): void;
  /** "Tekrar oyna": son oynanan mod. */
  again(): void;
  toMenu(): void;
  pause(): void;
  resume(): void;
}

export function createModeRouter(d: ModeRouterDeps): ModeRouter {
  let mode: GameMode = 'classic';
  const apply = (m: GameMode) => {
    mode = m;
    setMode(m);
    d.classicView.root.visible = m === 'classic';
    d.virusView.root.visible = m === 'virus';
  };
  const startClassic = () => {
    apply('classic');
    d.lifecycle.start();
  };
  const startVirus = (opts?: { readonly forceTutorial?: boolean }) => {
    apply('virus');
    d.session.start(opts);
  };
  return {
    mode: () => mode,
    getState: () => (mode === 'virus' ? d.session.getState() : d.lifecycle.getState()),
    controls: () => (mode === 'virus' ? d.session.game : d.classicGame),
    startClassic,
    prepareClassic: () => apply('classic'),
    startVirus,
    again: () => (mode === 'virus' ? startVirus() : startClassic()),
    toMenu: () => (mode === 'virus' ? d.session.toMenu() : d.lifecycle.toMenu()),
    pause: () => (mode === 'virus' ? d.session.pause() : d.lifecycle.pause()),
    resume: () => (mode === 'virus' ? d.session.resume() : d.lifecycle.resume()),
  };
}
