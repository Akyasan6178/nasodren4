/* =====================================================================
   CONFIG: tahta boyutları ve oyun ayarları
   NS4-03: main.ts'ten taşındı; değerler değişmedi. NS4-04: `as const` +
   `satisfies GameConfig` şemayı derleme zamanında denetler (çalışma anı
   nesnesi aynı; salt-okunurluk yalnızca tip düzeyindedir).
   ===================================================================== */
export const COLS = 10,
  ROWS = 22,
  HIDDEN = 2,
  VIS = 20;

export interface GameConfig {
  /** Kilitlenme gecikmesi (ms) ve en fazla hareket sıfırlaması. */
  readonly lockDelay: number;
  readonly maxLockResets: number;
  /** Temizleme animasyon süreleri (ms). */
  readonly lineClearMs: number;
  readonly synClearMs: number;
  readonly drainMs: number;
  readonly softDropFactor: number;
  readonly maxLevel: number;
  readonly linesPerLevel: number;
  /** Güçlerin açıldığı tıkanıklık oranı (0..1). */
  readonly powerThreshold: number;
  readonly cycMultMs: number;
  readonly cycMult: number;
  /** NS4-09: sıklamen gücünü dolduran satır sayısı ve gücün boşalttığı en fazla dolu alt satır. */
  readonly cycChargeLines: number;
  readonly cycRows: number;
  /** Serbest oyunda başlangıç şarjı. */
  readonly cycStartCharge: number;
  readonly reboundMs: number;
  readonly reboundSpeed: number;
  readonly reboundGarbageEvery: number;
  /** CTA hedef URL'si (UTM parametreleri analytics/cta.ts'te eklenir). */
  readonly cta: string;
}

export const CFG = {
  lockDelay: 500,
  maxLockResets: 15,
  lineClearMs: 300,
  synClearMs: 260,
  drainMs: 800,
  softDropFactor: 20,
  maxLevel: 20,
  linesPerLevel: 10,
  powerThreshold: 0.35, // tıkanıklık oranı: destekler bu seviyede açılır
  cycMultMs: 20000,
  cycMult: 2,
  cycChargeLines: 8,
  cycRows: 3,
  cycStartCharge: 0.5,
  reboundMs: 40000,
  reboundSpeed: 1.5,
  reboundGarbageEvery: 10000,
  cta: 'https://www.yasasinsaglik.com/',
} as const satisfies GameConfig;
