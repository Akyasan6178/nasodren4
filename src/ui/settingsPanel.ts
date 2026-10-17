// Ayarlar ekranı bağlama: [data-k] girişleri ↔ ayar nesnesi. Her değişiklik anında kaydedilir.
// Kalıcılık ve ses güncellemesi dışarıdan verilir (storage/audio modüllerini bilmez).
import { $ } from './dom';
import { isBooleanSettingKey, isNumericSettingKey } from '../storage/settings';
import type { Settings } from '../types/settings';

export interface SettingsPanelDeps {
  readonly settings: Settings;
  readonly save: () => void;
  readonly onAudioChange: () => void;
  readonly canVibrate: boolean;
}

export function bindSettingsPanel({ settings, save, onAudioChange, canVibrate }: SettingsPanelDeps): void {
  if (!canVibrate) {
    $('hap-note').textContent = 'Bu cihaz/tarayıcı titreşimi desteklemiyor';
  }
  document.querySelectorAll('#scr-set [data-k]').forEach((inp) => {
    if (!(inp instanceof HTMLInputElement)) return;
    // data-k bir DOM değeridir: yalnızca bilinen ayar anahtarları bağlanır (index.html'deki bütün girişler bilinir)
    const k = inp.dataset['k'];
    const isBool = isBooleanSettingKey(k),
      isNum = isNumericSettingKey(k);
    if (!isBool && !isNum) return;
    if (inp.type === 'checkbox') inp.checked = !!settings[k];
    else inp.value = String(settings[k]);
    const lbl = () => {
      $('v-das').textContent = String(settings.das);
      $('v-arr').textContent = String(settings.arr);
    };
    lbl();
    inp.addEventListener('input', () => {
      // checkbox → boolean ayar, range → sayısal ayar (index.html'de tür ve anahtar eşleşir)
      if (inp.type === 'checkbox') {
        if (isBool) settings[k] = inp.checked;
      } else if (isNum) settings[k] = +inp.value;
      save();
      lbl();
      if (k === 'sound' || k === 'music') onAudioChange();
      if (k === 'fps') $('fps').style.display = settings.fps ? 'block' : 'none';
    });
  });
  $('fps').style.display = settings.fps ? 'block' : 'none';
}
