// Kullanıcı ayarları (fn_settings). Uygulama boyunca tek bir nesne kullanılır;
// ayar paneli bu nesneyi yerinde günceller, diğer sistemler onu okur.
import type { Settings } from '../types/settings';
import { store } from './store';

/** Varsayılan ayarlar (alan sırası kaydedilen JSON'un sırasını belirler). */
export function createDefaultSettings(): Settings {
  return { sound: true, music: true, haptics: true, ghost: true, fps: false, das: 167, arr: 33 };
}

export const settings: Settings = Object.assign(createDefaultSettings(), store.get('settings', {}));

export function saveSettings() { store.set('settings', settings); }
