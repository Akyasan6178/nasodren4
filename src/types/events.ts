// Game olay adları ve payload tipleri. Olay adları ve payload alanları çalışma davranışının
// parçasıdır; değiştirilmemelidir. Payload'ı olmayan olaylar `void` ile işaretlenir.
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
}

export type GameEventName = keyof GameEvents;
/** Payload'ı olmayan olaylar argümansız emit edilir ve dinlenir. */
export type GameEventArgs<K extends GameEventName> = [GameEvents[K]] extends [void] ? [] : [payload: GameEvents[K]];
export type GameEventListener<K extends GameEventName> = (...args: GameEventArgs<K>) => void;
