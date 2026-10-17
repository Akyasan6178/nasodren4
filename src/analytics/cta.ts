// CTA bağlantısı: sabit hedef + UTM parametreleri (değerler raporlama sözleşmesidir).
import { CFG } from '../config/gameConfig';
import type { CtaPlacement } from '../types/analytics';

export function ctaUrl(placement: CtaPlacement): string {
  const u = new URL(CFG.cta);
  u.searchParams.set('utm_source', 'ferah_nefes_oyun');
  u.searchParams.set('utm_medium', 'advergame');
  u.searchParams.set('utm_campaign', 'sinus_bulmaca');
  u.searchParams.set('utm_content', placement);
  return u.toString();
}
