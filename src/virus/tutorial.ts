/* =====================================================================
   NS4-44 · VİRÜS AVI öğreticisi (Doktor Elif). Yalnızca modu ilk kez
   oynayana açılır; tamamlama ya da Atla kalıcı "görüldü" sayar
   (fn_virus_tutorial = {"done":true}). "Nasıl oynanır"dan restart().
   Adımlar oyuncunun gerçek eylemiyle geçilir; selam ve lens "Devam" ister.
   Oyunu durdurmaz; tahta öğretici tahtasıdır (VirusGame bölüm 0).
   ===================================================================== */
import { store } from '../storage/store';
import { isTutorialRecordDone } from '../storage/tutorial';
import type { InputMode } from '../tutorial/steps';
import { VIRUS_TUT_CHEER, VIRUS_TUT_COPY } from './copy';
import type { ElifPose } from './elif';
import type { VirusEvents } from './VirusGame';

export { VIRUS_TUT_COPY } from './copy';

export const VIRUS_TUT_STEPS = ['selam', 'kapsul', 'dortlu', 'virus', 'lens'] as const;
export type VirusTutStep = (typeof VIRUS_TUT_STEPS)[number];
export const VIRUS_TUTORIAL_KEY = 'virus_tutorial';
/** Alkıştan sonra lens adımına geçiş (ms). */
export const CHEER_MS = 1200;

const POSE: Readonly<Record<VirusTutStep, ElifPose>> = {
  selam: 'selam',
  kapsul: 'goster',
  dortlu: 'goster',
  virus: 'goster',
  lens: 'goster',
};

export interface VirusTutorialStore {
  isDone(): boolean;
  markDone(): void;
}
/** Kayıt yok, bozuk ya da depo kapalıysa "görülmedi" sayılır; oyun çökmez. */
export const virusTutorialStore: VirusTutorialStore = {
  isDone: () => {
    try {
      return isTutorialRecordDone(store.get(VIRUS_TUTORIAL_KEY, null));
    } catch {
      return false;
    }
  },
  markDone: () => {
    try {
      store.set(VIRUS_TUTORIAL_KEY, { done: true });
    } catch {
      /* bilinçli: depo kapalıysa bu oturumda yine kapanır */
    }
  },
};

export interface VirusTutShow {
  readonly step: VirusTutStep;
  readonly index: number;
  readonly total: number;
  readonly pose: ElifPose;
  readonly text: string;
  /** "Devam" butonu görünsün mü. */
  readonly next: boolean;
}
export interface VirusTutorialView {
  show(s: VirusTutShow): void;
  hide(): void;
}
export interface VirusTutorialOptions {
  readonly mode: InputMode;
  /** Tamamlandı ya da atlandı: oturum 1. bölümü başlatır. */
  readonly onFinish: () => void;
  readonly track?: (action: 'started' | 'step' | 'completed' | 'skipped', step: number) => void;
}
interface EventSource {
  on<K extends keyof VirusEvents>(name: K, fn: (e: VirusEvents[K]) => void): void;
}

export class VirusTutorial {
  private index = 0;
  private active = false;
  private forced = false;
  private cheering = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private mode: InputMode;

  constructor(
    game: EventSource,
    private readonly view: VirusTutorialView,
    private readonly store: VirusTutorialStore,
    private readonly opts: VirusTutorialOptions,
  ) {
    this.mode = opts.mode;
    game.on('move', () => this.did('kapsul'));
    game.on('rotate', () => this.did('kapsul'));
    game.on('clear', (e) => {
      this.did('dortlu');
      if (this.step === 'virus' && e.viruses.length > 0 && !this.cheering) this.cheer();
    });
  }

  get step(): VirusTutStep | null {
    return this.active ? (VIRUS_TUT_STEPS[this.index] ?? null) : null;
  }
  get isActive(): boolean {
    return this.active;
  }
  shouldRun(): boolean {
    return this.forced || !this.store.isDone();
  }
  begin(): void {
    this.forced = false;
    this.active = true;
    this.index = 0;
    this.cheering = false;
    this.opts.track?.('started', 1);
    this.render();
  }
  /** "Devam" (selam ve lens adımları). */
  next(): void {
    const s = this.step;
    if (s === 'selam') this.advance();
    else if (s === 'lens') this.complete();
  }
  skip(): void {
    if (!this.active) return;
    this.opts.track?.('skipped', this.index + 1);
    this.store.markDone();
    this.finish();
  }
  restart(): void {
    this.forced = true;
  }
  setMode(m: InputMode): void {
    if (m === this.mode) return;
    this.mode = m;
    if (this.active && !this.cheering) this.render();
  }
  onPause(): void {
    this.view.hide();
  }
  onResume(): void {
    if (this.active) this.render();
  }
  /** Menüye dönüş / oyun sonu: kart kapanır, kayıt yazılmaz. */
  end(): void {
    clearTimeout(this.timer);
    this.active = false;
    this.cheering = false;
    this.view.hide();
  }

  private did(step: VirusTutStep): void {
    if (this.step === step) this.advance();
  }
  private advance(): void {
    this.opts.track?.('step', this.index + 1);
    this.index++;
    this.render();
  }
  private cheer(): void {
    this.cheering = true;
    this.view.show({
      step: 'virus',
      index: this.index,
      total: VIRUS_TUT_STEPS.length,
      pose: 'alkis',
      text: VIRUS_TUT_CHEER,
      next: false,
    });
    this.timer = setTimeout(() => {
      this.cheering = false;
      if (this.step === 'virus') this.advance();
    }, CHEER_MS);
  }
  private complete(): void {
    this.opts.track?.('completed', this.index + 1);
    this.store.markDone();
    this.finish();
  }
  private finish(): void {
    clearTimeout(this.timer);
    this.active = false;
    this.cheering = false;
    this.index = 0;
    this.view.hide();
    this.opts.onFinish();
  }
  private render(): void {
    const step = this.step;
    if (!step) return;
    if (this.cheering) return;
    this.view.show({
      step,
      index: this.index,
      total: VIRUS_TUT_STEPS.length,
      pose: POSE[step],
      text: VIRUS_TUT_COPY[step][this.mode],
      next: step === 'selam' || step === 'lens',
    });
  }
}
