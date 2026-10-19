// NS4-18: SQL migration, function yapılandırması ve secret hijyeni için statik sözleşme testleri.
import { describe, expect, it } from 'vitest';
import sql from '../../supabase/migrations/20261018000000_ns4_18_leaderboard.sql?raw';
import toml from '../../supabase/config.toml?raw';
import envExample from '../../.env.example?raw';
import gitignore from '../../.gitignore?raw';
import indexTs from '../../supabase/functions/submit-score/index.ts?raw';

const sources = import.meta.glob<string>('../../src/**/*.ts', { query: '?raw', import: 'default', eager: true });
const code = sql.replace(/--.*$/gm, ''); // yorumlar hariç

describe('migration: tablo, kısıtlar, index', () => {
  it('gerekli sütunlar ve tekrar gönderimi engelleyen benzersiz özet', () => {
    for (const col of [
      'id',
      'nickname',
      'score',
      'lines',
      'level',
      'duration_seconds',
      'game_hash',
      'client_version',
      'created_at',
    ])
      expect(code).toMatch(new RegExp(`\\n\\s+${col}\\s`));
    expect(code).toMatch(/unique \(game_hash\)/);
    expect(code).toMatch(/game_hash ~ '\^\[0-9a-f\]\{64\}\$'/);
  });
  it('kişisel veri sütunu yok (IP, user-agent, e-posta, hesap)', () => {
    expect(code).not.toMatch(/\b(ip|ip_address|user_agent|email|user_id|auth\.)/i);
  });
  it('istemci ve function sınırlarıyla aynı kısıtlar', () => {
    expect(code).toMatch(/char_length\(nickname\) between 3 and 16/);
    expect(code).toMatch(/score between 0 and 10000000/);
    expect(code).toMatch(/lines between 0 and 5000/);
    expect(code).toMatch(/level between 1 and 20/);
    expect(code).toMatch(/level = least\(20, 1 \+ lines \/ 10\)/);
    expect(code).toMatch(/duration_seconds between 1 and 21600/);
  });
  it('skor azalan sıralama indexi (eşitlikte önce ulaşan)', () => {
    expect(code).toMatch(
      /create index if not exists leaderboard_scores_rank_idx\s+on public\.leaderboard_scores \(score desc, created_at asc, id asc\)/,
    );
  });
});

describe('migration: RLS ve yetkiler', () => {
  it('RLS etkin ve zorunlu; hiçbir politika yok (istemci doğrudan okuyamaz/yazamaz)', () => {
    expect(code).toMatch(/alter table public\.leaderboard_scores enable row level security;/);
    expect(code).toMatch(/alter table public\.leaderboard_scores force row level security;/);
    expect(code).not.toMatch(/create policy/i);
  });
  it('anon/authenticated tablo yetkileri geri alınır; yazma yalnızca service_role', () => {
    expect(code).toMatch(/revoke all on table public\.leaderboard_scores from public, anon, authenticated;/);
    expect(code).toMatch(/grant select, insert on table public\.leaderboard_scores to service_role;/);
    expect(code).not.toMatch(/grant [^;]*(insert|update|delete)[^;]* to [^;]*(anon|authenticated)/i);
  });
  it('okuma yalnızca get_leaderboard: güvenli arama yolu, yalnızca gerekli alanlar, üst sınır', () => {
    expect(code).toMatch(/create or replace function public\.get_leaderboard\(limit_count integer default 10\)/);
    expect(code).toMatch(/returns table \(rank bigint, nickname text, score integer, lines integer, level smallint\)/);
    expect(code).toMatch(/security definer\s+set search_path = ''/);
    expect(code).toMatch(/limit least\(greatest\(coalesce\(limit_count, 10\), 1\), 50\)/);
    const fn = /as \$\$([\s\S]*?)\$\$/.exec(code)?.[1] ?? '';
    expect(fn).not.toMatch(/game_hash|duration_seconds|client_version|s\.id,|s\.created_at,/);
    expect(code).toMatch(/revoke all on function public\.get_leaderboard\(integer\) from public;/);
    expect(code).toMatch(
      /grant execute on function public\.get_leaderboard\(integer\) to anon, authenticated, service_role;/,
    );
  });
  it('rollback notu ve kurulum açıklaması var', () => {
    expect(sql).toMatch(/Geri alma \(rollback\)/);
    expect(sql).toMatch(/drop table if exists public\.leaderboard_scores;/);
    expect(sql).toMatch(/drop function if exists public\.get_leaderboard\(integer\);/);
    expect(sql).toMatch(/supabase db push/);
    expect(sql).toMatch(/supabase functions deploy submit-score/);
  });
});

describe('function yapılandırması ve secret hijyeni', () => {
  it('submit-score kendi doğrulamasını yapar (verify_jwt=false); service role yalnızca function ortamından', () => {
    expect(toml).toMatch(/\[functions\.submit-score\]\s+(#.*\n)*verify_jwt = false/);
    expect(indexTs).toMatch(/Deno\.env\.get\('SUPABASE_SERVICE_ROLE_KEY'\)/);
    expect(indexTs).toMatch(/\/rest\/v1\/leaderboard_scores/);
  });
  it('.env.example yalnızca public VITE_ değişkenleri, boş değerlerle; .env dosyaları yok sayılır', () => {
    const vars = [...envExample.matchAll(/^([A-Z_]+)=(.*)$/gm)].map((m) => [m[1], m[2]]);
    expect(vars).toEqual([
      ['VITE_SUPABASE_URL', ''],
      ['VITE_SUPABASE_PUBLISHABLE_KEY', ''],
    ]);
    expect(gitignore).toMatch(/^\.env$/m);
    expect(gitignore).toMatch(/^\.env\.\*$/m);
    expect(gitignore).toMatch(/^!\.env\.example$/m);
  });
  it('frontend kaynağında service role, secret anahtar veya tabloya doğrudan yazma yok', () => {
    for (const [file, src] of Object.entries(sources)) {
      expect(src, file).not.toMatch(/SERVICE_ROLE|sb_secret_[A-Za-z0-9]|eyJ[A-Za-z0-9_-]{20,}/);
      expect(src, file).not.toMatch(/rest\/v1\/leaderboard_scores/);
    }
    expect(sources['../../src/leaderboard/globalClient.ts']).toMatch(/functions\/v1\/\$\{SUBMIT_FUNCTION\}/);
  });
});
