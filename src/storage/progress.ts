// Cihazdaki yerel ilerleme (fn_meta): yerel rekor, toplam drenaj, kazanılan rozetler.
// Not: ileride eklenecek global yüksek skor bu modülün sorumluluğu değildir; ayrı bir
// servis/modül olarak kurulmalı ve fn_meta şemasına alan eklememelidir.
import { store } from './store';
import type { Meta } from '../types/settings';

export function createDefaultMeta(): Meta {
  return { best: 0, totalLines: 0, badges: [] };
}

// DOĞRULANMAMIŞ JSON SINIRI (teknik borç → NS4-06): kayıtlı değer `Meta` kabul edilir. Örneğin
// {"badges": null} gibi bozuk veri olduğu gibi kopyalanır; bu, bilinen NS4-01 #6 / F hatasının
// kaynağıdır ve bu görevde bilerek düzeltilmemiştir.
export const meta: Meta = Object.assign(createDefaultMeta(), store.get('meta', {}));

export function saveMeta(): void {
  store.set('meta', meta);
}
