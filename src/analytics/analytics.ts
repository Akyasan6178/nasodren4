/* =====================================================================
   ANALYTICS (stub: dataLayer varsa oraya, yoksa console.debug)
   Olay adları 'fn_' önekiyle gönderilir. console.debug fallback'i bilinçlidir
   (gerçek servis/consent bu aşamada yoktur).
   ===================================================================== */
import type { AnalyticsEvent, AnalyticsPayloads, AnalyticsRecord } from '../types/analytics';

export function track<K extends AnalyticsEvent>(name: K, data: AnalyticsPayloads[K]): void {
  const ev: AnalyticsRecord<K> = Object.assign({ event: `fn_${name}` as const, t: Date.now() }, data);
  if (Array.isArray(window.dataLayer)) window.dataLayer.push(ev);
  else if (window.console && console.debug) console.debug('[track]', ev);
}
