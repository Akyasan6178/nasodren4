/* =====================================================================
   NS4-45 · ZORLAŞAN DALGALAR (docs/NS4-45-ZORLASAN-DALGALAR.md)
   Oyunda iki değişken baskı var ve ikisi de bölüm saatiyle artar:
   - Dalga (tek adımlar): yukarıdan tek kareler ve virüsler düşer.
   - Hızlanma (çift adımlar): parçalar biraz daha hızlı iner.
   Saat her bölümün (odanın) başında sıfırlanır; şiddet bölüm numarasıyla
   artar. Son bölümden sonraki Serbest nefes, son bölümün saatiyle sürer.
   NS4-46 (sanal oyuncu testi, P1): bölümler 1 dakikadan kısa sürdüğü için
   ilk adım 15. saniyede, sonra her 30 saniyede bir; satırdan gelen hız
   seviye 6'da durur, sonrası yalnızca saatten (asıl uzun bölüm Serbest
   nefes). Seviye (satırdan; puan ve sunucu doğrulaması) değişmez.
   Bütün ayarlar bu tablodadır.
   ===================================================================== */
import { CFG, ROOMS } from '../config/gameConfig';

export interface RoomPressure {
  /** İlk dalgadaki tek kare ve virüs sayısı. */
  readonly singles: number;
  readonly viruses: number;
  /** Bölüme girer girmez gelen hız payı (seviye karşılığı; kullanıcı testi 2026-11-12: 2-3. bölüm kolaydı). */
  readonly start: number;
  /** Her hızlanmada eklenen hız payı (seviye karşılığı; 1 = bir seviye hızlanma). */
  readonly speed: number;
}

export const PRESSURE = {
  /** Bölüm başına (ROOMS sırası; oda akışı kapalıyken 1. satır). Serbest nefes son satırı kullanır. */
  rooms: [
    { singles: 1, viruses: 1, start: 0, speed: 0.5 }, // 1. Sol burun (kasıtlı olarak hafif)
    { singles: 1, viruses: 1, start: 0.25, speed: 0.5 }, // 2. Sağ burun
    { singles: 2, viruses: 1, start: 0.5, speed: 0.5 }, // 3. Sol yanak
    { singles: 2, viruses: 1, start: 0.75, speed: 0.5 }, // 4. Sağ yanak
    { singles: 2, viruses: 1, start: 1, speed: 0.5 }, // 5. Sol gözler arası
    { singles: 3, viruses: 1, start: 1.25, speed: 0.5 }, // 6. Sağ gözler arası
    { singles: 3, viruses: 1, start: 1.5, speed: 0.5 }, // 7. Sol alın
    { singles: 3, viruses: 1, start: 1.5, speed: 0.5 }, // 8. Sağ alın (+ Serbest nefes)
  ],
  /** Bölümün ilk adımı (ms; bölüme girdikten sonra) ve sonraki adımlar arası (ms). */
  firstStepMs: 45_000,
  stepMs: 60_000,
  /** Her yeni dalgada tek kare +1; virüs her `virusEvery` dalgada +1. */
  singlesGrowth: 1,
  virusEvery: 2,
  /** Bir dalgada en çok tek kare ve virüs. */
  maxSingles: 10,
  maxViruses: 5,
  /** Satırdan gelen seviyenin yerçekimine katkısı bu seviyede durur (puan seviyesi artmaya devam eder). */
  lineSpeedCap: 6,
  /** Hız payıyla birlikte yerçekiminin en çok ulaşacağı seviye. */
  gravityCap: 14,
  /** Satır temizlemesinde silinen virüs başına ek puan (× seviye). */
  virusBonus: 100,
} as const satisfies {
  readonly rooms: readonly RoomPressure[];
  readonly firstStepMs: number;
  readonly stepMs: number;
  readonly singlesGrowth: number;
  readonly virusEvery: number;
  readonly maxSingles: number;
  readonly maxViruses: number;
  readonly lineSpeedCap: number;
  readonly gravityCap: number;
  readonly virusBonus: number;
};

/** Bölümün baskı satırı (Serbest nefes ve fazlası son satır). */
export function roomPressure(room: number): RoomPressure {
  const r = PRESSURE.rooms;
  return r[Math.max(0, Math.min(room, r.length - 1))] ?? r[0];
}

/** Bölüm saatinin `step`. adımı (1'den): tek adımlar dalga, çift adımlar hızlanma. */
export function stepKind(step: number): 'wave' | 'speed' {
  return step % 2 === 1 ? 'wave' : 'speed';
}

/** `wave`. dalganın (1'den) tek kare ve virüs sayısı. */
export function waveSize(room: number, wave: number): { readonly singles: number; readonly viruses: number } {
  const p = roomPressure(room),
    w = Math.max(1, wave) - 1;
  return {
    singles: Math.min(PRESSURE.maxSingles, p.singles + w * PRESSURE.singlesGrowth),
    viruses: Math.min(PRESSURE.maxViruses, p.viruses + Math.floor(w / PRESSURE.virusEvery)),
  };
}

/** Bölüm başı hız payı + `steps` hızlanmadan sonraki pay (seviye karşılığı). */
export function speedBoost(room: number, steps: number): number {
  const p = roomPressure(room);
  return p.start + p.speed * Math.max(0, steps);
}

/**
 * Yerçekiminin kullandığı (kesirli) seviye: min(seviye, lineSpeedCap) + hız payı; en çok gravityCap. Seviye 6'nın
 * üstündeki oyuncu klasik eğriden daha yavaş iner: hızlanma bundan sonra yalnızca bölüm saatinden gelir (NS4-46).
 */
export function gravityLevel(level: number, boost: number): number {
  const lv = Math.min(level, PRESSURE.lineSpeedCap, CFG.maxLevel);
  return Math.min(PRESSURE.gravityCap, lv + Math.max(0, boost));
}

/** NS4-46: bölüm saatinin `steps` adım atılmışken sıradaki adımın süresi (ms). */
export function stepDuration(steps: number): number {
  return steps === 0 ? PRESSURE.firstStepMs : PRESSURE.stepMs;
}

/** Bölüm saati yeni odada sıfırlanır mı (Serbest nefese geçişte saat sürer). */
export const resetsClock = (room: number): boolean => room < ROOMS.length;
