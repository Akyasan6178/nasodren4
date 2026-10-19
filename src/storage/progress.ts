// Cihazdaki yerel ilerleme (fn_meta): yerel rekor, toplam drenaj, kazanılan rozetler.
// Not: ileride eklenecek global yüksek skor bu modülün sorumluluğu değildir; ayrı bir
// servis/modül olarak kurulmalı ve fn_meta şemasına alan eklememelidir.
import { store } from './store';
import { BADGE_IDS } from '../content/badges';
import type { BadgeId } from '../types/content';
import type { Meta } from '../types/settings';

export function createDefaultMeta(): Meta {
  return { best: 0, totalLines: 0, badges: [] };
}

/** Sonlu ve negatif olmayan sayı; değilse 0. */
function count(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0;
}
const BADGE_SET: ReadonlySet<string> = new Set(BADGE_IDS);
function isBadgeId(v: unknown): v is BadgeId {
  return typeof v === 'string' && BADGE_SET.has(v);
}

/**
 * NS4-06: fn_meta doğrulaması. Kayıt nesne değilse varsayılan döner. best/totalLines sonlu, negatif olmayan
 * sayı olmalıdır (değilse 0). badges dizi değilse boş dizi; bilinmeyen kimlikler atılır, tekrarlar kaldırılır
 * (ilk görülen sıra korunur). Fazladan alanlar taşınmaz. Geçerli kayıt aynı değerlerle döner.
 */
export function normalizeMeta(raw: unknown): Meta {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return createDefaultMeta();
  const r: Partial<Record<keyof Meta, unknown>> = raw;
  const badges = Array.isArray(r.badges) ? [...new Set(r.badges.filter(isBadgeId))] : [];
  return { best: count(r.best), totalLines: count(r.totalLines), badges };
}

/**
 * Kayıtlı değeri okur ve doğrular. Okunan kayıt normalize edilince değiştiyse düzeltilmiş hâli hemen geri
 * yazılır; geçerli kayıtlar ve kayıt yokken depoya dokunulmaz.
 */
function loadMeta(): Meta {
  const raw = store.get('meta', null);
  const m = normalizeMeta(raw);
  if (raw !== null && JSON.stringify(raw) !== JSON.stringify(m)) store.set('meta', m);
  return m;
}

export const meta: Meta = loadMeta();

export function saveMeta(): void {
  store.set('meta', meta);
}
