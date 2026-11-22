/* =====================================================================
   DALGALAR VE SPRAY (kural seti sinus-dalga-v2; docs/NS4-45-ZORLASAN-DALGALAR.md;
   önceki: sinus-attack-spray-v1, docs/SINUS-ATTACK-AND-SPRAY-FINAL.md):
   - Bölüm saati (game/pressure.ts) aktif oynanışta adım atar (ilk adım
     PRESSURE.firstStepMs, sonra PRESSURE.stepMs): tek adımlar dalga (yukarıdan tek kareler ve virüsler düşer,
     dropCells), çift adımlar hızlanma. Alttan satır itme yok (NS4-45).
   - Spray: satır temizlemesinde kırılan renkli hücrelerle dolar; yalnızca
     dalga hücrelerini (tek kare ve virüs) hedefler (en çok SINUS.sprayCells).
   - Hücre kaynağı (Game.origin): her gri oda ya da dalga kaynaklıdır.
     Sıklamen çekirdeği ve Sıklamen gücü dalga hücresini görmez. NS4-47:
     bölüm hedefi oda grisi + dalga hücreleri; bölüm açılınca kalan renkli
     bloklar puansız temizlenir (taşıma yok).
     NS4-45: dalga hücresi içeren satır normal puanlanır; virüs ek puan verir.
   Bütün rastgele seçimler oyunun tohumlu akışlarından gelir (Math.random yok).
   ===================================================================== */
import { COLS, ROWS } from '../config/gameConfig';
import { PIECE } from './pieces';

export const SINUS = {
  /** Spray: hazır olması için kırılan renkli hücre sayısı ve kullanım başına en çok silinen dalga hücresi. */
  sprayThreshold: 30,
  sprayCells: 8,
} as const;

/**
 * Hücre kaynağı (Game.origin; tahtayla aynı boyutta ayrı katman, board değeri değişmez): gri hücrenin nereden
 * geldiği. Renkli ve boş hücrelerde 0. NS4-45: virüs, türüyle birlikte saklanır (virus + 0..VIRUS_KINDS-1).
 */
export const ORIGIN = { none: 0, room: 1, attack: 2, virus: 3 } as const;
/** NS4-45: virüs türü sayısı (public/images/virus/virus-1..3.webp). */
export const VIRUS_KINDS = 3;

/** Dalga hücresi mi (tek kare ya da virüs; board değeri gri). Spray hedefi; oda hedefi ve çekirdek görmez. */
export const isAttackGray = (board: Uint8Array, origin: Uint8Array, k: number): boolean =>
  board[k] === PIECE.GARBAGE && (origin[k] ?? 0) >= ORIGIN.attack;

/** NS4-45: virüs hücresi mi. */
export const isVirus = (board: Uint8Array, origin: Uint8Array, k: number): boolean =>
  board[k] === PIECE.GARBAGE && (origin[k] ?? 0) >= ORIGIN.virus;

/** NS4-45: virüs türü (0..VIRUS_KINDS-1); virüs değilse -1. */
export const virusKind = (origin: number): number => (origin >= ORIGIN.virus ? origin - ORIGIN.virus : -1);

/** [0, n) aralığında tamsayı. */
const pick = (rand: () => number, n: number) => Math.min(n - 1, Math.floor(rand() * n));

/**
 * Dalga hücreleri yukarıdan düşer: `kinds` sırasıyla her biri (ORIGIN.attack tek kare, ORIGIN.virus.. virüs) rastgele
 * bir sütunun yığın tepesine (sütundaki en üst dolu hücrenin hemen üstü; boş sütunda en alt sıra) oturur. Atlanan
 * sütunlar: tepe gizli sıralarda (< `from`), hava kanalı (channelAt; oda sıralarının üstünde en üst kanalın sütunu da
 * boş kalır, kanala üstten erişim kapanmaz), `blocked` (düşen parçanın hücreleri) ve sırayı tam dolduracak hücre
 * (dalga kendiliğinden satır silmez). Uygun sütun kalmazsa daha az düşer; sonsuz arama yok. Düşen hücreler döner.
 */
export function dropCells(
  board: Uint8Array,
  plant: Uint8Array,
  origin: Uint8Array,
  channelAt: Int8Array,
  rand: () => number,
  kinds: readonly number[],
  from: number,
  blocked: ReadonlySet<number> = new Set(),
): { readonly k: number; readonly kind: number }[] {
  let topY = 0;
  while (topY < ROWS && (channelAt[topY] ?? -1) < 0) topY++;
  const topCh = topY < ROWS ? (channelAt[topY] ?? -1) : -1;
  const filled = new Int8Array(ROWS);
  for (let k = 0; k < board.length; k++) if (board[k]) filled[(k / COLS) | 0]++;
  const landing = (x: number) => {
    let y = 0;
    while (y < ROWS && !board[y * COLS + x]) y++;
    y--;
    if (y < from) return -1;
    const ch = y < topY ? topCh : (channelAt[y] ?? -1);
    const k = y * COLS + x;
    if (ch === x || blocked.has(k) || (filled[y] ?? 0) + 1 >= COLS) return -1;
    return k;
  };
  const out: { k: number; kind: number }[] = [];
  for (const kind of kinds) {
    const cand: number[] = [];
    for (let x = 0; x < COLS; x++) {
      const k = landing(x);
      if (k >= 0) cand.push(k);
    }
    if (!cand.length) break;
    const k = cand[pick(rand, cand.length)] ?? 0;
    board[k] = PIECE.GARBAGE;
    plant[k] = 0;
    origin[k] = kind;
    filled[(k / COLS) | 0]++;
    out.push({ k, kind });
  }
  return out;
}

/**
 * Spray hedefleri: `from` sırasından aşağıdaki atak grileri arasından rastgele en çok `n` benzersiz hücre (oda grisi
 * ve renkli hücre hiç seçilmez). Küçükten büyüğe sıralı döner.
 */
export function pickAttackCells(
  board: Uint8Array,
  origin: Uint8Array,
  rand: () => number,
  n: number,
  from: number,
): number[] {
  const cand: number[] = [];
  for (let k = from * COLS; k < board.length; k++) if (isAttackGray(board, origin, k)) cand.push(k);
  const out: number[] = [];
  while (out.length < n && cand.length) {
    const i = pick(rand, cand.length);
    out.push(cand[i] ?? 0);
    cand[i] = cand[cand.length - 1] ?? 0;
    cand.pop();
  }
  return out.sort((a, b) => a - b);
}

/** `from` sırasından aşağıda atak kaynaklı gri var mı (Spray hedefi). */
export function hasAttackGray(board: Uint8Array, origin: Uint8Array, from: number): boolean {
  for (let k = from * COLS; k < board.length; k++) if (isAttackGray(board, origin, k)) return true;
  return false;
}

/** `rows` sıralarından dalga hücresi içerenler (ölçüm; NS4-45'ten beri normal puanlanır). */
export function attackRows(board: Uint8Array, origin: Uint8Array, rows: readonly number[]): number[] {
  return rows.filter((y) => {
    for (let x = 0; x < COLS; x++) if (isAttackGray(board, origin, y * COLS + x)) return true;
    return false;
  });
}

/** Satırlardaki renkli (1-7) hücre sayısı: Spray şarjına katkı. */
export function coloredInRows(board: Uint8Array, rows: readonly number[]): number {
  let n = 0;
  for (const y of rows)
    for (let x = 0; x < COLS; x++) {
      const v = board[y * COLS + x] ?? 0;
      if (v >= 1 && v <= 7) n++;
    }
  return n;
}
