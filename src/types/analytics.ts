// Analitik olay adları, payload'ları ve CTA yerleşimleri. Gönderimde olay adına 'fn_' öneki eklenir.
// Bu değerler raporlama sözleşmesinin parçasıdır; alan eklenmemeli, çıkarılmamalı, adı değiştirilmemelidir.
// NS4-09: mevcut olaylar değişmedi (game_start/game_over yalnızca serbest oyunda gönderilir). Sinüs haritası
// bölümleri için stage_* olayları, bilgi kartları için card_* olayları ve 'stage_complete' CTA yerleşimi eklendi.
import type { BadgeId, CardId } from './content';
import type { GameOverReason } from './game';

/** utm_content değeri olarak kullanılır. */
export type CtaPlacement = 'game_over' | 'pause_menu' | 'stage_complete';

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
  cta_click:
    | { placement: 'game_over'; score: number }
    | { placement: 'pause_menu' }
    | { placement: 'stage_complete'; stage: number };
  /** Bölüm numarası 1'den başlar (sinüs haritası sırası). */
  stage_start: { stage: number; attempt: number };
  stage_complete: { stage: number; stars: number; pieces: number; score: number; dur_s: number };
  stage_fail: { stage: number; reason: GameOverReason; pieces: number; progress: number; dur_s: number };
  card_unlock: { id: CardId };
  card_view: { id: CardId };
}

export type AnalyticsEvent = keyof AnalyticsPayloads;

/** dataLayer'a gönderilen / console.debug'a yazılan kayıt. */
export type AnalyticsRecord<K extends AnalyticsEvent = AnalyticsEvent> = {
  event: `fn_${K}`;
  t: number;
} & AnalyticsPayloads[K];
