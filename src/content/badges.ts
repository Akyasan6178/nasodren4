/* =====================================================================
   İÇERİK: rozet tanımları (kimlik → ad, açıklama)
   NS4-03: main.ts'ten birebir taşındı. Kimlikler fn_meta.badges içinde
   saklandığı için değiştirilmemelidir; sıra oyun sonu listesinin sırasıdır.
   ===================================================================== */
export interface BadgeDef { name: string; desc: string }

export const BADGES: Record<string, BadgeDef> = {
  ozmotik: { name: 'Ozmotik usta', desc: 'İlk 4 satırlık drenaj' },
  noro: { name: 'Nörorefleks uzmanı', desc: 'İlk T-spin temizliği' },
  akis: { name: 'Akış hali', desc: '5\u2019li kombo' },
  dogal: { name: 'Doğal yol', desc: 'Sentetik açıcısız 5. seviye' },
  derin: { name: 'Derin nefes', desc: 'Toplam 100 satır drenaj' }
};
