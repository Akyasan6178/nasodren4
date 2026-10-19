// Game olay adları ve payload tipleri. Olay adları ve payload alanları çalışma davranışının
// parçasıdır; değiştirilmemelidir. Payload'ı olmayan olaylar `void` ile işaretlenir.
// NS4-09: germs, cycready ve stagecomplete olayları eklendi (mevcut olaylar değişmedi).
import type { GameOverReason, PendingClearKind, TSpinKind } from './game';

/** Temizleme/drenaj işlemi (satırlar küçükten büyüğe sıralı tahta satır indeksleri). */
export interface PendingClear {
  readonly kind: PendingClearKind;
  readonly rows: readonly number[];
}

export interface ScoredEvent {
  readonly n: number;
  readonly tspin: TSpinKind;
  readonly b2b: boolean;
  readonly combo: number;
  readonly pts: number;
}

export type PowerDoneEvent =
  | { readonly kind: 'cyc'; readonly n: number }
  | { readonly kind: 'syn'; readonly n: number; readonly rebound: boolean };

/** Bölüm tamamlandı. */
export interface StageResult {
  readonly stars: 1 | 2 | 3;
  /** Kullanılan parça sayısı. */
  readonly pieces: number;
  readonly score: number;
  readonly germs: number;
}

export interface GameEvents {
  spawn: void;
  move: void;
  rotate: void;
  hold: void;
  garbage: void;
  /** Kilitlenen 4 hücrenin tahta indeksleri. */
  lock: readonly number[];
  /** Hard drop mesafesi (satır). */
  harddrop: number;
  levelup: number;
  gameover: GameOverReason;
  clearstart: PendingClear;
  clearend: PendingClear;
  scored: ScoredEvent;
  powerdone: PowerDoneEvent;
  /** Temizlenen satırlardaki mikrop sayısı (satır temizleme veya güç). */
  germs: number;
  /** Sıklamen gücünün şarjı doldu. */
  cycready: void;
  stagecomplete: StageResult;
}

export type GameEventName = keyof GameEvents;
/** Payload'ı olmayan olaylar argümansız emit edilir ve dinlenir. */
export type GameEventArgs<K extends GameEventName> = [GameEvents[K]] extends [void] ? [] : [payload: GameEvents[K]];
export type GameEventListener<K extends GameEventName> = (...args: GameEventArgs<K>) => void;
