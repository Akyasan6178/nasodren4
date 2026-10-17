// Game olay adları ve payload tipleri (NS4-02'de tanımlandı, NS4-03'te paylaşılan tip dosyasına taşındı).
// Olay adları ve payload alanları çalışma davranışının parçasıdır; değiştirilmemelidir.

/** Temizleme/drenaj işlemi: 'lines' (satır), 'cyc' (sıklamen), 'syn' (sentetik açıcı). */
export type Pending = { kind: string; rows: number[] };

export type ScoredEvent = { n: number; tspin: number; b2b: boolean; combo: number; pts: number };
export type PowerDoneEvent = { kind: string; n: number; rebound?: boolean };

export type GameEvents = {
  spawn: undefined; move: undefined; rotate: undefined; hold: undefined; garbage: undefined;
  lock: number[]; harddrop: number; levelup: number; gameover: string;
  clearstart: Pending; clearend: Pending;
  scored: ScoredEvent;
  powerdone: PowerDoneEvent;
};
