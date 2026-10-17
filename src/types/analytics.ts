// Analitik olay adları (gönderimde 'fn_' öneki eklenir) ve CTA yerleşimleri.
// Bu değerler raporlama sözleşmesinin parçasıdır; değiştirilmemelidir.
export type AnalyticsEvent = 'game_start' | 'powerup_use' | 'level_up' | 'badge' | 'game_over' | 'cta_click';

/** utm_content değeri olarak kullanılır. */
export type CtaPlacement = 'game_over' | 'pause_menu';
