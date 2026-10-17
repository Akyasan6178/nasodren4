/* =====================================================================
   ANALYTICS (stub: dataLayer varsa oraya, yoksa console.debug)
   NS4-03: main.ts'ten taşındı. Olay adları 'fn_' önekiyle gönderilir.
   ===================================================================== */
import type { AnalyticsEvent } from '../types/analytics';

export function track(name: AnalyticsEvent, data?: Record<string, unknown>) {
  const ev = Object.assign({ event: 'fn_' + name, t: Date.now() }, data || {});
  if (Array.isArray(window.dataLayer)) window.dataLayer.push(ev);
  else if (window.console && console.debug) console.debug('[track]', ev);
}
