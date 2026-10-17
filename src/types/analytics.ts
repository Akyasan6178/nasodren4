// Analitik olay adları, payload'ları ve CTA yerleşimleri. Gönderimde olay adına 'fn_' öneki eklenir.
// Bu değerler raporlama sözleşmesinin parçasıdır; alan eklenmemeli, çıkarılmamalı, adı değiştirilmemelidir.
import type { BadgeId } from './content';
import type { GameOverReason } from './game';

/** utm_content değeri olarak kullanılır. */
export type CtaPlacement = 'game_over' | 'pause_menu';

export interface AnalyticsPayloads {
  game_start: { best: number };
  powerup_use:
    { kind: 'siklamen'; level: number; congestion: number } | { kind: 'sentetik'; uses: number; level: number };
  level_up: { level: number };
  badge: { id: BadgeId };
  game_over: {
    reason: GameOverReason;
    score: number;
    level: number;
    lines: number;
    dur_s: number;
    cyc_used: boolean;
    syn_uses: number;
    tetrises: number;
  };
  cta_click: { placement: 'game_over'; score: number } | { placement: 'pause_menu' };
}

export type AnalyticsEvent = keyof AnalyticsPayloads;

/** dataLayer'a gönderilen / console.debug'a yazılan kayıt. */
export type AnalyticsRecord<K extends AnalyticsEvent = AnalyticsEvent> = {
  event: `fn_${K}`;
  t: number;
} & AnalyticsPayloads[K];
