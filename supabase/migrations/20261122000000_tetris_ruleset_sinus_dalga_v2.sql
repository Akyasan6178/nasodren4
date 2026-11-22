-- =====================================================================
-- tetris: kural seti sinus-dalga-v2 (NS4-47: bölüm hedefi oda grileri + sinüzit atağı hücreleri; kalan renkli
-- bloklar geçişte puansız temizlenir; bölüm saati ilk adım 45 sn, sonra her 60 sn; docs/NS4-47-TAM-TEMIZLIK.md). Önceki:
-- 20261112000000_tetris_ruleset_sinus_dalga.sql.
-- Veri silmez: sinus-dalga-v1 ve daha eski satırlar tabloda kalır, yalnızca okuma RPC'sinin varsayılan kural seti
-- değişir. İstemci kural setini her istekte açıkça gönderir; Edge Function (tetris-submit-score) yalnızca güncel kural
-- setini (supabase/functions/_shared/scoreRules.ts RULESET) kabul eder ve yeniden yayınlanmalıdır.
-- Tablo kısıtı kural seti adını yalnızca biçimle denetler; değişiklik gerekmez.
--
-- Geri alma (rollback): aynı fonksiyonu ruleset_name default 'sinus-dalga-v1' ile yeniden oluşturun.
-- =====================================================================

create or replace function public.tetris_get_leaderboard(
  limit_count integer default 10,
  ruleset_name text default 'sinus-dalga-v2'
)
returns table (id bigint, rank bigint, name text, score integer, lines integer, level smallint)
language sql
stable
security definer
set search_path = ''
as $$
  select s.id, row_number() over (order by s.score desc, s.id asc) as rank, s.name, s.score, s.lines, s.level
  from public.tetris_scores s
  where s.ruleset = ruleset_name
  order by s.score desc, s.id asc
  limit least(greatest(coalesce(limit_count, 10), 1), 10);
$$;
revoke all on function public.tetris_get_leaderboard(integer, text) from public, anon, authenticated;
grant execute on function public.tetris_get_leaderboard(integer, text) to anon, authenticated, service_role;
