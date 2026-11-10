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

/** Doktor Elif'in öğretici cümleleri (spec §7.5 + §8a; lens cümlesindeki süre eki Claude'un kararı). */
export const VIRUS_TUT_COPY = {
  selam: {
    keyboard: 'Merhaba, ben Doktor Elif! Hadi bu yaramaz virüsleri tahtadan temizleyelim.',
    touch: 'Merhaba, ben Doktor Elif! Hadi bu yaramaz virüsleri tahtadan temizleyelim.',
  },
  kapsul: {
    keyboard: '← → ile kapsülü kaydır, ↑ ile döndür.',
    touch: 'Sürükleyerek kaydır, dokunarak döndür.',
  },
  dortlu: {
    keyboard: 'Renk fark etmez! Yan yana ya da üst üste 4 tane diz, patlasın.',
    touch: 'Renk fark etmez! Yan yana ya da üst üste 4 tane diz, patlasın.',
  },
  virus: {
    keyboard: 'Virüsü dörtlünün içine al.',
    touch: 'Virüsü dörtlünün içine al.',
  },
  lens: {
    keyboard: 'Buradaki üç arkadaşın hepsi kaybolunca bölüm biter. Süre bitmeden yetiş, kolay gelsin!',
    touch: 'Buradaki üç arkadaşın hepsi kaybolunca bölüm biter. Süre bitmeden yetiş, kolay gelsin!',
  },
} as const;
/** Alkış anındaki kısa övgü. */
export const VIRUS_TUT_CHEER = 'Harika!';
export const VIRUS_TUT_LABELS = { step: 'Öğretici', skip: 'Atla', next: 'Devam' } as const;
