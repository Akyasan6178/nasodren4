/* =====================================================================
   ANALYTICS (stub: yalnızca mevcut dataLayer'a bırakır)
   Olay adları 'fn_' önekiyle gönderilir.
   NS4-19:
   - Üçüncü taraf script, çerez veya localStorage kaydı yoktur. Sayfada bir
     dataLayer dizisi varsa (sayfayı yerleştiren taraf sağlar) olaylar oraya
     itilir; yoksa production'da hiçbir şey yapılmaz. Console'a yazma yalnızca
     development'tadır (console.debug).
   - Oturum kimliği (sid) bellekte, Math.random ile üretilir: kriptografik
     değildir, saklanmaz, yenilemede değişir; cihaz parmak izi değildir.
   - Gerçek bir analitik etiketi eklendiğinde consent/CMP gerekir
     (docs/NS4-19-ANALYTICS-EVENTS.md).
   ===================================================================== */
import type { AnalyticsEvent, AnalyticsPayloads, AnalyticsRecord } from '../types/analytics';

export interface TrackerOptions {
  /** development modu (console.debug fallback'i yalnızca burada). */
  readonly dev: boolean;
  /** Sayfadaki dataLayer (yoksa undefined). */
  readonly layer: () => unknown;
  readonly now?: () => number;
  readonly log?: (...a: unknown[]) => void;
  readonly sid?: string;
}
export interface Tracker {
  readonly sid: string;
  track<K extends AnalyticsEvent>(name: K, data: AnalyticsPayloads[K]): void;
}

/** Kısa, kriptografik olmayan oturum kimliği (yalnızca bellekte). */
export function newSessionId(): string {
  return Math.random().toString(36).slice(2, 10).padEnd(8, '0');
}

export function createTracker(opts: TrackerOptions): Tracker {
  const sid = opts.sid ?? newSessionId();
  const now = opts.now ?? Date.now;
  let seq = 0;
  return {
    sid,
    track<K extends AnalyticsEvent>(name: K, data: AnalyticsPayloads[K]) {
      const ev: AnalyticsRecord<K> = Object.assign({ event: `fn_${name}` as const, t: now(), sid, seq: ++seq }, data);
      const layer = opts.layer();
      if (Array.isArray(layer)) layer.push(ev);
      else if (opts.dev) (opts.log ?? ((...a: unknown[]) => console.debug(...a)))('[track]', ev);
    },
  };
}

const defaultTracker = createTracker({
  dev: import.meta.env.DEV,
  layer: () => (typeof window === 'undefined' ? undefined : window.dataLayer),
});

export function track<K extends AnalyticsEvent>(name: K, data: AnalyticsPayloads[K]): void {
  defaultTracker.track(name, data);
}
