/* =====================================================================
   NS4-15: geri bildirim efektlerinin tarifleri (saf veri, PixiJS yok).
   GameView bu değerlerle mevcut parçacık havuzunu, satır flaşlarını ve
   Texture.WHITE katmanlarını sürer. Yeni doku, varlık veya bağımlılık yoktur;
   blok dokularına dokunulmaz. Mekanik süreler (CFG) burada değiştirilmez.
   ===================================================================== */
import type { ScoredEvent } from '../types/events';

/** Satır temizlemenin görsel dili: normal drenaj, Tetris (Ozmotik etki), T-spin (Nörorefleks etki). */
export type ClearFlavor = 'drain' | 'osmotic' | 'neuro';

/** `scored` olayından temizleme dili. T-spin satır temizlemesi Nörorefleks, dört satır Ozmotik, diğerleri drenaj. */
export function flavorOf(e: Pick<ScoredEvent, 'n' | 'tspin'>): ClearFlavor {
  if (e.tspin && e.n > 0) return 'neuro';
  if (e.n === 4) return 'osmotic';
  return 'drain';
}

/** Reduced motion altında sarsıntı ve parçacık çarpanları (durumlar/mesajlar ve mekanik süreler aynı kalır). */
export const REDUCED = { shake: 0.25, particles: 0.3, glow: 0.6 } as const;

export interface MotionScale {
  readonly shake: number;
  readonly particles: number;
  readonly glow: number;
  /** Titreşimli (çok vuruşlu) flaş ve uyarılar; reduced motion altında tek, yumuşak vuruş. */
  readonly flicker: boolean;
}
export function motionScale(reduced: boolean): MotionScale {
  return reduced ? { ...REDUCED, flicker: false } : { shake: 1, particles: 1, glow: 1, flicker: true };
}

/** Satır temizleme tarifleri. Parçacık sayıları hücre başınadır; sarsıntı 0..1. */
export interface LineRecipe {
  /** Satır flaşı rengi. */
  readonly flash: number;
  /** Sıçrayan damla (hücre başına) ve aşağı süzülen damla (hücre başına). */
  readonly splash: number;
  readonly drip: number;
  /** Yatay kıvılcım çizgisi (hücre başına; Nörorefleks ve sentetik). */
  readonly streak: number;
  /** Flaşın satır yüksekliğine göre büyümesi (Ozmotik açılma). */
  readonly bloom: number;
  readonly shake: number;
  /** Tahta üzerine tek vuruşluk yumuşak renk (yoksa 0). */
  readonly glow: number;
  readonly glowPeak: number;
}
export const LINE_FX: Readonly<Record<ClearFlavor | 'syn', LineRecipe>> = {
  drain: { flash: 0xe8fdff, splash: 2, drip: 1, streak: 0, bloom: 0, shake: 0, glow: 0, glowPeak: 0 },
  osmotic: { flash: 0xc8fbff, splash: 3, drip: 1, streak: 0, bloom: 0.9, shake: 0.5, glow: 0x3fd2de, glowPeak: 0.22 },
  neuro: { flash: 0xeadcff, splash: 0, drip: 1, streak: 2, bloom: 0, shake: 0.3, glow: 0xb48cff, glowPeak: 0.14 },
  syn: { flash: 0xff6070, splash: 0, drip: 0, streak: 1, bloom: 0, shake: 0.18, glow: 0, glowPeak: 0 },
};

/** Nörorefleks kıvılcım rengi sırası (mor / pembe / beyaz) ve T merkezinden radyal patlama sayısı. */
export const NEURO_TINTS = [0xc9a8ff, 0xff8fd8, 0xffffff] as const;
export const NEURO_BURST = 12;
/** Ozmotik damla renkleri: blok rengi, beyaz, turkuaz. */
export const OSMOTIC_TINT = 0x3fd2de;
/** Sıklamen: çözünme parçacık renkleri (pembe / turkuaz) ve ×2 başlangıç vuruşu. */
export const CYC_TINTS = [0xff9ccc, 0x5fe6d6] as const;
export const CYC_DONE = { glow: 0xff79bd, peak: 0.24, dur: 460, rise: 16 } as const;

/** Tahta üstü vuruşlu uyarılar (süreler ms; mekanikten bağımsız, yalnızca görsel). */
export interface GlowRecipe {
  readonly tint: number;
  readonly peak: number;
  readonly dur: number;
  readonly beats: number;
  readonly shake: number;
}
/** Rebound: tahtaya hafif kırmızı-turuncu zemin + belirgin kenar çerçevesi (edge × zemin; kenarda en çok 0,9). */
export const REBOUND_FX: GlowRecipe & { readonly edge: number } = {
  tint: 0xff5a1f,
  peak: 0.12,
  dur: 640,
  beats: 2,
  shake: 0.25,
  edge: 6,
};
export const GARBAGE_FX: GlowRecipe & { readonly puffs: number } = {
  tint: 0xc4cbe0,
  peak: 0.42,
  dur: 300,
  beats: 1,
  shake: 0.35,
  puffs: 8,
};

/** Vuruşlu ışıma eğrisi: p ∈ [0,1], `beats` kez yükselip söner, sona doğru zayıflar. p ≥ 1 → 0. */
export function glowAlpha(p: number, peak: number, beats: number): number {
  if (p >= 1 || p < 0) return 0;
  return peak * Math.abs(Math.sin(Math.PI * beats * p)) * (1 - 0.45 * p);
}

/** Parçacık bütçesi: kesirli payı biriktirerek tamsayı adet verir (reduced motion'da da deterministik). */
export class Budget {
  private acc = 0;
  take(n: number, ratio: number): number {
    this.acc += n * ratio;
    const k = Math.floor(this.acc + 1e-9);
    this.acc -= k;
    return k;
  }
  reset() {
    this.acc = 0;
  }
}
