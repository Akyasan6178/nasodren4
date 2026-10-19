/* =====================================================================
   NS4-15: işletim sistemi "hareketi azalt" tercihi. CSS tarafı
   @media (prefers-reduced-motion: reduce) ile çalışır; Pixi efektleri için
   aynı tercih burada okunur ve değişince yeniden uygulanır. Tema/renk şeması
   sorgusu yoktur (tek tema, NS4-08).
   ===================================================================== */
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/** Tercihi hemen `apply` ile bildirir ve değiştikçe yeniden çağırır. matchMedia yoksa tam hareket varsayılır. */
export function watchReducedMotion(
  apply: (reduced: boolean) => void,
  win: Partial<Pick<Window, 'matchMedia'>> = window,
): void {
  if (typeof win.matchMedia !== 'function') {
    apply(false);
    return;
  }
  const mq = win.matchMedia(REDUCED_MOTION_QUERY);
  apply(mq.matches);
  mq.addEventListener('change', (e) => apply(e.matches));
}
