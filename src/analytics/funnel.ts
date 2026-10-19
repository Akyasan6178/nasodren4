/* =====================================================================
   NS4-19: arayüz tıklamalarından huni olayları (CTA, Tekrar oyna, Skorlar).
   Dinleyiciler yalnızca olay kaydeder: preventDefault yok, gezinme ve
   mevcut davranış etkilenmez. Tekrar oyna dinleyicisi lifecycle.start'tan
   önce bağlanır (sıra: replay_clicked → game_start).
   ===================================================================== */
import { $ } from '../ui/dom';
import { track } from './analytics';
import type { AppState } from '../types/app';

export interface FunnelDeps {
  readonly getState: () => AppState;
  readonly getScore: () => number;
  readonly getLevel: () => number;
}

export function bindUiAnalytics({ getState, getScore, getLevel }: FunnelDeps): void {
  $('cta-over').addEventListener('click', () =>
    track('cta_click', { placement: 'game_over', score: getScore(), state: getState() }),
  );
  $('cta-pause').addEventListener('click', () =>
    track('cta_click', { placement: 'pause_menu', level: getLevel(), state: getState() }),
  );
  $('b-again').addEventListener('click', () => track('replay_clicked', {}));
  $('b-scores').addEventListener('click', () => track('leaderboard_opened', {}));
}
