// Kullanıcı ayarları (fn_settings). Uygulama boyunca tek bir nesne kullanılır;
// ayar paneli bu nesneyi yerinde günceller, diğer sistemler onu okur.
import { store } from './store';
import type { BooleanSettingKey, NumericSettingKey, Settings } from '../types/settings';

/** Varsayılan ayarlar (alan sırası kaydedilen JSON'un sırasını belirler). */
export function createDefaultSettings(): Settings {
  return { sound: true, music: true, haptics: true, ghost: true, fps: false, das: 167, arr: 33 };
}

// DOĞRULANMAMIŞ JSON SINIRI (teknik borç → NS4-06): store.get() `unknown` döndürür. Object.assign,
// varsayılanların üzerine kayıtlı nesnenin bütün alanlarını kopyalar ve sonuç `Settings` kabul edilir.
// Alan tipleri veya fazladan alanlar denetlenmez; davranış NS4-01 referansıyla aynıdır.
export const settings: Settings = Object.assign(createDefaultSettings(), store.get('settings', {}));

export function saveSettings(): void {
  store.set('settings', settings);
}

const BOOLEAN_KEYS: readonly string[] = [
  'sound',
  'music',
  'haptics',
  'ghost',
  'fps',
] satisfies readonly BooleanSettingKey[];
const NUMERIC_KEYS: readonly string[] = ['das', 'arr'] satisfies readonly NumericSettingKey[];

/** DOM `data-k` değerleri gibi dış kaynaklı anahtarlar için tip koruyucuları. */
export function isBooleanSettingKey(k: string | undefined): k is BooleanSettingKey {
  return k !== undefined && BOOLEAN_KEYS.includes(k);
}
export function isNumericSettingKey(k: string | undefined): k is NumericSettingKey {
  return k !== undefined && NUMERIC_KEYS.includes(k);
}
