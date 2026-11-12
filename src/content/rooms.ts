/* =====================================================================
   İÇERİK: Sinüs Odaları metinleri (NS4-27)
   Oda yapısı (sıra/boşluk) config/gameConfig.ts ROOMS'tadır; burada yalnızca
   görünür adlar. Anatomi adları sağlık ipucundaki (tip.paranasal) adlarla
   aynıdır; tedavi iddiası içermez.
   ===================================================================== */
import { ROOMS, ROOM_KINDS, type RoomId } from '../config/gameConfig';

/** NS4-46: 8 bölümün görünür adları (sol/sağ ekrandaki taraf). */
export const ROOM_TEXT: Readonly<Record<RoomId, { readonly name: string; readonly short: string }>> = {
  'burun-sol': { name: 'Sol burun boşluğu', short: 'Sol burun' },
  'burun-sag': { name: 'Sağ burun boşluğu', short: 'Sağ burun' },
  'yanak-sol': { name: 'Sol yanak sinüsü', short: 'Sol yanak' },
  'yanak-sag': { name: 'Sağ yanak sinüsü', short: 'Sağ yanak' },
  'etmoid-sol': { name: 'Sol gözler arası sinüs', short: 'Sol gözler arası' },
  'etmoid-sag': { name: 'Sağ gözler arası sinüs', short: 'Sağ gözler arası' },
  'alin-sol': { name: 'Sol alın sinüsü', short: 'Sol alın' },
  'alin-sag': { name: 'Sağ alın sinüsü', short: 'Sağ alın' },
};
/** Son odadan sonraki sonsuz mod. */
export const FREE_NAME = 'Serbest nefes';
/** NS4-30: hedef, neyin yapılacağını söyler (parlayan boşluklar = hava kanalı). */
export const ROOM_GOAL = 'Parlayan boşlukları doldur, bulutçukları uçur';
/** NS4-30: oyunda ilk bulutçuk uçunca (1. odada, oyun başına bir kez). */
export const CLOUD_HINT = 'Bulutçuk uçtu! Hepsini uçur, sinüs açılsın.';
export const ROOM_CLEAR = 'Sinüs açıldı!';
/** NS4-46: burun boşluğu bir sinüs değildir; açılış kartı başlığı türe göre. */
export const NOSE_CLEAR = 'Burun açıldı!';
export function roomClearTitle(i: number): string {
  return ROOMS[i]?.kind === 'burun' ? NOSE_CLEAR : ROOM_CLEAR;
}
/**
 * NS4-46: bölüm geçiş kartındaki boşluk görseli (public/images/bolumler/<ad>.webp; kaynak art/bolumler,
 * tools/bolumler/prepare_bolumler.py). Görseli olmayan bölümde kart yüz haritasını gösterir.
 */
export const ROOM_ART: Readonly<Partial<Record<RoomId, string>>> = {
  'yanak-sol': 'maxillary_sol',
  'yanak-sag': 'maxillary_sag',
  'alin-sol': 'frontal_sol',
  'alin-sag': 'frontal_sag',
};
export function roomArtUrl(i: number): string | null {
  const id = ROOMS[i]?.id;
  const name = id ? ROOM_ART[id] : undefined;
  return name ? `${import.meta.env.BASE_URL}images/bolumler/${name}.webp` : null;
}
/** NS4-46: tür sırası (tahta tonu, müzik tonu); Serbest nefes ve oda akışı kapalıyken -1. */
export function roomKindIndex(i: number): number {
  const k = ROOMS[i]?.kind;
  return k ? ROOM_KINDS.indexOf(k) : -1;
}
export const ALL_CLEAR = 'Bütün sinüsler açık!';
/** NS4-31: son odanın açılış kartında "sıradaki" yerine. */
export const ROOM_NEXT_FINAL = 'Sırada: final';
export const FREE_GOAL = 'Rekor için nefes almaya devam et';

/** Oda indeksi → { ad, kısa ad }; ROOMS.length ve ötesi Serbest nefes. */
export function roomText(i: number): { readonly name: string; readonly short: string } {
  const def = ROOMS[i];
  return def ? ROOM_TEXT[def.id] : { name: FREE_NAME, short: FREE_NAME };
}
/** NS4-30: açıklık oranı (0..1) → tam sayı yüzde (aşağı yuvarlanır: son bulutçuk uçmadan %100 görünmez). */
export function openPercent(openness: number): number {
  return Math.floor(Math.min(1, Math.max(0, openness)) * 100 + 1e-9);
}
/** HUD etiketi: "1/8 · Sol burun" ya da "Serbest nefes". */
export function roomLabel(i: number): string {
  return i < ROOMS.length ? `${i + 1}/${ROOMS.length} · ${roomText(i).short}` : FREE_NAME;
}
