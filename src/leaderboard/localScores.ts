/* =====================================================================
   NS4-18: cihazdaki yerel yüksek skor listesi (fn_scores, sürümlü).
   En iyi 10 tamamlanmış oyun. fn_meta (best/totalLines/rozetler) ayrı ve
   değişmeden kalır. Kayıtlar yüklenirken doğrulanır; geçersiz/bozuk
   kayıtlar atılır, aynı oyun (gameId) iki kez eklenmez.
   ===================================================================== */
import { store } from '../storage/store';
import { GAME_RULES, SCORE_LIMITS, validateNickname } from '../../supabase/functions/_shared/scoreRules.ts';

export const LOCAL_SCORES_KEY = 'scores';
export const LOCAL_SCORES_VERSION = 1;
export const LOCAL_SCORES_MAX = 10;

export interface LocalScore {
  /** Oyun başına rastgele kimlik (global gönderimde de kullanılır). */
  readonly id: string;
  /** Takma ad; henüz verilmediyse boş. */
  readonly nickname: string;
  readonly score: number;
  readonly lines: number;
  readonly level: number;
  readonly durationSeconds: number;
  /** Kayıt zamanı (Unix ms). */
  readonly recordedAt: number;
  /** Global tabloya başarıyla gönderildi (aynı oyun tekrar gönderilmez). */
  readonly submitted: boolean;
}
interface Stored {
  readonly v: number;
  readonly entries: readonly LocalScore[];
}

const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const isInt = (v: unknown, min: number, max: number): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;

/** Tek kaydı doğrular; geçersizse null. Takma ad geçersizse boşa çekilir (kayıt korunur). */
export function normalizeLocalScore(raw: unknown): LocalScore | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const r = raw as Partial<Record<keyof LocalScore, unknown>>;
  if (typeof r.id !== 'string' || !ID_RE.test(r.id)) return null;
  if (!isInt(r.score, 0, SCORE_LIMITS.maxScore)) return null;
  if (!isInt(r.lines, 0, SCORE_LIMITS.maxLines)) return null;
  if (!isInt(r.level, 1, GAME_RULES.maxLevel)) return null;
  if (!isInt(r.durationSeconds, 0, SCORE_LIMITS.maxDurationSeconds)) return null;
  if (!isInt(r.recordedAt, 0, 8_640_000_000_000_000)) return null;
  const nick = r.nickname === '' ? null : validateNickname(r.nickname);
  return {
    id: r.id,
    nickname: nick?.ok ? nick.value : '',
    score: r.score,
    lines: r.lines,
    level: r.level,
    durationSeconds: r.durationSeconds,
    recordedAt: r.recordedAt,
    submitted: r.submitted === true,
  };
}

/** Skor azalan; eşitlikte önce kaydedilen (daha erken recordedAt) üstte, sonra id (kararlı). */
export function compareScores(a: LocalScore, b: LocalScore): number {
  return b.score - a.score || a.recordedAt - b.recordedAt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

/** Ham depo değerinden doğrulanmış, sıralı, tekrarsız en çok 10 kayıt. */
export function normalizeLocalScores(raw: unknown): LocalScore[] {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return [];
  const r = raw as Partial<Record<keyof Stored, unknown>>;
  if (r.v !== LOCAL_SCORES_VERSION || !Array.isArray(r.entries)) return [];
  const seen = new Set<string>();
  const out: LocalScore[] = [];
  for (const e of r.entries) {
    const s = normalizeLocalScore(e);
    if (!s || seen.has(s.id)) continue;
    seen.add(s.id);
    out.push(s);
  }
  return out.sort(compareScores).slice(0, LOCAL_SCORES_MAX);
}

export function loadLocalScores(): LocalScore[] {
  return normalizeLocalScores(store.get(LOCAL_SCORES_KEY, null));
}

function save(entries: readonly LocalScore[]): void {
  const v: Stored = { v: LOCAL_SCORES_VERSION, entries };
  store.set(LOCAL_SCORES_KEY, v);
}

/**
 * Tamamlanmış oyunu ekler (aynı id varsa eklemez). En iyi 10 dışında kalırsa listeye girmez.
 * Dönüş: güncel liste ve kaydın listeye girip girmediği.
 */
export function addLocalScore(entry: LocalScore): { readonly entries: LocalScore[]; readonly added: boolean } {
  const current = loadLocalScores();
  const valid = normalizeLocalScore(entry);
  if (!valid || current.some((e) => e.id === valid.id)) return { entries: current, added: false };
  const next = [...current, valid].sort(compareScores).slice(0, LOCAL_SCORES_MAX);
  const added = next.some((e) => e.id === valid.id);
  if (added) save(next);
  return { entries: next, added };
}

/** Kayıt alanlarını günceller (takma ad, gönderildi işareti). Kayıt yoksa değişiklik yapılmaz. */
export function updateLocalScore(id: string, patch: Partial<Pick<LocalScore, 'nickname' | 'submitted'>>): void {
  const current = loadLocalScores();
  if (!current.some((e) => e.id === id)) return;
  save(current.map((e) => (e.id === id ? { ...e, ...patch } : e)));
}
