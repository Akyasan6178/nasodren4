// Cihazdaki yerel ilerleme (fn_meta): yerel rekor, toplam drenaj, kazanılan rozetler.
// Not: ileride eklenecek global yüksek skor bu modülün sorumluluğu değildir; ayrı bir
// servis/modül olarak kurulmalı ve fn_meta şemasına alan eklememelidir.
import { store } from './store';
import { BADGE_IDS } from '../content/badges';
import { CARD_ORDER } from '../content/cards';
import { STAGES } from '../content/stages';
import type { BadgeId, CardId } from '../types/content';
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
const CARD_SET: ReadonlySet<string> = new Set(CARD_ORDER);
function isCardId(v: unknown): v is CardId {
  return typeof v === 'string' && CARD_SET.has(v);
}
/** Yıldız: 0..3 tamsayı; değilse 0. */
function stars(v: unknown): number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 3 ? v : 0;
}

/**
 * NS4-06: fn_meta doğrulaması. Kayıt nesne değilse varsayılan döner. best/totalLines sonlu, negatif olmayan
 * sayı olmalıdır (değilse 0). badges dizi değilse boş dizi; bilinmeyen kimlikler atılır, tekrarlar kaldırılır
 * (ilk görülen sıra korunur). Fazladan alanlar taşınmaz. Geçerli kayıt aynı değerlerle döner.
 * NS4-09: `stages` bölüm sayısı uzunluğunda 0..3 yıldız dizisine, `cards` bilinen kart kimliklerine süzülür.
 */
export function normalizeMeta(raw: unknown): Meta {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return createDefaultMeta();
  const r: Partial<Record<keyof Meta, unknown>> = raw;
  const badges = Array.isArray(r.badges) ? [...new Set(r.badges.filter(isBadgeId))] : [];
  const m: Meta = { best: count(r.best), totalLines: count(r.totalLines), badges };
  // NS4-09: isteğe bağlı alanlar yalnızca kayıtta varsa taşınır (eski kayıt aynı kalır)
  if (Array.isArray(r.stages)) m.stages = STAGES.map((_, i) => stars((r.stages as unknown[])[i]));
  if (Array.isArray(r.cards)) m.cards = [...new Set(r.cards.filter(isCardId))];
  return m;
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
