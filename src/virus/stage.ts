/* =====================================================================
   NS4-44 ek · VİRÜS AVI sahnesi: laboratuvar beheri çerçevesi, tahtanın
   üstündeki damlalık ve tahtanın yanındaki Doktor Elif.
   - Her yeni kapsülde damlalık kısa süre sıkışır, Elif "bas" pozuna geçer.
   - Bölüm temizlenince Elif alkışlar, son 15 saniyede telaşlanır.
   - Öğretici açıkken yan Elif gizlidir (kartta zaten görünür).
   Hepsi DOM'da (#under / #over-hud); Pixi tahtası değişmez.
   ===================================================================== */
import { $, place } from '../ui/dom';
import type { Layout, Rect } from '../types/layout';
import { NARRATOR, type ElifPose } from './elif';
import type { VirusState } from './VirusGame';

/** Kapsül bırakma pozu ve damlalık sıkışması süresi (ms). */
export const PRESS_MS = 300;
export const SQUEEZE_MS = 220;

export interface SideElifInput {
  readonly tutorial: boolean;
  readonly state: VirusState;
  readonly warn: boolean;
  readonly sinceSpawnMs: number;
}

/** Yan Elif'in pozu (öğretici açıkken null: gizli). */
export function sideElifPose(i: SideElifInput): ElifPose | null {
  if (i.tutorial) return null;
  if (i.state === 'levelclear') return 'alkis';
  if (i.sinceSpawnMs < PRESS_MS) return 'goster';
  if (i.warn) return 'oops';
  return 'bekle';
}

/** Yatayda sağ sütunda kartın altı (Duraklat'ın üstüne kadar); portrede alt şeritte solda. */
export function elifSideRect(L: Layout): Rect {
  if (L.portrait) {
    const h = L.btnPause.h + 18;
    return { x: 8, y: L.btnPause.y + L.btnPause.h - h + 4, w: Math.round(h * 0.84), h };
  }
  const y = L.cong.y + L.cong.h + 12;
  return { x: L.next.x, y, w: L.next.w, h: Math.max(40, L.btnPause.y - 12 - y) };
}

/** Beher: tahtanın çevresinde cam duvar, sol üstte ağız çıkıntısı, sağda ölçü çizgileri (px ölçülü SVG). */
function beakerSvg(w: number, h: number, m: number, cell: number): string {
  const r = Math.min(w, h) * 0.12;
  const x0 = m,
    x1 = w - m,
    y0 = m * 0.4,
    y1 = h - m * 0.5;
  const lip = m * 1.1;
  const wall =
    `M${x0 - lip} ${y0 - m * 0.2}` +
    `Q${x0} ${y0} ${x0} ${y0 + m}` +
    `L${x0} ${y1 - r}Q${x0} ${y1} ${x0 + r} ${y1}` +
    `L${x1 - r} ${y1}Q${x1} ${y1} ${x1} ${y1 - r}` +
    `L${x1} ${y0 + m * 0.4}Q${x1} ${y0} ${x1 + m * 0.5} ${y0 - m * 0.1}`;
  const marks: string[] = [];
  for (let k = 2; k < 20; k += 2) {
    const y = y0 + m + (k * (y1 - y0 - m)) / 20;
    const len = k % 4 === 0 ? cell * 0.9 : cell * 0.5;
    marks.push(`<line class="bk-mark" x1="${x1 - 4}" y1="${y}" x2="${x1 - 4 - len}" y2="${y}"/>`);
  }
  const shine = `M${x0 + m * 0.5} ${y0 + m * 2.2}L${x0 + m * 0.5} ${y1 - r * 1.4}`;
  return (
    `<svg viewBox="0 0 ${w} ${h}" focusable="false">` +
    `<path class="bk-edge" d="${wall}"/><path class="bk-glass" d="${wall}"/>` +
    marks.join('') +
    `<path class="bk-shine" d="${shine}"/></svg>`
  );
}

export interface VirusStage {
  layout(L: Layout): void;
  /** Her kare (Virüs Avı açıkken): yan Elif pozu ve telaş. */
  sync(i: Omit<SideElifInput, 'sinceSpawnMs'>): void;
  /** Yeni kapsül doğdu: damlalık sıkışır, Elif basar. */
  onSpawn(): void;
}

export function createVirusStage(): VirusStage {
  let spawnAt = -Infinity;
  let pose: ElifPose | null | undefined;
  let squeeze: ReturnType<typeof setTimeout> | undefined;
  return {
    layout(L) {
      const m = Math.round(L.cell * 0.55);
      const r = { x: L.board.x - m, y: L.board.y - m * 0.6, w: L.board.w + m * 2, h: L.board.h + m * 1.2 };
      const bk = $('virus-beaker');
      place(bk, r);
      bk.innerHTML = beakerSvg(r.w, r.h, m, L.cell);
      const dw = Math.round(L.cell * 1.3),
        dh = Math.round(dw * 1.5);
      place($('virus-dropper'), {
        x: L.board.x + L.board.w / 2 - dw / 2,
        y: Math.max(0, L.board.y - dh * 0.55),
        w: dw,
        h: dh,
      });
      place($('virus-elif-side'), elifSideRect(L));
    },
    sync(i) {
      const el = $('virus-elif-side');
      const p = sideElifPose({ ...i, sinceSpawnMs: Date.now() - spawnAt });
      el.hidden = p === null;
      el.classList.toggle('is-panic', p === 'oops');
      if (p === null || p === pose) return;
      pose = p;
      el.dataset['pose'] = p;
      el.innerHTML = NARRATOR.svg(p);
    },
    onSpawn() {
      spawnAt = Date.now();
      const d = $('virus-dropper');
      d.classList.add('is-squeeze');
      clearTimeout(squeeze);
      squeeze = setTimeout(() => d.classList.remove('is-squeeze'), SQUEEZE_MS);
    },
  };
}
