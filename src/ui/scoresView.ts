/* =====================================================================
   NS4-18: Skorlar ekranı (Yerel / Global sekmeleri).
   - Sekmeler: WAI-ARIA tablist (ok tuşları, Home/End; seçili sekme Tab
     sırasında, diğeri tabindex=-1).
   - Tablolar: <table> + başlık hücreleri (ekran okuyucu satır/sütun okur).
     Kullanıcı verisi yalnızca textContent ile yazılır (HTML yok).
   - Global: ekran açılıp Global sekmesi seçilince bir kez ve kullanıcı
     "Yenile"/"Tekrar dene" dediğinde yüklenir. Polling/realtime yoktur.
   ===================================================================== */
import { $ } from './dom';
import { fmt } from './hud';
import { track } from '../analytics/analytics';
import type { LeaderboardClient, GlobalEntry, FetchResult } from '../leaderboard/globalClient';
import type { LocalScore } from '../leaderboard/localScores';

export type ScoresTab = 'local' | 'global';
interface Row {
  readonly rank: number;
  readonly nickname: string;
  readonly score: number;
  readonly lines: number;
}

export const GLOBAL_TEXT = {
  loading: 'Yükleniyor…',
  empty: 'Henüz skor yok',
  disabled: 'Global tablo çevrimdışı',
  offline: 'Global tablo çevrimdışı',
  failed: 'Global tablo yüklenemedi',
} as const;
/** Takma adı olmayan yerel kayıt. */
export const NO_NICKNAME = '—';

export interface ScoresViewDeps {
  readonly client: LeaderboardClient;
  readonly loadLocal: () => LocalScore[];
}

export interface ScoresView {
  /** Ekran açılırken çağrılır: yerel tablo yenilenir, Yerel sekmesi seçilir (Global ilk seçilişte yüklenir). */
  open(): void;
  select(tab: ScoresTab, focus?: boolean): void;
  loadGlobal(): Promise<void>;
  readonly selected: () => ScoresTab;
}

function fillTable(table: HTMLElement, rows: readonly Row[]): void {
  const body = table.querySelector('tbody');
  if (!body) return;
  body.replaceChildren();
  for (const r of rows) {
    const tr = document.createElement('tr');
    const cells: [string, string][] = [
      ['rank', String(r.rank)],
      ['nick', r.nickname || NO_NICKNAME],
      ['score', fmt(r.score)],
      ['lines', String(r.lines)],
    ];
    for (const [cls, text] of cells) {
      const td = document.createElement(cls === 'rank' ? 'th' : 'td');
      if (cls === 'rank') td.setAttribute('scope', 'row');
      td.className = cls;
      td.textContent = text;
      tr.appendChild(td);
    }
    body.appendChild(tr);
  }
}

export function createScoresView({ client, loadLocal }: ScoresViewDeps): ScoresView {
  let current: ScoresTab = 'local';
  let globalLoadedThisOpen = false;
  let token = 0;
  const tabs: Record<ScoresTab, HTMLElement> = { local: $('tab-local'), global: $('tab-global') };
  const panels: Record<ScoresTab, HTMLElement> = { local: $('panel-local'), global: $('panel-global') };
  const status = $('global-status');
  const retry = $('b-global-retry', HTMLButtonElement);
  const refresh = $('b-global-refresh', HTMLButtonElement);
  const gTable = $('table-global');

  function renderLocal(): void {
    const rows = loadLocal().map((e, i) => ({ rank: i + 1, nickname: e.nickname, score: e.score, lines: e.lines }));
    fillTable($('table-local'), rows);
    $('table-local').hidden = rows.length === 0;
    $('local-empty').hidden = rows.length > 0;
  }

  function renderGlobal(r: FetchResult | 'loading'): void {
    const loading = r === 'loading';
    panels.global.setAttribute('aria-busy', String(loading));
    if (loading) {
      status.textContent = GLOBAL_TEXT.loading;
      status.hidden = false;
      retry.hidden = true;
      refresh.hidden = true;
      return;
    }
    if (r.ok) {
      const rows = r.entries.map((e: GlobalEntry) => ({ ...e }));
      fillTable(gTable, rows);
      gTable.hidden = rows.length === 0;
      status.textContent = rows.length === 0 ? GLOBAL_TEXT.empty : '';
      status.hidden = rows.length > 0;
      retry.hidden = true;
      refresh.hidden = false;
      return;
    }
    gTable.hidden = true;
    status.hidden = false;
    status.textContent =
      r.reason === 'disabled'
        ? GLOBAL_TEXT.disabled
        : r.reason === 'offline'
          ? GLOBAL_TEXT.offline
          : GLOBAL_TEXT.failed;
    retry.hidden = r.reason === 'disabled'; // yapılandırma yoksa tekrar denemek anlamsız
    refresh.hidden = true;
  }

  async function loadGlobal(): Promise<void> {
    const my = ++token;
    globalLoadedThisOpen = true;
    renderGlobal('loading');
    const r = await client.fetchTop(10);
    if (my !== token) return; // daha yeni bir istek var
    renderGlobal(r);
  }

  /** Kullanıcı sekme değiştirdi (ekran açılışındaki varsayılan seçim sayılmaz). */
  function userSelect(tab: ScoresTab, focus = false): void {
    if (tab !== current) track('leaderboard_tab_changed', { tab });
    select(tab, focus);
  }
  function select(tab: ScoresTab, focus = false): void {
    current = tab;
    for (const t of ['local', 'global'] as const) {
      const on = t === tab;
      tabs[t].setAttribute('aria-selected', String(on));
      tabs[t].tabIndex = on ? 0 : -1;
      panels[t].hidden = !on;
    }
    if (focus) tabs[tab].focus();
    if (tab === 'global' && !globalLoadedThisOpen) void loadGlobal();
  }

  for (const t of ['local', 'global'] as const) {
    tabs[t].addEventListener('click', () => userSelect(t));
    tabs[t].addEventListener('keydown', (e: KeyboardEvent) => {
      const k = e.key;
      if (k === 'ArrowRight' || k === 'ArrowLeft') {
        e.preventDefault();
        userSelect(current === 'local' ? 'global' : 'local', true);
      } else if (k === 'Home' || k === 'End') {
        e.preventDefault();
        userSelect(k === 'Home' ? 'local' : 'global', true);
      }
    });
  }
  retry.addEventListener('click', () => {
    track('leaderboard_refreshed', { action: 'retry' });
    void loadGlobal();
  });
  refresh.addEventListener('click', () => {
    track('leaderboard_refreshed', { action: 'refresh' });
    void loadGlobal();
  });

  return {
    open() {
      globalLoadedThisOpen = false;
      renderLocal();
      select('local'); // ilk odak (data-focus) Yerel sekmesindedir; son oyun yerel listededir
    },
    select,
    loadGlobal,
    selected: () => current,
  };
}
