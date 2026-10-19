/* =====================================================================
   GÜÇLENDİRİCİ BUTON DURUMLARI (NS4-07, NS4-09)
   Sıklamen ve sentetik açıcı butonlarının durumu Game'den türetilir; kural
   hesaplamaz, yalnızca okur. Durum `data-state` ve alt metin olarak gösterilir.
   NS4-09: sıklamen gücü karakterin kendisidir; temizlenen satırlarla dolar,
   dolunca karaktere dokunulur. Bölümlerde güçler kademeli açılır.
   ===================================================================== */
import type { Game } from '../game/Game';

/** off: bu bölümde kapalı · charging: doluyor · ready: kullanılabilir · active: ×2 etkisi sürüyor */
export type CycState = 'off' | 'charging' | 'ready' | 'active';
/** off: bu bölümde kapalı · locked/ready: ilk kullanım öncesi · risk: tekrar rebound yapar · rebound: sürüyor */
export type SynState = 'off' | 'locked' | 'ready' | 'risk' | 'rebound';

/** Şarj yüzdesi (aşağı yuvarlanır: %100 yalnızca gerçekten doluyken). */
export function chargePct(g: Game): number {
  return Math.floor(g.cycCharge * 100);
}

/** Karakterin altındaki kısa metin (oyun durumu; sağlık içeriği değildir). */
export function cycText(s: CycState, pct: number): string {
  switch (s) {
    case 'off':
      return 'Sıklamen';
    case 'charging':
      return `Güç %${pct}`;
    case 'ready':
      return 'Bana dokun!';
    case 'active':
      return `×2 · güç %${pct}`;
  }
}
export const SYN_TEXT: Readonly<Record<SynState, string>> = {
  off: 'Sonraki sinüste',
  locked: 'Tıkanıklık %35’te açılır',
  ready: 'Hazır · hızlı rahatlama',
  risk: 'Tekrarı rebound yapar',
  rebound: 'Rebound sürüyor',
};

/** `playing` değilse (oyun sonu) süren etkiler gösterilmez; HUD rozetleriyle aynı kural. */
export function cycState(g: Game, playing: boolean): CycState {
  if (g.stage && !g.stage.cyc) return 'off';
  if (g.canCyc()) return 'ready';
  return playing && g.multT > 0 ? 'active' : 'charging';
}

export function synState(g: Game, playing: boolean): SynState {
  if (g.stage && !g.stage.syn) return 'off';
  if (playing && g.reboundT > 0) return 'rebound';
  if (g.synUses > 0) return 'risk';
  return g.canSyn() ? 'ready' : 'locked';
}
