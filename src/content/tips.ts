/* =====================================================================
   İÇERİK: sağlık ipuçları (başlık, metin)
   NS4-03: main.ts'ten birebir taşındı. NS4-19: metinler tipli sağlık içerik
   kaydına (content/health.ts) taşındı; sıra ve metin birebir aynıdır.
   İçerik değişiklikleri ayrı bir editoryal/tıbbi onay sürecine tabidir.
   ===================================================================== */
import type { HealthTip } from '../types/content';
import { HEALTH_TIPS } from './health';

export const TIPS: readonly HealthTip[] = HEALTH_TIPS.map((t) => [t.title, t.text] as const);
