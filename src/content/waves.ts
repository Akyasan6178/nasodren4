/* =====================================================================
   İÇERİK: zorlaşan dalgalar (NS4-45)
   Bölüm saatinin iki adımı: virüs dalgası (tek kareler ve virüsler
   yukarıdan düşer) ve hızlanma. Sade dil; tıbbi iddia yok.
   ===================================================================== */
export const WAVE_TITLE = 'Virüs dalgası!';
export const WAVE_SUB = 'Virüslü satırı sil, ek puan kap';
export const SPEED_TITLE = 'Hızlanıyor!';
export const SPEED_SUB = 'Bloklar daha hızlı iniyor';
/** Virüs içeren satır temizlenince (şablon: puan). */
export const virusClearText = (n: number, pts: number): string =>
  `${n > 1 ? `${n} virüs` : 'Virüs'} temizlendi · +${pts}`;
/** NS4-47: bölüm saatinin geri sayımı (sağ HUD; ekran okuyucu adı da bu metin). */
export const TIMER_LABEL = 'Sonraki sinüzit atağı';
/** Kalan süre (tam saniye). */
export const secondsText = (n: number): string => `${n} sn`;
/** Sıradaki adımın kısa adı (sayacın yanında, ikincil). */
export const STEP_NAME = { wave: 'Virüs dalgası', speed: 'Hızlanma' } as const;
