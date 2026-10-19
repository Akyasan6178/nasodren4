/* =====================================================================
   GÜÇLENDİRİCİ BUTON DURUMLARI (NS4-07)
   Sıklamen ve sentetik açıcı butonlarının durumu Game'den türetilir; kural
   hesaplamaz, yalnızca okur. Durum `data-state` ve alt metin olarak gösterilir.
   Açılma eşiği, süreler ve rebound kuralları Game/CFG'dedir; burada değişmez.
   ===================================================================== */
import type { Game } from '../game/Game';

/** locked: eşik altı · ready: kullanılabilir · used: kullanıldı · active: ×2 etkisi sürüyor */
export type CycState = 'locked' | 'ready' | 'used' | 'active';
/** locked/ready: ilk kullanım öncesi · risk: tekrar kullanım rebound yapar · rebound: rebound sürüyor */
export type SynState = 'locked' | 'ready' | 'risk' | 'rebound';

/** Kısa buton yardımcı metinleri (oyun durumu; sağlık içeriği değildir). */
export const CYC_TEXT: Readonly<Record<CycState, string>> = {
  locked: 'Tıkanıklık %35’te açılır',
  ready: 'Hazır · oyunda 1 kez',
  used: 'Bu oyunda kullanıldı',
  active: 'Kullanıldı · ×2 etkin',
};
export const SYN_TEXT: Readonly<Record<SynState, string>> = {
  locked: 'Hızlı rahatlama',
  ready: 'Hazır · hızlı rahatlama',
  risk: 'Tekrarı rebound yapar',
  rebound: 'Rebound sürüyor',
};

/** NS4-10: dar (compact) düzende alt metin yerine gösterilen kısa durum etiketleri. */
export const CYC_SHORT: Readonly<Record<CycState, string>> = {
  locked: 'Kilitli',
  ready: 'Hazır',
  used: 'Kullanıldı',
  active: '×2 etkin',
};
export const SYN_SHORT: Readonly<Record<SynState, string>> = {
  locked: 'Kilitli',
  ready: 'Hazır',
  risk: 'Rebound riski',
  rebound: 'Rebound sürüyor',
};
/** Erişilebilir ad öneki (buton adı; durum metni eklenir). */
export const CYC_NAME = 'Sıklamen özütü';
export const SYN_NAME = 'Sentetik açıcı';

/** `playing` değilse (oyun sonu) süren etkiler gösterilmez; HUD rozetleriyle aynı kural. */
export function cycState(g: Game, playing: boolean): CycState {
  if (g.cycUsed) return playing && g.multT > 0 ? 'active' : 'used';
  return g.canCyc() ? 'ready' : 'locked';
}

export function synState(g: Game, playing: boolean): SynState {
  if (playing && g.reboundT > 0) return 'rebound';
  if (g.synUses > 0) return 'risk';
  return g.canSyn() ? 'ready' : 'locked';
}
