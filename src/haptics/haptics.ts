/* =====================================================================
   HAPTICS (navigator.vibrate: Android Chrome. iOS Safari desteklemez.)
   NS4-03: main.ts'ten taşındı. Ayar durumu dışarıdan verilir (DOM/ayar
   nesnesine doğrudan erişim yok); desenler değişmedi.
   ===================================================================== */
export const canVibrate = typeof navigator.vibrate === 'function';

/** Desen alanları salt-okunurdur (diziler navigator.vibrate'in beklediği VibratePattern tipindedir). */
export interface HapticPatterns {
  readonly lock: number;
  readonly hard: number;
  readonly clear: (n: number) => number[];
  readonly over: number[];
  readonly syn: number[];
  readonly cyc: number[];
}

export const HAPTIC: HapticPatterns = {
  lock: 12,
  hard: 24,
  clear: (n: number) =>
    n >= 4 ? [10, 30, 16, 26, 24, 22, 34, 18, 60] : n === 3 ? [10, 30, 18, 26, 36] : n === 2 ? [12, 30, 24] : [18],
  over: [70, 60, 140, 80, 260],
  syn: [40, 30, 40],
  cyc: [10, 40, 14, 40, 18, 40, 24, 40, 40],
};

export type Buzz = (p: VibratePattern) => void;

/** `isEnabled` her çağrıda okunur (ayar panelindeki değişiklik anında geçerli olur). */
export function createBuzz(isEnabled: () => boolean, supported: boolean = canVibrate): Buzz {
  return function buzz(p) {
    if (isEnabled() && supported) {
      try {
        navigator.vibrate(p);
      } catch {
        /* bilinçli: desteklenmeyen/engelli titreşim yok sayılır */
      }
    }
  };
}
