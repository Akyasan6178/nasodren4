/* =====================================================================
   NS4-18: global skor yapılandırması (Vite ortam değişkenleri).
   Tarayıcıya yalnızca public proje URL'si ve publishable/anon anahtar
   girer. Değerler eksik veya geçersizse global skor kontrollü biçimde
   devre dışıdır (oyun ve yerel tablo etkilenmez).
   ===================================================================== */

export interface LeaderboardConfig {
  /** https://<ref>.supabase.co (sonunda / yok). */
  readonly url: string;
  readonly key: string;
}

/** Edge Function adı (supabase/functions/submit-score). */
export const SUBMIT_FUNCTION = 'submit-score';
/** Okuma RPC'si (supabase/migrations: public.get_leaderboard). */
export const READ_RPC = 'get_leaderboard';
export const CLIENT_VERSION = 'web-ns4-18';

/** Service role / secret anahtar biçimleri: yanlışlıkla verilirse yapılandırma reddedilir. */
function looksSecret(key: string): boolean {
  if (key.startsWith('sb_secret_')) return true;
  const parts = key.split('.');
  if (parts.length !== 3) return false;
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))) as { role?: unknown };
    return payload.role === 'service_role';
  } catch {
    return false;
  }
}

/** Ortamdan yapılandırma; eksik/geçersizse null (global devre dışı). */
export function leaderboardConfigFrom(env: {
  readonly VITE_SUPABASE_URL?: string | undefined;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string | undefined;
}): LeaderboardConfig | null {
  const rawUrl = (env.VITE_SUPABASE_URL ?? '').trim();
  const key = (env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '').trim();
  if (!rawUrl || !key || looksSecret(key)) return null;
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    return null;
  }
  const local = u.hostname === 'localhost' || u.hostname === '127.0.0.1';
  if (u.protocol !== 'https:' && !(local && u.protocol === 'http:')) return null;
  return { url: u.origin, key };
}

export const leaderboardConfig: LeaderboardConfig | null = leaderboardConfigFrom(import.meta.env);
