/* =====================================================================
   CONFIG: tahta boyutları ve oyun ayarları
   NS4-03: main.ts'ten taşındı; değerler değişmedi. NS4-04: `as const` +
   `satisfies GameConfig` şemayı derleme zamanında denetler (çalışma anı
   nesnesi aynı; salt-okunurluk yalnızca tip düzeyindedir).
   NS4-24: sentetik açıcı ve rebound kaldırıldı; yerine Hapşırık (sneeze*).
   NS4-22: Tam Ferahlık (satır temizlemesiyle tahtanın tamamen boşalması) bonusu.
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
  readonly softDropFactor: number;
  readonly maxLevel: number;
  readonly linesPerLevel: number;
  /** Güçlerin açıldığı tıkanıklık oranı (0..1). */
  readonly powerThreshold: number;
  readonly cycMultMs: number;
  readonly cycMult: number;
  /** NS4-24: Hapşırık: yeniden dolması için kilitlenen parça sayısı, savrulan üst sıra sayısı ve animasyon (ms). */
  readonly sneezePieces: number;
  readonly sneezeRows: number;
  readonly sneezeMs: number;
  /** NS4-27: oda temizleme bonusu (× oda sırası (1..) × seviye) ve "Sinüs açıldı" geçiş süresi (ms; NS4-31: harita kartı okunsun diye 2,4 sn). */
  readonly roomBonus: number;
  readonly roomClearMs: number;
  /** NS4-22: Tam Ferahlık bonusu (temizlenen satır sayısına göre: [_, 1, 2, 3, 4]) × seviye; sıklamen ×2'den etkilenmez. */
  readonly allClearBonus: readonly [0, number, number, number, number];
  /** CTA hedef URL'si (UTM parametreleri analytics/cta.ts'te eklenir). */
  readonly cta: string;
}

export const CFG = {
  lockDelay: 500,
  maxLockResets: 15,
  lineClearMs: 300,
  softDropFactor: 20,
  maxLevel: 20,
  linesPerLevel: 10,
  powerThreshold: 0.35, // tıkanıklık oranı: destekler bu seviyede açılır
  cycMultMs: 30000,
  cycMult: 2,
  sneezePieces: 20,
  sneezeRows: 3,
  sneezeMs: 650,
  roomBonus: 1000,
  roomClearMs: 2400,
  allClearBonus: [0, 800, 1200, 1800, 2000],
  cta: 'https://www.yasasinsaglik.com/',
} as const satisfies GameConfig;

/**
 * NS4-27 / NS4-46: bölüm (oda) türleri ve tarafları. 8 bölüm: dört boşluk, her biri önce sol sonra sağ (kullanıcı
 * kararı 2026-11-12; Kafa tabanı/sfenoid kalktı). Görünür adlar content/rooms.ts'te. "Sol" ekranda soldaki taraftır.
 */
export type RoomKind = 'burun' | 'yanak' | 'etmoid' | 'alin';
export type RoomSide = 'sol' | 'sag';
export type RoomId = `${RoomKind}-${RoomSide}`;
/** Bölüm türlerinin sırası (müzik tonu, tahta tonu ve duvar şekli türden gelir). */
export const ROOM_KINDS = ['burun', 'yanak', 'etmoid', 'alin'] as const satisfies readonly RoomKind[];
export interface RoomDef {
  readonly id: RoomId;
  readonly kind: RoomKind;
  readonly side: RoomSide;
  /** Oda başında alttan dolu gelen gri bulutçuk sırası (tıkanıklık = rows / VIS). */
  readonly rows: number;
  /**
   * NS4-30: hava kanalı sayısı. Her sırada bir boşluk vardır ve boşluklar üst üste hizalanır (kanal); sıralar
   * `channels` eşit parçaya bölünür, her parçanın kanalı ayrı sütundadır. 1: tek dikey I bütün odayı açabilir.
   */
  readonly channels: number;
  /** NS4-30: sıra başına en çok ek (kanal dışı) boşluk (0..extraHoles; rastgele). */
  readonly extraHoles: number;
}
const room = (kind: RoomKind, side: RoomSide, rows: number, channels: number, extraHoles: number): RoomDef => ({
  id: `${kind}-${side}`,
  kind,
  side,
  rows,
  channels,
  extraHoles,
});
/**
 * NS4-27 / NS4-46: bölümler. Oyun sırayla bu bölümlerden geçer; geçme şartı bölümdeki bütün gri bulutçukları
 * temizlemek. Son bölümden sonra "Serbest nefes" (sonsuz; room === ROOMS.length). Gri sıra sayıları sanal oyuncu
 * testleriyle ayarlandı (docs/NS4-46-SEKIZ-BOLUM.md).
 */
export const ROOMS: readonly RoomDef[] = [
  room('burun', 'sol', 2, 1, 0),
  room('burun', 'sag', 3, 1, 0),
  room('yanak', 'sol', 3, 1, 0),
  room('yanak', 'sag', 4, 2, 0),
  room('etmoid', 'sol', 5, 2, 0),
  room('etmoid', 'sag', 6, 2, 0),
  room('alin', 'sol', 6, 2, 1),
  room('alin', 'sag', 8, 2, 1),
];
