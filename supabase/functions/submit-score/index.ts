/* =====================================================================
   NS4-18: submit-score Edge Function giriş noktası (Deno / Supabase).
   Secret'lar yalnızca function ortamındadır:
   - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: Supabase tarafından otomatik verilir.
   - SCORE_HASH_PEPPER: `supabase secrets set` ile verilir (oyun kimliği ve hız sınırı özetleri için tuz).
   - ALLOWED_ORIGINS (isteğe bağlı): virgülle ayrılmış izinli origin listesi.
   Service role anahtarı tarayıcıya hiçbir zaman gönderilmez; yanıtlarda yer almaz.
   Kurulum: docs/NS4-18-SUPABASE-SETUP.md
   ===================================================================== */
import { handleSubmit, memoryRateLimiter, type InsertResult, type ScoreRow } from './handler.ts';

declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (req: Request) => Response | Promise<Response>): unknown;
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const limiter = memoryRateLimiter();

/** Tek satır INSERT (PostgREST, service role). 409 = benzersiz game_hash ihlali (aynı oyun ikinci kez). */
async function insert(row: ScoreRow): Promise<InsertResult> {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return 'error';
  const res = await fetch(`${SUPABASE_URL}/rest/v1/leaderboard_scores`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(row),
  });
  if (res.status === 201 || res.status === 204) return 'ok';
  if (res.status === 409) return 'duplicate';
  return 'error';
}

Deno.serve((req) => handleSubmit(req, { env: (k) => Deno.env.get(k), insert, limiter }));
