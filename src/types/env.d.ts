// NS4-18: Vite ortam değişkenleri (yalnızca VITE_ önekliler pakete girer). Ayrıntı: .env.example
interface ImportMetaEnv {
  /** Supabase proje URL'si (https://<ref>.supabase.co). Boşsa global skor çevrimdışıdır. */
  readonly VITE_SUPABASE_URL?: string;
  /** Publishable anahtar (sb_publishable_…) veya eski anon anahtar. Service role ASLA buraya yazılmaz. */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}
