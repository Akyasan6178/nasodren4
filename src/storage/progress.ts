// Cihazdaki yerel ilerleme (fn_meta): yerel rekor, toplam drenaj, kazanılan rozetler.
// Not: ileride eklenecek global yüksek skor bu modülün sorumluluğu değildir; ayrı bir
// servis/modül olarak kurulmalı ve fn_meta şemasına alan eklememelidir.
import type { Meta } from '../types/settings';
import { store } from './store';

export function createDefaultMeta(): Meta {
  return { best: 0, totalLines: 0, badges: [] };
}

export const meta: Meta = Object.assign(createDefaultMeta(), store.get('meta', {}));

export function saveMeta() { store.set('meta', meta); }
