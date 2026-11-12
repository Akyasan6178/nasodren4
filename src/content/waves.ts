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
/** Bölüm saati barının ekran okuyucu adı (sıradaki adıma göre). */
export const BAR_LABEL = { wave: 'Sıradaki: virüs dalgası', speed: 'Sıradaki: hızlanma' } as const;
