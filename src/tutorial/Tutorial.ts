/* =====================================================================
   İLK OYUN ÖĞRETİCİSİ: durum makinesi (NS4-12)
   Oyunu değiştirmez: yalnızca Game olaylarını dinler (move, rotate,
   harddrop, hold, scored) ve input katmanından yavaş indirme bildirimini
   alır. Yerçekimi, skor, kontroller ve tahta olağan biçimde çalışır.
   Görünüm ve kalıcılık dışarıdan verilir (DOM / localStorage bilmez).
   ===================================================================== */
import type { Game } from '../game/Game';
import { PIECE } from '../game/pieces';
import { ROTATE_O_NOTE, TUTORIAL_STEPS, type InputMode, type TutorialStep } from './steps';

export interface TutorialView {
  /** `note`: adıma ek kısa durum notu (ör. kare blok dönmez). */
  show(step: TutorialStep, index: number, total: number, mode: InputMode, note?: string): void;
  hide(): void;
}

export interface TutorialStore {
  isDone(): boolean;
  markDone(): void;
}

export interface TutorialOptions {
  readonly mode: InputMode;
  /** Bütün adımlar tamamlandığında (atlamada çağrılmaz). */
  readonly onComplete?: () => void;
}

export class Tutorial {
  /** Sıradaki adım; oturum boyunca korunur (yarım bırakılan öğretici yeni oyunda buradan sürer). */
  private index = 0;
  private active = false;
  /** "Öğreticiyi yeniden başlat": tamamlanmış olsa da sonraki oyunda gösterilir. */
  private forced = false;
  private mode: InputMode;

  constructor(
    private readonly game: Game,
    private readonly view: TutorialView,
    private readonly store: TutorialStore,
    private readonly opts: TutorialOptions,
  ) {
    this.mode = opts.mode;
    game.on('move', () => this.did('move'));
    // döndürme adımındaki kare blok notu yeni blokla güncellenir
    game.on('spawn', () => {
      if (this.step === 'rotate') this.render();
    });
    game.on('rotate', () => this.did('rotate'));
    game.on('harddrop', () => this.did('hard'));
    game.on('hold', () => this.did('hold'));
    game.on('scored', (e) => {
      if (e.n > 0) this.did('clear');
    });
  }

  /** Görünen adım (öğretici kapalıysa null). */
  get step(): TutorialStep | null {
    return this.active ? (TUTORIAL_STEPS[this.index] ?? null) : null;
  }
  get inputMode(): InputMode {
    return this.mode;
  }

  /** Yeni oyun başladı: ilk oyunda veya yeniden başlatma isteğinde açılır. */
  onGameStart(): void {
    if (this.forced || !this.store.isDone()) {
      this.forced = false;
      this.active = true;
      this.render();
    } else {
      this.active = false;
      this.view.hide();
    }
  }
  /** Pause: kart gizlenir, adım korunur. */
  onPause(): void {
    this.view.hide();
  }
  /** Resume: aynı adımdan devam. */
  onResume(): void {
    if (this.active) this.render();
  }
  /** Ana menüye dönüş veya oyun sonu: kart kapanır; yarım öğretici tamamlanmış sayılmaz. */
  onSessionEnd(): void {
    this.active = false;
    this.view.hide();
  }

  /** Input katmanı yavaş indirme yaptığında bildirir (tuş basılı / aşağı sürükleme). */
  softDrop(): void {
    this.did('soft');
  }
  /** Son kullanılan giriş tipine göre anlatımı günceller. */
  setMode(mode: InputMode): void {
    if (mode === this.mode) return;
    this.mode = mode;
    if (this.active) this.render();
  }
  /** "Atla": öğretici kapanır ve bir daha otomatik açılmaz. */
  skip(): void {
    this.active = false;
    this.index = 0;
    this.store.markDone();
    this.view.hide();
  }
  /** Son adımdaki "Tamam" (satır temizlemeyi beklemeden bitirir). */
  acknowledge(): void {
    if (this.step === 'clear') this.complete();
  }
  /** "Öğreticiyi yeniden başlat": baştan ve sonraki oyunda gösterilir. */
  restart(): void {
    this.forced = true;
    this.index = 0;
  }

  private did(step: TutorialStep): void {
    if (this.step !== step) return; // yanlış eylem adımı ilerletmez
    this.index++;
    if (this.index >= TUTORIAL_STEPS.length) this.complete();
    else this.render();
  }
  private complete(): void {
    this.active = false;
    this.index = 0;
    this.store.markDone();
    this.view.hide();
    this.opts.onComplete?.();
  }
  private render(): void {
    const step = TUTORIAL_STEPS[this.index];
    if (!step) return;
    const note = step === 'rotate' && this.game.type === PIECE.O ? ROTATE_O_NOTE : undefined;
    this.view.show(step, this.index, TUTORIAL_STEPS.length, this.mode, note);
  }
}
