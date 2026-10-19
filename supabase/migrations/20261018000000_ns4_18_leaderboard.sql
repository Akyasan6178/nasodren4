-- =====================================================================
-- NS4-18: global yüksek skor tablosu (Ferah Nefes · Sinüs Bulmacası)
--
-- Kurulum (ayrıntı: docs/NS4-18-SUPABASE-SETUP.md):
--   supabase link --project-ref <PROJE_REF>
--   supabase db push            # bu migration'ı uygular
--   supabase secrets set SCORE_HASH_PEPPER=<uzun-rastgele-değer>
--   supabase functions deploy submit-score   # verify_jwt=false: supabase/config.toml
--
-- Güvenlik modeli:
--   * RLS etkin ve zorunlu; hiçbir politika yok → anon/authenticated tabloya doğrudan
--     SELECT/INSERT/UPDATE/DELETE yapamaz. Tablo yetkileri de ayrıca geri alınır.
--   * Okuma yalnızca public.get_leaderboard(limit_count) ile: sıra, takma ad, skor, drenaj,
--     seviye döner (id, oyun özeti, süre, sürüm, zaman dönmez).
--   * Yazma yalnızca submit-score Edge Function üzerinden (service role, sunucu tarafı).
--   * Kişisel veri yok: IP, user-agent, e-posta, hesap saklanmaz. game_hash, istemcinin oyun başına
--     ürettiği rastgele UUID'nin tuzlu SHA-256 özetidir (tekrar gönderimi engeller).
--
-- Geri alma (rollback) — bütün global skor verisini siler:
--   drop function if exists public.get_leaderboard(integer);
--   drop table if exists public.leaderboard_scores;
-- =====================================================================

create table if not exists public.leaderboard_scores (
  id               bigint generated always as identity primary key,
  nickname         text        not null,
  score            integer     not null,
  lines            integer     not null,
  level            smallint    not null,
  duration_seconds integer     not null,
  game_hash        text        not null,
  client_version   text        not null default '',
  created_at       timestamptz not null default now(),

  -- istemci + Edge Function doğrulamasının veritabanı tarafındaki karşılığı (savunma katmanı)
  constraint leaderboard_scores_game_hash_key unique (game_hash),
  constraint leaderboard_scores_game_hash_chk check (game_hash ~ '^[0-9a-f]{64}$'),
  constraint leaderboard_scores_nickname_len check (char_length(nickname) between 3 and 16),
  constraint leaderboard_scores_nickname_chars check (
    nickname = btrim(nickname)
    and nickname !~ '[[:cntrl:]<>&"''`/\\]'
    and nickname !~ '  '
  ),
  constraint leaderboard_scores_score_rng check (score between 0 and 10000000),
  constraint leaderboard_scores_lines_rng check (lines between 0 and 5000),
  constraint leaderboard_scores_level_rng check (level between 1 and 20),
  -- seviye satırdan belirlenir (oyun kuralı): least(20, 1 + lines / 10)
  constraint leaderboard_scores_level_lines check (level = least(20, 1 + lines / 10)),
  constraint leaderboard_scores_duration_rng check (duration_seconds between 1 and 21600),
  constraint leaderboard_scores_client_version_len check (char_length(client_version) <= 32)
);

comment on table public.leaderboard_scores is
  'NS4-18 global skorlar. Yazma yalnızca submit-score Edge Function (service role). Okuma: get_leaderboard().';

-- sıralama: skor azalan; eşitlikte önce ulaşan (created_at artan), sonra id
create index if not exists leaderboard_scores_rank_idx
  on public.leaderboard_scores (score desc, created_at asc, id asc);

alter table public.leaderboard_scores enable row level security;
alter table public.leaderboard_scores force row level security;
-- politika bilerek yok: anon/authenticated için tablo erişimi kapalı

revoke all on table public.leaderboard_scores from public, anon, authenticated;
grant select, insert on table public.leaderboard_scores to service_role;

-- Güvenli okuma: yalnızca gerekli alanlar, en çok 50 satır
create or replace function public.get_leaderboard(limit_count integer default 10)
returns table (rank bigint, nickname text, score integer, lines integer, level smallint)
language sql
stable
security definer
set search_path = ''
as $$
  select row_number() over (order by s.score desc, s.created_at asc, s.id asc) as rank,
         s.nickname, s.score, s.lines, s.level
  from public.leaderboard_scores as s
  order by s.score desc, s.created_at asc, s.id asc
  limit least(greatest(coalesce(limit_count, 10), 1), 50);
$$;

comment on function public.get_leaderboard(integer) is
  'NS4-18 global ilk N (varsayılan 10, en çok 50): rank, nickname, score, lines, level.';

revoke all on function public.get_leaderboard(integer) from public;
grant execute on function public.get_leaderboard(integer) to anon, authenticated, service_role;
