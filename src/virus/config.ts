/* =====================================================================
   NS4-44 · VİRÜS AVI ayarları (spec §9 başlangıç değerleri; oyun
   denemesinden sonra kullanıcıyla birlikte ayarlanacak).
   ===================================================================== */

export const VIRUS_CFG = {
  /** Son bölüm (yerel skor doğrulaması GAME_RULES.maxLevel = 20 ile uyumlu). */
  maxLevel: 20,
  /** Zincir çarpanı: 1., 2., 3., 4.+ zincir. */
  chainMult: [1, 2, 4, 8],
  virusPts: 100,
  levelBonus: 500,
  /** Bölüm sonunda kalan her tam saniye için (× bölüm). */
  timeBonus: 10,
  /** Son 15 sn: süre uyarısı ve lensteki virüsler kıs kıs güler. */
  warnMs: 15_000,
  /** Silinen hücrelerin görünür kalma süresi, düşme adımı, bölüm geçişi (ms). */
  clearMs: 300,
  fallStepMs: 60,
  levelClearMs: 1600,
  /** Öğretici tahtasının düşme aralığı (süre yok). */
  tutorialGravityMs: 1000,
} as const;

export interface LevelParams {
  readonly count: number;
  readonly maxHeight: number;
  readonly timeMs: number;
  readonly gravityMs: number;
}

/** Bölüm başına virüs sayısı, yerleşim yüksekliği (sıra), süre ve düşme aralığı. */
export function levelParams(level: number): LevelParams {
  const l = Math.max(1, Math.min(VIRUS_CFG.maxLevel, Math.floor(level)));
  const count = Math.min(6 + 4 * (l - 1), 60);
  return {
    count,
    maxHeight: Math.min(8 + Math.floor(l / 2), 13),
    timeMs: Math.min(45 + 5 * count, 300) * 1000,
    gravityMs: Math.max(120, Math.round(800 * Math.pow(0.92, l - 1))),
  };
}
