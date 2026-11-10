/* =====================================================================
   NS4-44 · VİRÜS AVI görünür metinleri (tek yerde; içerik envanteri ve
   hukuk inceleme listesi buradan okur). Sade dil; tıbbi iddia yok.
   ===================================================================== */

export const VIRUS_TEXT = {
  menu: 'Virüs Avı',
  level: 'Bölüm',
  left: 'Kalan virüs',
  time: 'Süre',
  lens: 'Kalan virüsler',
  levelClear: 'Bölüm temiz!',
  nextLevel: (n: number) => `Sıradaki: Bölüm ${n}`,
  finalTitle: 'Bütün virüsler temiz!',
  overTime: 'Süre doldu',
  overBlock: 'Tahta doldu',
  overLevel: 'Ulaşılan bölüm',
  overViruses: 'Temizlenen virüs',
  tutorialLevel: 'Deneme',
} as const;
