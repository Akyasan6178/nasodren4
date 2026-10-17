// Ayarlar ekranı bağlama: [data-k] girişleri ↔ ayar nesnesi. Her değişiklik anında kaydedilir.
// Kalıcılık ve ses güncellemesi dışarıdan verilir (storage/audio modüllerini bilmez).
import type { Settings } from '../types/settings';
import { $ } from './dom';

export interface SettingsPanelDeps {
  settings: Settings;
  save: () => void;
  onAudioChange: () => void;
  canVibrate: boolean;
}

export function bindSettingsPanel({ settings, save, onAudioChange, canVibrate }: SettingsPanelDeps) {
  if (!canVibrate) { $('hap-note').textContent = 'Bu cihaz/tarayıcı titreşimi desteklemiyor'; }
  document.querySelectorAll<HTMLInputElement>('#scr-set [data-k]').forEach((inp) => {
    const k = inp.dataset.k as keyof Settings;
    if (inp.type === 'checkbox') inp.checked = !!settings[k]; else inp.value = String(settings[k]);
    const lbl = () => { $('v-das').textContent = String(settings.das); $('v-arr').textContent = String(settings.arr); };
    lbl();
    inp.addEventListener('input', () => {
      Object.assign(settings, { [k]: inp.type === 'checkbox' ? inp.checked : +inp.value });   // NS4-03: tip güvenli tek alan ataması (eski: settings[k] = ...)
      save(); lbl();
      if (k === 'sound' || k === 'music') onAudioChange();
      if (k === 'fps') $('fps').style.display = settings.fps ? 'block' : 'none';
    });
  });
  $('fps').style.display = settings.fps ? 'block' : 'none';
}
