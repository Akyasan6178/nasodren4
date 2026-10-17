// Kullanıcı ayarları (fn_settings). Uygulama boyunca tek bir nesne kullanılır;
// ayar paneli bu nesneyi yerinde günceller, diğer sistemler onu okur.
import { store } from './store';
import type { BooleanSettingKey, NumericSettingKey, Settings } from '../types/settings';

/** Varsayılan ayarlar (alan sırası kaydedilen JSON'un sırasını belirler). */
export function createDefaultSettings(): Settings {
  return { sound: true, music: true, haptics: true, ghost: true, fps: false, das: 167, arr: 33 };
}

const BOOLEAN_KEYS: readonly string[] = [
  'sound',
  'music',
  'haptics',
  'ghost',
  'fps',
] satisfies readonly BooleanSettingKey[];
const NUMERIC_KEYS: readonly string[] = ['das', 'arr'] satisfies readonly NumericSettingKey[];

/** Ayarlar ekranındaki kaydırıcıların sınırları (index.html: min/max, step 1). */
export const NUMERIC_RANGES: Readonly<Record<NumericSettingKey, readonly [min: number, max: number]>> = {
  das: [50, 300],
  arr: [0, 100],
};

/**
 * NS4-06: fn_settings doğrulaması. Kayıt nesne değilse varsayılanlar döner. Boolean alanlar yalnızca gerçek
 * boolean ise alınır. DAS/ARR sonlu sayı değilse varsayılana döner; sonlu ama arayüz aralığı dışındaysa
 * sınıra çekilir ve tamsayıya yuvarlanır (kaydırıcı adımı 1). Fazladan alanlar taşınmaz; alan sırası
 * varsayılanlarınkiyle aynıdır. Geçerli kayıt aynı değerlerle döner.
 */
export function normalizeSettings(raw: unknown): Settings {
  const s = createDefaultSettings();
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return s;
  const r: Partial<Record<keyof Settings, unknown>> = raw;
  for (const k of ['sound', 'music', 'haptics', 'ghost', 'fps'] as const) {
    const v = r[k];
    if (typeof v === 'boolean') s[k] = v;
  }
  for (const k of ['das', 'arr'] as const) {
    const v = r[k];
    const [min, max] = NUMERIC_RANGES[k];
    if (typeof v === 'number' && Number.isFinite(v)) s[k] = Math.min(max, Math.max(min, Math.round(v)));
  }
  return s;
}

/**
 * Kayıtlı değeri okur ve doğrular. Okunan kayıt normalize edilince değiştiyse düzeltilmiş hâli hemen geri
 * yazılır; geçerli kayıtlar ve kayıt yokken depoya dokunulmaz.
 */
function loadSettings(): Settings {
  const raw = store.get('settings', null);
  const s = normalizeSettings(raw);
  if (raw !== null && JSON.stringify(raw) !== JSON.stringify(s)) store.set('settings', s);
  return s;
}

export const settings: Settings = loadSettings();

export function saveSettings(): void {
  store.set('settings', settings);
}

/** DOM `data-k` değerleri gibi dış kaynaklı anahtarlar için tip koruyucuları. */
export function isBooleanSettingKey(k: string | undefined): k is BooleanSettingKey {
  return k !== undefined && BOOLEAN_KEYS.includes(k);
}
export function isNumericSettingKey(k: string | undefined): k is NumericSettingKey {
  return k !== undefined && NUMERIC_KEYS.includes(k);
}
