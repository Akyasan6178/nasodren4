/* =====================================================================
   CONFIG: tahta boyutları ve oyun ayarları
   NS4-03: main.ts'ten taşındı; değerler değişmedi. `as const` yalnızca
   derleme zamanında salt-okunurluk sağlar (çalışma anı nesnesi aynı).
   ===================================================================== */
export const COLS = 10, ROWS = 22, HIDDEN = 2, VIS = 20;
export const CFG = {
  lockDelay: 500, maxLockResets: 15,
  lineClearMs: 300, synClearMs: 260, drainMs: 800,
  softDropFactor: 20,
  maxLevel: 20, linesPerLevel: 10,
  powerThreshold: 0.35,          // tıkanıklık oranı: destekler bu seviyede açılır
  cycMultMs: 30000, cycMult: 2,
  reboundMs: 40000, reboundSpeed: 1.5, reboundGarbageEvery: 10000,
  cta: 'https://www.yasasinsaglik.com/'
} as const;
